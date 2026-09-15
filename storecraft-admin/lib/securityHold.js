/**
 * Guards for products flagged with securityHold.
 * Only owners may clear a hold or reactivate a held SKU.
 */
import { NextResponse } from "next/server";
import { normalizeRole } from "@/lib/permissions";

export function isOwnerUser(user) {
  return normalizeRole(user?.role) === "owner";
}

/**
 * @param {{ securityHold?: boolean } | null | undefined} existing
 * @param {{ status?: string, securityHold?: boolean } | null | undefined} patch
 * @param {{ role?: string } | null | undefined} user
 * @returns {NextResponse | null}
 */
export function denySecurityHoldMutation(existing, patch, user) {
  const held = Boolean(existing?.securityHold);
  const nextStatus = patch?.status != null ? String(patch.status) : null;
  const clearingHold = patch?.securityHold === false && held;
  const settingActive = nextStatus === "active" && (held || patch?.securityHold === true);

  if (!clearingHold && !settingActive) return null;

  if (!isOwnerUser(user)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Forbidden. This product is on security hold — only an owner can clear the hold or set status to active.",
      },
      { status: 403 }
    );
  }
  return null;
}
