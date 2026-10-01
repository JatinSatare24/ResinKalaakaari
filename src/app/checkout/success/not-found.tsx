import NotFoundUI from "@/components/NotFoundUI/NotFoundUI";

// Shown when the success page calls notFound(): no id in the URL, or no
// order with that id belonging to the signed-in user.
export default function SuccessNotFound() {
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
