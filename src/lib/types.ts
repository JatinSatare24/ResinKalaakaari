export type Category = {
  id: string; // uuid comes back from Supabase as a string
  name: string;
  slug: string;
  displayOrder: number; // int8 (a big integer) still arrives as a JS number
};

// What a product card needs (listing page, related products).
export type ProductSummary = {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  price: number;
};

// What the product detail page needs.
export type ProductWithCategory = ProductSummary & {
  description: string | null;
  category_id: string | null;
  categories: { name: string; slug: string } | null;
};

// Home page gallery tile: a product without the price (the tile only shows
// the picture and the name).
export type GalleryItem = Omit<ProductSummary, "price">;

// The fields a cart line needs from a product. Enough to draw the cart
// without another query.
export type CartProduct = Pick<
  ProductSummary,
  "id" | "name" | "price" | "image_url"
>;

// One line in the cart: a product plus how many.
export type CartItem = CartProduct & { quantity: number };

// --- Orders ---

// What the customer types on the checkout form. The keys match the columns
// of the profiles table, so a saved profile can pre-fill the form directly.
export type ShippingDetails = {
  full_name: string;
  phone: string;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
};

// One row of the My Orders list.
export type OrderSummary = {
  id: string;
  created_at: string;
  total_price: number;
  status: string; // free text in the database, so a plain string here
  item_count: number; // number of order lines (not units)
};

// One product line of an order. `product` is null if the product was
// deleted after the order was placed.
export type OrderLine = {
  id: string;
  quantity: number;
  price_at_purchase: number; // price when ordered; later price changes never touch it
  product: { name: string; image_url: string } | null;
};

// The My Orders detail page.
export type OrderDetail = {
  id: string;
  created_at: string;
  status: string;
  total_price: number;
  transaction_id: string | null;
  full_name: string;
  phone: string;
  shipping_address: string;
  city: string;
  state: string;
  pincode: string;
  lines: OrderLine[];
};

// What the payment (success) page needs.
export type PayableOrder = Pick<
  OrderDetail,
  "id" | "total_price" | "status" | "transaction_id"
>;

// --- Admin ---

// One row of the admin orders table.
export type AdminOrder = {
  id: string;
  created_at: string;
  transaction_id: string | null; // the UTR, once the customer has paid
  full_name: string;
  total_price: number;
  status: string;
};

// One row of the admin products list.
export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  is_featured: boolean; // nullable in the database; NULL is read as false
  is_gallery: boolean;
  categories: { name: string } | null;
};

// Everything the edit form needs to start filled in.
export type AdminProductDetail = Omit<AdminProduct, "categories"> & {
  description: string;
  category_id: string;
};

// One row of the admin categories list.
export type AdminCategory = Category & {
  product_count: number; // how many products are in it
};
