"use server";

// Server Actions are public endpoints (see admin/orders/actions.ts): check
// WHO is calling, WHAT they sent, then the database checks the role again
// inside admin_create_category / admin_rename_category.
import { revalidatePath } from "next/cache";
import { getCurrentUser, getIsAdmin } from "@/lib/auth";
import {
  createCategory,
  renameCategory,
  type CreateCategoryFailure,
  type RenameCategoryFailure,
} from "@/lib/data/admin-categories";
import { isUuid } from "@/lib/orders";
import { checkCategoryName } from "@/lib/product-admin";

const MESSAGES: Record<CreateCategoryFailure | RenameCategoryFailure, string> =
  {
    not_authenticated: "Your session has expired. Please sign in again.",
    not_admin: "You don't have permission to do this.",
    invalid_name: "That name can't be used. Try another.",
    category_name_taken: "A category with that name already exists.",
    slug_unavailable: "Could not make a link for that name. Try another.",
    category_not_found: "That category no longer exists.",
  };

export type CategoryActionResult =
  { ok: true } | { ok: false; message: string };

// Same two checks at the start of every action.
async function checkAdmin(): Promise<CategoryActionResult> {
  if (!(await getCurrentUser())) {
    return { ok: false, message: MESSAGES.not_authenticated };
  }
  if (!(await getIsAdmin())) return { ok: false, message: MESSAGES.not_admin };
  return { ok: true };
}

// The list page and the dashboard (it shows the category count) both change.
function refresh() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin");
}

export async function addCategory(
  name: unknown,
): Promise<CategoryActionResult> {
  const allowed = await checkAdmin();
  if (!allowed.ok) return allowed;

  const check = checkCategoryName(name);
  if (!check.ok) return { ok: false, message: check.error };

  let result;
  try {
    result = await createCategory(check.name);
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not add the category. Try again." };
  }
  if (!result.ok) return { ok: false, message: MESSAGES[result.reason] };

  refresh();
  return { ok: true };
}

export async function renameCategoryAction(
  id: unknown,
  name: unknown,
): Promise<CategoryActionResult> {
  const allowed = await checkAdmin();
  if (!allowed.ok) return allowed;

  if (typeof id !== "string" || !isUuid(id)) {
    return { ok: false, message: MESSAGES.category_not_found };
  }
  const check = checkCategoryName(name);
  if (!check.ok) return { ok: false, message: check.error };

  let result;
  try {
    result = await renameCategory(id, check.name);
  } catch (error) {
    console.error(error);
    return { ok: false, message: "Could not rename the category. Try again." };
  }
  if (!result.ok) return { ok: false, message: MESSAGES[result.reason] };

  refresh();
  return { ok: true };
}
