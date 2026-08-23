/**
 * Record a restock purchase request for a product.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessCapability } from "@/lib/denyCapability";
import Product from "@/lib/models/Product.model";
import { productToStockRow } from "@/lib/stockReport";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

const PRIORITIES = ["low", "medium", "high"];

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessCapability(user, "canManageInventory");
    if (denied) return denied;

    const body = await request.json();
    const productId = body.productId;
    const requestedQty = Number(body.requestedQty);
    const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : "";
    const priority = PRIORITIES.includes(body.priority) ? body.priority : "medium";

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, error: "Invalid product id." }, { status: 400 });
    }
    if (!Number.isFinite(requestedQty) || requestedQty <= 0 || !Number.isInteger(requestedQty)) {
      return NextResponse.json(
        { success: false, error: "Requested quantity must be a positive whole number." },
        { status: 400 }
      );
    }

    await dbConnect();
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    product.restockRequested = true;
    await product.save();

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Restock requested for ${product.name || "product"}`,
      resource: "Product",
      resourceId: productId,
      details: {
        productName: product.name,
        requestedQty,
        notes,
        priority,
        currentStock: Number(product.inventory?.quantity) || 0,
        threshold: Number(product.inventory?.lowStockThreshold ?? 5),
      },
      type: "restock_request",
      ip: requestIp(request),
    });

    const lean = await Product.findById(productId).populate("categories", "name").lean();
    return NextResponse.json({ success: true, product: productToStockRow(lean) });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not send request." },
      { status: 500 }
    );
  }
}
