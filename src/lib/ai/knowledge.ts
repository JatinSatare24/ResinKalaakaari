// What the shop says about itself, written once as plain text. Two things read
// it, so they can never disagree:
//   - the assistant's system prompt (SHOP_KNOWLEDGE), and
//   - the quick-reply buttons (QUICK_REPLIES), which answer with NO model call:
//     free, instant, and still working when the AI provider is down.
//
// Source: the Shipping, Terms, Privacy, About and Contact pages. Those pages
// are written in JSX, so this is a hand-kept copy: when a policy page changes,
// change the matching sentence here too (the README's checklist says so).
// Nothing is invented here: no figure appears that is not on a page, and the
// shipping fee comes straight from SHIPPING_FEE so it cannot drift.
import { SHIPPING_FEE, WHATSAPP_NUMBER } from "@/lib/constants";

export const SHOP_PHONE = "+91 90222 23759";
export const SHOP_EMAIL = "resin.kalaakaari@gmail.com";

// The contact details the assistant may repeat. Anything else that looks like
// a phone number, UPI id or email in a reply is refused (see guard.ts).
export const SHOP_CONTACTS = [
  WHATSAPP_NUMBER,
  SHOP_PHONE,
  "90222 23759",
  SHOP_EMAIL,
];

const FACTS = {
  making:
    "Every piece is 100% handcrafted and made to order. Minor imperfections such as tiny bubbles or slight colour variations are natural in resin and are not defects.",
  delivery:
    "Handcrafted pieces take 10 to 15 business days to make. Flower preservation can take up to 1 month because of drying and multi-layer pouring. After dispatch, delivery usually takes 3 to 4 business days, and can take longer than a week for some areas. Delays can happen because of holidays, high demand or courier problems. Tracking details are shared once the order ships.",
  shippingFee: `A flat shipping fee of ₹${SHIPPING_FEE} is added to every order at checkout.`,
  refunds:
    "Because every piece is personalised and made to order, there are no refunds or cancellations once production has begun. Once an order has shipped it is final: the address, the order and cancellations cannot be changed.",
  payment:
    "Payment is manual, by UPI or bank transfer. An order is confirmed only after the advance payment is received. After paying, the customer shares the transaction reference on the order page, or a clear screenshot of the payment with the Order ID. The shop never stores bank details or UPI PINs.",
  damage:
    "For a damage claim in transit, a continuous, unedited unboxing video showing the package opened for the first time is mandatory. Claims without that video cannot be accepted.",
  privacy:
    "The shop collects name, shipping address, email and phone number only to process and deliver orders, send order updates and give support. Personal data is never sold or shared, except with the logistics partners who deliver the package.",
  about:
    "Resin Kalaakaari is a one-woman studio in Pune, run by Sanika, a 26-year-old artist. She hand-makes personalised resin keepsakes: wedding varmala and flower preservation, custom nameplates, jewellery and personalised gifts.",
  contact: `Contact: WhatsApp or phone ${SHOP_PHONE}, email ${SHOP_EMAIL}. Studio location: Pune, Maharashtra. Open Monday to Saturday, 9 AM to 6 PM. Custom orders are discussed on WhatsApp.`,
} as const;

// The text placed in the system prompt.
export const SHOP_KNOWLEDGE = [
  `About the shop: ${FACTS.about}`,
  `The products: ${FACTS.making}`,
  `Making and delivery: ${FACTS.delivery}`,
  `Shipping fee: ${FACTS.shippingFee}`,
  `Cancellations and refunds: ${FACTS.refunds}`,
  `Payment: ${FACTS.payment}`,
  `Damaged parcels: ${FACTS.damage}`,
  `Privacy: ${FACTS.privacy}`,
  FACTS.contact,
].join("\n");

export type QuickReply = { id: string; label: string; answer: string };

// Buttons shown above the chat box. Each answer is fixed text from FACTS.
export const QUICK_REPLIES: QuickReply[] = [
  {
    id: "delivery",
    label: "How long does delivery take?",
    answer: FACTS.delivery,
  },
  {
    id: "refunds",
    label: "Can I cancel or get a refund?",
    answer: FACTS.refunds,
  },
  { id: "payment", label: "How do I pay?", answer: FACTS.payment },
  { id: "damage", label: "My parcel arrived damaged", answer: FACTS.damage },
  { id: "contact", label: "How do I contact the shop?", answer: FACTS.contact },
];
