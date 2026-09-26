import NotFoundUI from "@/components/NotFound/NotFound";

export default function NotFoundPage() {
    return (
        <NotFoundUI
            title="Page Not Found"
            subtitle="Sorry, we can't find the page you're looking for."
            linkText="Go back home"
            linkHref="/"
        />
    )
}