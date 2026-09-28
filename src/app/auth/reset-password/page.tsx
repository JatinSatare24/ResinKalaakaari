import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/server";
import ResetPassword from "@/components/ResetPassword/ResetPassword";

export default async function ResetPasswordPage() {
  // The recovery email goes through /auth/callback, which sets the session
  // cookie BEFORE this page loads. So no user here = expired/invalid/direct visit.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser(); // getUser() asks Supabase to verify, unlike getSession()

  // Server Component redirect: redirect() from next/navigation (not NextResponse)
  if (!user) redirect("/login?error=auth_failed");

  return <ResetPassword />;
}
