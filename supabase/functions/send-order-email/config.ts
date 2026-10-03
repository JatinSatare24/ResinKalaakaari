// Shop details used by the invoice and the two emails. One place to edit.
// The app has its own copy of the UPI id in src/lib/constants.ts (UPI_ID):
// change both together. (The full fix is a settings table; see ARCHITECTURE.md.)
export const SHOP = {
  // Shown in the PDF header and in email text.
  name: "Resin Kalaakaari",
  tagline: "Where art meets the soul.",
  address: "Pimple gurav pune 411061, Maharashtra",
  // Where the shop owner gets the "new payment submitted" alert and where
  // customer replies go.
  email: "resin.kalaakaari@gmail.com",
  // Must be an address on a domain verified in Resend.
  sender: "Resin Kalaakaari <orders@resinkalaakaari.in>",
  upiId: "9175461840@ibl",
  upiPayeeName: "ResinKalaakaari",
} as const;
