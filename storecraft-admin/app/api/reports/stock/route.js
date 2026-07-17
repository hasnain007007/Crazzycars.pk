/**
 * Stock report: all products with inventory + summary + filters (query params).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Product from "@/lib/models/Product.model";
import {
  filterStockRows,
  productToStockRow,
  sortStockRows,
  summarizeStockRows,
} from "@/lib/stockReport";

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "";
    const sort = searchParams.get("sort") || "stock_asc";

    const docs = await Product.find()
      .select(
        "name articleNo categories inventory media restockRequested createdAt updatedAt"
      )
      .populate("categories", "name")
      .sort({ updatedAt: -1 })
      .lean();

    const allRows = docs.map((d) => productToStockRow(d));
    const summary = summarizeStockRows(allRows);

    const filtered = sortStockRows(
      filterStockRows(allRows, {
        search,
        status,
        categoryId: category || null,
      }),
      sort
    );

    return NextResponse.json({
      success: true,
      summary,
      products: filtered,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Stock report failed." },
      { status: 500 }
    );
  }
}
