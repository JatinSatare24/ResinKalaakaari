import { redirect } from "next/navigation";

// /admin has nothing of its own yet; orders is the only admin area.
// (The proxy has already sent guests to login, and /admin/orders checks the
// role, so this redirect leaks nothing.)
export default function AdminPage() {
  redirect("/admin/orders");
}
