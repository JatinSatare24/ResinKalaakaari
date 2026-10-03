// Shapes shared by the handler, the database wrapper and the invoice builder.

export type OrderRow = {
  id: string;
  user_id: string | null;
  status: string | null;
  total_price: number;
  transaction_id: string | null;
  full_name: string;
  phone: string;
  shipping_address: string;
  city: string;
  state: string | null;
  pincode: string;
  created_at: string;
};

export type ItemRow = {
  quantity: number;
  price_at_purchase: number;
  // null when the product was deleted after the order was placed.
  product_name: string | null;
};

export type EmailKind = "customer" | "shop";

export type InvoiceInput = {
  orderId: string;
  orderDate: Date;
  utr: string;
  customerName: string;
  address: string;
  lines: { name: string; quantity: number; unitPrice: number }[];
  // total_price minus the lines: whatever the server charged on top.
  shipping: number;
  total: number;
};

export type SendResult = { id: string | null; error: string | null };

// Everything the handler needs from the outside world. Real versions live in
// index.ts; the tests pass fakes. This is what makes the handler testable.
export type Db = {
  verifySecret(secret: string): Promise<boolean>;
  getOrder(orderId: string): Promise<OrderRow | null>;
  getItems(orderId: string): Promise<ItemRow[]>;
  getCustomerEmail(userId: string): Promise<string | null>;
  claim(orderId: string, kind: EmailKind, utr: string): Promise<boolean>;
  finish(
    orderId: string,
    kind: EmailKind,
    utr: string,
    result:
      { ok: true; providerId: string | null } | { ok: false; error: string },
  ): Promise<void>;
};

export type Mailer = {
  send(
    message: {
      to: string;
      subject: string;
      html: string;
      replyTo?: string;
      attachment?: { filename: string; contentBase64: string };
    },
    idempotencyKey: string,
  ): Promise<SendResult>;
};

export type Deps = {
  db: Db;
  mailer: Mailer;
  buildInvoice: (input: InvoiceInput) => Promise<string>;
};
