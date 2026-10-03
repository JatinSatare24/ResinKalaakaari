// The whole decision logic of the function, with the outside world (database,
// Resend, PDF) passed in. index.ts wires the real ones; the tests pass fakes.
//
// Order of work, and why:
//  1. Who is calling?     A shared secret (checked by the database). No secret, no work.
//  2. What do they want?  Only an order id. Nothing else in the body is read.
//  3. What is true?       Re-read the order, its lines and the owner's email from the
//                         database. The request is never the source of facts.
//  4. Send once.          Each email (customer, shop) first "claims" a row in
//                         order_email_log. Double fire / retry = claim fails = no 2nd mail.
import { SHOP } from "./config.ts";
import { shortId } from "./invoice.ts";
import type { Deps, EmailKind, InvoiceInput, OrderRow } from "./types.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Outcome = "sent" | "skipped" | "failed";

function reply(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Customer text goes into HTML emails: escape it so a name like <b> stays text.
export function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );
}

// Reads the order id from the body. Any other field (a "record", an "email",
// anything) is ignored on purpose.
function parseOrderId(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const id = (body as Record<string, unknown>).order_id;
  return typeof id === "string" && UUID.test(id) ? id.toLowerCase() : null;
}

function addressOf(order: OrderRow): string {
  return [order.shipping_address, order.city, order.state, order.pincode]
    .filter(Boolean)
    .join(", ");
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  try {
    if (req.method !== "POST")
      return reply(405, { error: "method_not_allowed" });

    // 1. Authenticate the caller (the secret lives in Vault; the DB compares).
    const secret = req.headers.get("x-webhook-secret");
    if (!secret || !(await deps.db.verifySecret(secret))) {
      return reply(401, { error: "unauthorized" });
    }

    // 2. Validate the payload shape.
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return reply(400, { error: "invalid_json" });
    }
    const orderId = parseOrderId(body);
    if (!orderId) return reply(400, { error: "invalid_order_id" });

    // 3. Re-read the truth.
    const order = await deps.db.getOrder(orderId);
    if (!order) return reply(404, { error: "order_not_found" });

    // The trigger only fires on the move to verifying_payment, so by now an
    // order that is still pending, or has no UTR, means "nothing to send".
    const utr = order.transaction_id;
    if (!utr || !order.status || order.status === "pending") {
      return reply(200, { skipped: "no_payment_proof" });
    }

    const items = await deps.db.getItems(order.id);
    const lines = items.map((i) => ({
      name: i.product_name ?? "Custom Resin Art",
      quantity: i.quantity,
      unitPrice: i.price_at_purchase,
    }));
    const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
    const short = shortId(order.id);
    const name = order.full_name || "Customer";

    // 4a. Customer email (invoice attached).
    const customer = await sendOnce("customer", order, utr, deps, async () => {
      // The address comes from the order owner's account, never from the request.
      const to = order.user_id
        ? await deps.db.getCustomerEmail(order.user_id)
        : null;
      if (!to) throw new Error("no_customer_email");
      const invoice: InvoiceInput = {
        orderId: order.id,
        orderDate: new Date(order.created_at),
        utr,
        customerName: name,
        address: addressOf(order),
        lines,
        shipping: Math.max(0, order.total_price - subtotal),
        total: order.total_price,
      };
      return {
        to,
        subject: `Invoice: Order #${short}`,
        replyTo: SHOP.email,
        html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Thank you for your order!</h2>
          <p>Hi ${esc(name)},</p>
          <p>We've received your payment details (UTR: ${esc(utr)}). The shop owner will verify this and update your order status shortly.</p>
          <p><strong>Your invoice is attached.</strong></p>
          <p>Warm regards,<br/>Team ${esc(SHOP.name)}</p>
        </div>`,
        attachment: {
          filename: `Invoice_RK_${short}.pdf`,
          contentBase64: await deps.buildInvoice(invoice),
        },
      };
    });

    // 4b. Shop alert. Separate row, so one failing does not block the other.
    const shop = await sendOnce("shop", order, utr, deps, async () => ({
      to: SHOP.email,
      subject: `New order submitted: #${short}`,
      html: `
        <div style="font-family: sans-serif;">
          <h3>New payment submission</h3>
          <p><strong>Customer:</strong> ${esc(name)}</p>
          <p><strong>Amount:</strong> INR ${order.total_price}</p>
          <p><strong>UTR:</strong> ${esc(utr)}</p>
          <p><strong>Phone:</strong> ${esc(order.phone)}</p>
          <hr/>
          <p>Open the admin page to verify the payment and update the order.</p>
        </div>`,
    }));

    // 502 when anything failed, so pg_net's response log shows a non-2xx and a
    // human notices. order_email_log holds the reason.
    const failed = customer === "failed" || shop === "failed";
    return reply(failed ? 502 : 200, { customer, shop });
  } catch (err) {
    // Unexpected (database down, ...). Log the detail, tell the caller nothing.
    console.error("send-order-email failed:", err);
    return reply(500, { error: "internal_error" });
  }
}

// Claim -> build -> send -> record. Never throws: a failure becomes a 'failed' row.
async function sendOnce(
  kind: EmailKind,
  order: OrderRow,
  utr: string,
  deps: Deps,
  build: () => Promise<Parameters<Deps["mailer"]["send"]>[0]>,
): Promise<Outcome> {
  if (!(await deps.db.claim(order.id, kind, utr))) return "skipped";

  try {
    const message = await build();
    // Resend also dedupes on this key for 24 h: a second safety net.
    const result = await deps.mailer.send(
      message,
      `${kind}-${order.id}-${utr}`,
    );
    if (result.error) {
      await deps.db.finish(order.id, kind, utr, {
        ok: false,
        error: `resend: ${result.error}`,
      });
      return "failed";
    }
    await deps.db.finish(order.id, kind, utr, {
      ok: true,
      providerId: result.id,
    });
    return "sent";
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await deps.db.finish(order.id, kind, utr, { ok: false, error });
    return "failed";
  }
}
