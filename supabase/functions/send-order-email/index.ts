// send-order-email: entry point. Called by the database (pg_net) when an order
// moves to verifying_payment. Deploy with verify_jwt = false (see
// supabase/config.toml): callers authenticate with a shared secret, which
// handler.ts checks, instead of a Supabase JWT.
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { SHOP } from "./config.ts";
import { makeDb } from "./db.ts";
import { handle } from "./handler.ts";
import { buildInvoicePdf } from "./invoice.ts";
import type { Deps } from "./types.ts";

// New projects expose the admin key as SUPABASE_SECRET_KEYS (a JSON object of
// named keys). Older ones only have SUPABASE_SERVICE_ROLE_KEY. Prefer the new.
function adminKey(): { key: string; source: string } {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const key = (JSON.parse(raw) as Record<string, string>).default;
      if (key) return { key, source: "SUPABASE_SECRET_KEYS.default" };
    } catch {
      // fall through to the legacy variable
    }
  }
  return {
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    source: "SUPABASE_SERVICE_ROLE_KEY",
  };
}

let deps: Deps | null = null;

function getDeps(): Deps {
  if (deps) return deps;
  const url = Deno.env.get("SUPABASE_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const { key, source } = adminKey();
  if (!url || !key || !resendKey) {
    throw new Error("missing SUPABASE_URL, admin key or RESEND_API_KEY");
  }
  console.log(`admin key source: ${source}`); // the name only, never the value

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const resend = new Resend(resendKey);

  deps = {
    db: makeDb(admin),
    buildInvoice: buildInvoicePdf,
    mailer: {
      async send(message, idempotencyKey) {
        // Resend returns { data, error } instead of throwing.
        const { data, error } = await resend.emails.send(
          {
            from: SHOP.sender,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            replyTo: message.replyTo,
            attachments: message.attachment
              ? [
                  {
                    filename: message.attachment.filename,
                    content: message.attachment.contentBase64,
                  },
                ]
              : undefined,
          },
          { idempotencyKey },
        );
        return { id: data?.id ?? null, error: error ? error.message : null };
      },
    },
  };
  return deps;
}

Deno.serve((req) => {
  try {
    return handle(req, getDeps());
  } catch (err) {
    console.error("send-order-email setup failed:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
