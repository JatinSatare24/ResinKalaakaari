import NotFoundUI from "@/components/NotFoundUI/NotFoundUI";

// Same message whether the order does not exist or belongs to someone else,
// so the page never confirms that another customer's order id is real.
export default function OrderNotFound() {
  return (
    <NotFoundUI
      eyebrow="Order"
      title="Order Not Found"
      subtitle="We couldn't find that order on your account."
      linkText="View my orders"
      linkHref="/my-orders"
    />
  );
}
