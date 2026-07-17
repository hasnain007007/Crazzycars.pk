/**
 * Stock alert counts + short preview list for topbar dropdown.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Product from "@/lib/models/Product.model";
import { productToStockRow } from "@/lib/stockReport";

const trackMatch = {
  $or: [{ "inventory.trackInventory": true }, { "inventory.trackInventory": { $exists: false } }],
};

export async function GET(request) {
  try {
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const [agg] = await Product.aggregate([
      { $match: trackMatch },
      {
        $project: {
          q: { $ifNull: ["$inventory.quantity", 0] },
          th: { $ifNull: ["$inventory.lowStockThreshold", 5] },
        },
      },
      {
        $facet: {
          outOfStock: [{ $match: { $expr: { $lte: ["$q", 0] } } }, { $count: "c" }],
          lowStock: [
            { $match: { $expr: { $and: [{ $gt: ["$q", 0] }, { $lte: ["$q", "$th"] }] } } },
            { $count: "c" },
          ],
        },
      },
    ]);

    const outOfStock = agg?.outOfStock?.[0]?.c ?? 0;
    const lowStock = agg?.lowStock?.[0]?.c ?? 0;
    const total = outOfStock + lowStock;

    const previewDocs = await Product.find({
      ...trackMatch,
      $expr: {
        $or: [
          { $lte: [{ $ifNull: ["$inventory.quantity", 0] }, 0] },
          {
            $and: [
              { $gt: [{ $ifNull: ["$inventory.quantity", 0] }, 0] },
              {
                $lte: [
                  { $ifNull: ["$inventory.quantity", 0] },
                  { $ifNull: ["$inventory.lowStockThreshold", 5] },
                ],
              },
            ],
          },
        ],
      },
    })
      .sort({ "inventory.quantity": 1, updatedAt: -1 })
      .limit(5)
      .select("name articleNo inventory media updatedAt categories restockRequested")
      .populate("categories", "name")
      .lean();

    const preview = previewDocs.map((doc) => {
      const row = productToStockRow(doc);
      return {
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        threshold: row.threshold,
        imageUrl: row.imageUrl,
        alertType: row.status === "out" ? "out" : "low",
      };
    });

    return NextResponse.json({
      success: true,
      outOfStock,
      lowStock,
      total,
      preview,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load stock alerts." },
      { status: 500 }
    );
  }
}
