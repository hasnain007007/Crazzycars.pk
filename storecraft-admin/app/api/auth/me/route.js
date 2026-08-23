/**
 * Returns the current admin user from the JWT cookie (no DB hit).
 * Role is normalized (aliases → canonical). Capabilities listed for UI gating.
 */
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/getRequestUser";
import { listCapabilities, normalizeRole } from "@/lib/permissions";

export async function GET(request) {
  const user = getRequestUser(request);
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const role = normalizeRole(user.role);
  return NextResponse.json({
    success: true,
    user: {
      id: user.userId,
      name: user.name,
      email: user.email,
      role,
      roleRaw: user.role,
      capabilities: listCapabilities(user.role),
    },
  });
}
