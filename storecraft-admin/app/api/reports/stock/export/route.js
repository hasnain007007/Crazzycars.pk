/**
 * CSV export for stock report (same filters as GET /api/reports/stock).
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Product from "@/lib/models/Product.model";
import {
  filterStockRows,
  productToStockRow,
  sortStockRows,
  stockRowsToCsv,
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
    const idsParam = searchParams.get("ids");
    const idList = idsParam
      ? idsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const docs = await Product.find()
      .select("name articleNo categories inventory media restockRequested updatedAt")
      .populate("categories", "name")
      .lean();

    let rows = docs.map((d) => productToStockRow(d));
    if (idList?.length) {
      const set = new Set(idList);
      rows = rows.filter((r) => set.has(r.id));
      rows = sortStockRows(rows, sort);
    } else {
      rows = sortStockRows(
        filterStockRows(rows, {
          search,
          status,
          categoryId: category || null,
        }),
        sort
      );
    }

    const csv = stockRowsToCsv(rows);
    const filename = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Export failed." },
      { status: 500 }
    );
  }
}
