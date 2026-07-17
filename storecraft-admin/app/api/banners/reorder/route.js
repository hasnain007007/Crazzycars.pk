import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import Banner from "@/lib/models/Banner.model";

export async function PUT(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { order } = await request.json();

    if (!Array.isArray(order)) {
      return NextResponse.json({ success: false, error: "Invalid order payload" }, { status: 400 });
    }

    await Promise.all(
      order.map(({ id, sortOrder }) =>
        Banner.findByIdAndUpdate(id, { sortOrder: Number(sortOrder) || 0 })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reorder banners." },
      { status: 500 }
    );
  }
}
