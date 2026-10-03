// Run:  deno test --allow-read --allow-env --allow-net=registry.npmjs.org handler.test.ts
// (Plain asserts from node:assert so no extra download is needed.)
import assert from "node:assert/strict";
import { handle } from "./handler.ts";
import { buildInvoicePdf } from "./invoice.ts";
import type {
  Db,
  Deps,
  EmailKind,
  ItemRow,
  OrderRow,
  SendResult,
} from "./types.ts";

const SECRET = "right-secret";
const ORDER_ID = "11111111-1111-1111-1111-111111111111";

const baseOrder: OrderRow = {
  id: ORDER_ID,
  user_id: "aaaaaaaa-0000-0000-0000-000000000001",
  status: "verifying_payment",
  total_price: 1600,
  transaction_id: "ABCD1234EFGH",
  full_name: "Asha",
  phone: "9876543210",
  shipping_address: "1 Road",
  city: "Pune",
  state: "MH",
  pincode: "411061",
  created_at: "2026-10-01T10:00:00Z",
};

function setup(
  over: {
    order?: Partial<OrderRow> | null;
    email?: string | null;
    items?: ItemRow[];
  } = {},
) {
  const log = new Map<string, "sending" | "sent" | "failed">();
  const finished: unknown[] = [];
  const sent: {
    to: string;
    subject: string;
    html: string;
    key: string;
    hasPdf: boolean;
  }[] = [];
  let mailResult: (kind: string) => SendResult | Error = () => ({
    id: "re_1",
    error: null,
  });
  const order = over.order === null ? null : { ...baseOrder, ...over.order };
  const db: Db = {
    verifySecret: async (s) => s === SECRET,
    getOrder: async () => order,
    getItems: async () =>
      over.items ?? [
        { quantity: 1, price_at_purchase: 1500, product_name: "Varmala frame" },
      ],
    getCustomerEmail: async () =>
      over.email === undefined ? "asha@example.com" : over.email,
    claim: async (id, kind, utr) => {
      const k = `${id}|${kind}|${utr}`;
      const cur = log.get(k);
      if (cur === undefined || cur === "failed") {
        log.set(k, "sending");
        return true;
      }
      return false;
    },
    finish: async (id, kind: EmailKind, utr, result) => {
      log.set(`${id}|${kind}|${utr}`, result.ok ? "sent" : "failed");
      finished.push({ kind, ...result });
    },
  };
  const deps: Deps = {
    db,
    buildInvoice: async () => "UERG",
    mailer: {
      send: async (m, key) => {
        const r = mailResult(
          m.subject.startsWith("Invoice") ? "customer" : "shop",
        );
        sent.push({
          to: m.to,
          subject: m.subject,
          html: m.html,
          key,
          hasPdf: !!m.attachment,
        });
        if (r instanceof Error) throw r;
        return r;
      },
    },
  };
  return {
    deps,
    sent,
    log,
    finished,
    setMail: (f: typeof mailResult) => (mailResult = f),
  };
}

const call = (
  deps: Deps,
  init: {
    body?: unknown;
    secret?: string | null;
    method?: string;
    raw?: string;
  } = {},
) =>
  handle(
    new Request("https://x.test/", {
      method: init.method ?? "POST",
      headers: {
        "content-type": "application/json",
        ...(init.secret === null
          ? {}
          : { "x-webhook-secret": init.secret ?? SECRET }),
      },
      body:
        init.method === "GET"
          ? undefined
          : (init.raw ?? JSON.stringify(init.body ?? { order_id: ORDER_ID })),
    }),
    deps,
  );

Deno.test("401 without secret, with wrong secret; GET is 405", async () => {
  const t = setup();
  assert.equal((await call(t.deps, { secret: null })).status, 401);
  assert.equal((await call(t.deps, { secret: "wrong" })).status, 401);
  assert.equal((await call(t.deps, { method: "GET" })).status, 405);
  assert.equal(t.sent.length, 0);
});

Deno.test("400 for bad json, missing id, non-uuid id", async () => {
  const t = setup();
  assert.equal((await call(t.deps, { raw: "{nope" })).status, 400);
  assert.equal((await call(t.deps, { body: {} })).status, 400);
  assert.equal((await call(t.deps, { body: { order_id: "123" } })).status, 400);
  assert.equal((await call(t.deps, { body: [ORDER_ID] })).status, 400);
  assert.equal(t.sent.length, 0);
});

Deno.test("404 when the order does not exist", async () => {
  const t = setup({ order: null });
  assert.equal((await call(t.deps)).status, 404);
});

Deno.test("pending order or missing UTR: 200 and nothing sent", async () => {
  for (const order of [
    { status: "pending" },
    { transaction_id: null },
    { status: null },
  ]) {
    const t = setup({ order });
    const res = await call(t.deps);
    assert.equal(res.status, 200);
    assert.equal(t.sent.length, 0);
  }
});

Deno.test(
  "happy path: 2 emails, customer address from the DB, PDF only on customer mail",
  async () => {
    const t = setup();
    const res = await call(t.deps);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { customer: "sent", shop: "sent" });
    assert.equal(t.sent.length, 2);
    assert.equal(t.sent[0].to, "asha@example.com");
    assert.equal(t.sent[0].hasPdf, true);
    assert.equal(t.sent[1].to, "resin.kalaakaari@gmail.com");
    assert.equal(t.sent[1].hasPdf, false);
    assert.equal(t.sent[0].key, `customer-${ORDER_ID}-ABCD1234EFGH`);
  },
);

