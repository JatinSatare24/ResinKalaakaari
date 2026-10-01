// Twelve divides evenly into the 2, 3 and 6 column grids used on the
// products page, so the last row is never half empty.
export const PRODUCTS_PER_PAGE = 12;

// Most units of ONE product a cart may hold. A sanity ceiling (it stops
// nonsense like 1000000000 from an edited localStorage), not a stock rule.
export const MAX_CART_QUANTITY = 99;

// Flat shipping fee, for DISPLAY only (checkout summary). The fee that is
// actually charged is c_shipping inside the create_order SQL function.
// Change both together.
export const SHIPPING_FEE = 100;

// A UPI reference (UTR) the customer types after paying: 12 letters/digits.
export const UTR_LENGTH = 12;

// Where customers pay, and where they send the payment screenshot.
// (The send-order-email edge function has its own copy: Phase 8.)
export const UPI_ID = "9175461840@ibl";
export const WHATSAPP_NUMBER = "919022223759";
