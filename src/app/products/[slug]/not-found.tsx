import NotFoundUI from "@/components/NotFoundUI/NotFoundUI";

// Shown when ProductPage calls notFound() (no product with that slug).
export default function ProductNotFound() {
  return (
    <NotFoundUI
      title="Product Not Found"
      subtitle="We couldn't find that product. It may have been removed."
      linkText="Browse all products"
      linkHref="/products"
    />
  );
}