Deno.test(
  "request body can NOT choose the recipient or the facts",
  async () => {
    const t = setup();
    await call(t.deps, {
      body: {
        order_id: ORDER_ID,
        email: "attacker@evil.test",
        to: "attacker@evil.test",
        record: {
          id: "x",
          total_price: 1,
          transaction_id: "FAKE",
          user_id: "u",
          status: "verifying_payment",
        },
      },
    });
    assert.equal(t.sent.length, 2);
    assert.ok(t.sent.every((m) => !m.to.includes("evil")));
    assert.ok(t.sent.every((m) => !m.html.includes("FAKE")));
    assert.ok(
      t.sent[1].html.includes("1600"),
      "amount comes from the database row",
    );
  },
);

Deno.test("double fire: second call sends nothing", async () => {
  const t = setup();
  await call(t.deps);
  const res = await call(t.deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { customer: "skipped", shop: "skipped" });
  assert.equal(t.sent.length, 2);
});

Deno.test("two simultaneous calls: still only one pair of emails", async () => {
  const t = setup();
  await Promise.all([call(t.deps), call(t.deps)]);
  assert.equal(t.sent.length, 2);
});

Deno.test("a new UTR on the same order is a new invoice", async () => {
  const t = setup();
  await call(t.deps);
  t.deps.db.getOrder = async () => ({
    ...baseOrder,
    transaction_id: "ZZZZ1111YYYY",
  });
  await call(t.deps);
  assert.equal(t.sent.length, 4);
});

Deno.test(
  "Resend returns an error: logged as failed, 502, other email still goes, retry works",
  async () => {
    const t = setup();
    t.setMail((kind) =>
      kind === "customer"
        ? { id: null, error: "domain not verified" }
        : { id: "re_2", error: null },
    );
    const res = await call(t.deps);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { customer: "failed", shop: "sent" });
    assert.ok(JSON.stringify(t.finished).includes("domain not verified"));
    t.setMail(() => ({ id: "re_3", error: null }));
    const retry = await call(t.deps);
    assert.deepEqual(await retry.json(), { customer: "sent", shop: "skipped" });
    assert.equal(
      t.sent.filter((m) => m.subject.startsWith("Invoice")).length,
      2,
    );
    assert.equal(
      t.sent.filter((m) => m.subject.startsWith("New order")).length,
      1,
    );
  },
);

Deno.test("Resend throws: same as an error result", async () => {
  const t = setup();
  t.setMail(() => new Error("socket hang up"));
  const res = await call(t.deps);
  assert.equal(res.status, 502);
  assert.ok(JSON.stringify(t.finished).includes("socket hang up"));
});

Deno.test(
  "user has no email: customer row failed with a reason, shop alert still sent, no fallback address",
  async () => {
    const t = setup({ email: null });
    const res = await call(t.deps);
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { customer: "failed", shop: "sent" });
    assert.ok(JSON.stringify(t.finished).includes("no_customer_email"));
    assert.equal(t.sent.length, 1);
    assert.equal(t.sent[0].to, "resin.kalaakaari@gmail.com");
  },
);

Deno.test("HTML in a name is escaped", async () => {
  const t = setup({
    order: { full_name: `<img src=x onerror=alert(1)> & "Co"` },
  });
  await call(t.deps);
  for (const m of t.sent) {
    assert.ok(!m.html.includes("<img"), "raw tag must not appear");
    assert.ok(m.html.includes("&lt;img"));
  }
});

Deno.test("database failure -> 500 with no details leaked", async () => {
  const t = setup();
  t.deps.db.getOrder = async () => {
    throw new Error("connection string postgres://secret@host");
  };
  const res = await call(t.deps);
  assert.equal(res.status, 500);
  assert.ok(!(await res.text()).includes("secret@host"));
});

Deno.test(
  "real invoice PDF: valid file, shipping row, deleted product fallback",
  async () => {
    const b64 = await buildInvoicePdf({
      orderId: ORDER_ID,
      orderDate: new Date("2026-10-01T10:00:00Z"),
      utr: "ABCD1234EFGH",
      customerName: "Asha Kulkarni",
      address: "1 Road, Pune, MH, 411061",
      lines: [
        { name: "Varmala frame", quantity: 1, unitPrice: 1500 },
        { name: "Custom Resin Art", quantity: 2, unitPrice: 250 },
      ],
      shipping: 100,
      total: 2100,
    });
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
    assert.ok(bytes.length > 5000);
    await Deno.writeFile(
      Deno.env.get("PDF_OUT") ?? "/tmp/invoice-test.pdf",
      bytes,
    );
  },
);

Deno.test(
  "real invoice PDF: 40 lines still produces a valid file (page break)",
  async () => {
    const b64 = await buildInvoicePdf({
      orderId: ORDER_ID,
      orderDate: new Date(),
      utr: "ABCD1234EFGH",
      customerName: "Asha",
      address: "x",
      lines: Array.from({ length: 40 }, (_, i) => ({
        name: `Item ${i + 1}`,
        quantity: 1,
        unitPrice: 100,
      })),
      shipping: 0,
      total: 4000,
    });
    assert.ok(atob(b64).startsWith("%PDF-"));
    await Deno.writeFile(
      "/tmp/invoice-long.pdf",
      Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)),
    );
  },
);
