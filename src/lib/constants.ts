// Twelve divides evenly into the 2, 3 and 6 column grids used on the
// products page, so the last row is never half empty.
export const PRODUCTS_PER_PAGE = 12;

// Most units of ONE product a cart may hold. A sanity ceiling (it stops
// nonsense like 1000000000 from an edited localStorage), not a stock rule.
export const MAX_CART_QUANTITY = 99;
