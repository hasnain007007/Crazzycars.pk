/**
 * Add units to product inventory; activity log + stock alert sync.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessMinRole } from "@/lib/requireRole";
import Product from "@/lib/models/Product.model";
import { productToStockRow } from "@/lib/stockReport";
import { syncStockAlertForProduct } from "@/lib/productMutations";

function requestIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
}

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessMinRole(user, "editor");
    if (denied) return denied;

    const body = await request.json();
    const productId = body.productId;
    const addQuantity = Number(body.addQuantity);
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json({ success: false, error: "Invalid product id." }, { status: 400 });
    }
    if (!Number.isFinite(addQuantity) || addQuantity <= 0 || !Number.isInteger(addQuantity)) {
      return NextResponse.json(
        { success: false, error: "Add quantity must be a positive whole number." },
        { status: 400 }
      );
    }

    await dbConnect();
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
    }

    const oldQty = Number(product.inventory?.quantity) || 0;
    const newQty = oldQty + addQuantity;
    product.inventory = product.inventory || {};
    product.inventory.quantity = newQty;

    const th = Number(product.inventory?.lowStockThreshold ?? 5);
    if (newQty > th) {
      product.restockRequested = false;
    }

    await product.save();
    await syncStockAlertForProduct(product);

    const name = product.name || "Product";
    const adminName = user.name || "Admin";
    await logActivity({
      user: user.userId,
      userName: adminName,
      action: `Stock updated for ${name}: +${addQuantity} units (was ${oldQty}, now ${newQty}) by ${adminName}`,
      resource: "Product",
      resourceId: productId,
      details: { oldQty, newQty, addQuantity, note },
      type: "stock_update",
      ip: requestIp(request),
    });

    const lean = await Product.findById(productId).populate("categories", "name").lean();
    const row = productToStockRow(lean);

    return NextResponse.json({ success: true, product: row });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Could not update stock." },
      { status: 500 }
    );
  }
}
