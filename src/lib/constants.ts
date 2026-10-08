// Twelve divides evenly into the 2, 3 and 6 column grids used on the
// products page, so the last row is never half empty.
export const PRODUCTS_PER_PAGE = 12;

// Orders per page on the admin list. A table row is short, so 20 fits a
// screen or two without scrolling forever.
export const ADMIN_ORDERS_PER_PAGE = 20;

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
// The send-order-email edge function keeps its own copy of UPI_ID in
// supabase/functions/send-order-email/config.ts (the function runs on Deno and
// cannot import from src/). Change both together.
export const UPI_ID = "9175461840@ibl";
export const WHATSAPP_NUMBER = "919022223759";

// --- Product admin (Phase 10) ---

// Products per page on the admin list.
export const ADMIN_PRODUCTS_PER_PAGE = 20;

// Limits for the admin product and category forms. The admin_* SQL functions
// (phase-10-product-admin-A.sql) enforce the same numbers, so change both
// together. The description limit was set from the longest existing
// description (1444 characters) plus headroom.
export const MAX_PRODUCT_NAME_LENGTH = 100;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 2000;
export const MAX_CATEGORY_NAME_LENGTH = 60;
export const MIN_PRODUCT_PRICE = 1; // whole rupees
export const MAX_PRODUCT_PRICE = 100000; // whole rupees; catches an extra zero

// The Supabase Storage bucket that holds product photos. A product's
// image_url must point inside it (the SQL functions check this too).
export const PRODUCT_IMAGE_BUCKET = "Resin Kalaakaari product image bucket";
