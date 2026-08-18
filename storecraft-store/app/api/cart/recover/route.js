/**
 * GET /api/cart/recover?token= — load abandoned cart items for restore.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import CartSession from "@/lib/models/CartSession.model";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const token = String(request.nextUrl.searchParams.get("token") || "").trim();
    if (!token || token.length < 16) {
      return NextResponse.json({ success: false, error: "Invalid token." }, { status: 400 });
    }

    await dbConnect();
    const doc = await CartSession.findOne({ recoveryToken: token }).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "Cart not found." }, { status: 404 });
    }
    if (doc.status === "dismissed") {
      return NextResponse.json({ success: false, error: "This cart was closed." }, { status: 410 });
    }
    if (!Array.isArray(doc.items) || doc.items.length === 0) {
      return NextResponse.json({ success: false, error: "Cart is empty." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      sessionId: doc.sessionId,
      status: doc.status,
      items: doc.items,
      customer: doc.customer || {},
      subtotal: doc.subtotal || 0,
      itemCount: doc.itemCount || 0,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Recover failed." },
      { status: 500 }
    );
  }
}
