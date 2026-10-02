"use server";

// Public endpoint like every Server Action: check who is calling, and clean
// everything that arrives (parseShipping copies out only the six known
// fields). The user id comes from the verified session, never from the
// browser, so nobody can save into someone else's profile.
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { hasErrors, parseShipping, type ShippingErrors } from "@/lib/checkout";
import { updateProfile } from "@/lib/data/profile";
import { validateProfile } from "@/lib/profile";

export type SaveProfileResult =
  { ok: true } | { ok: false; message: string; fieldErrors?: ShippingErrors };

export async function saveProfile(input: unknown): Promise<SaveProfileResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      message: "Your session has expired. Please sign in again.",
    };
  }

  const details = parseShipping(input);
  const fieldErrors = validateProfile(details);
  if (hasErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  try {
    await updateProfile(user.id, details);
  } catch (error) {
    // An unexpected failure (database down): tell the user, keep their form.
    console.error(error);
    return {
      ok: false,
      message: "We couldn't save your profile. Please try again.",
    };
  }
  // Checkout pre-fills from the profile, so make sure it re-reads it.
  revalidatePath("/profile");
  revalidatePath("/checkout");
  return { ok: true };
}
