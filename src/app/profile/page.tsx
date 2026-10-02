import type { Metadata } from "next";
import Profile from "@/components/Profile/Profile";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/data/profile";

export const metadata: Metadata = {
  title: "Your Profile | Resin Kalaakaari",
  robots: { index: false },
};

// Server Component: the saved details arrive in the HTML (no spinner + browser
// fetch). proxy.ts is the fast first gate, requireUser() the real one.
export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const details = await getProfile(user.id);
  return <Profile initial={details} email={user.email ?? ""} />;
}
