/**
 * HTTP wrappers around lib/permissions (NextResponse).
 * Most routes import denyUnlessCapability from here or from requireRole re-exports.
 */
import { NextResponse } from "next/server";
import { hasAnyCapability, hasCapability } from "@/lib/permissions";

/**
 * @returns {NextResponse | null}
 */
export function denyUnlessCapability(user, capability) {
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasCapability(user, capability)) {
    return NextResponse.json(
      {
        success: false,
        error: `Forbidden. Requires ${capability}.`,
      },
      { status: 403 }
    );
  }
  return null;
}

/**
 * @returns {NextResponse | null}
 */
export function denyUnlessAnyCapability(user, capabilities) {
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!hasAnyCapability(user, capabilities)) {
    return NextResponse.json(
      {
        success: false,
        error: `Forbidden. Requires one of: ${(capabilities || []).join(", ")}.`,
      },
      { status: 403 }
    );
  }
  return null;
}
