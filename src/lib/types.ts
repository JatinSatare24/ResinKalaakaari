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
