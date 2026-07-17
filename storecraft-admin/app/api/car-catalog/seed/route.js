import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth";
import { getDefaultCarCatalogSeed } from "@/lib/carCatalogSeedData";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import CarCatalog from "@/lib/models/CarCatalog.model";
import { requestIp } from "@/lib/requestIp";

export async function POST(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    await dbConnect();

    const seed = getDefaultCarCatalogSeed();
    let added = 0;
    let skipped = 0;
    const addedNames = [];

    for (const make of seed) {
      const exists = await CarCatalog.findOne({ slug: make.slug }).select("_id name").lean();
      if (exists) {
        skipped += 1;
        continue;
      }
      await CarCatalog.create(make);
      added += 1;
      addedNames.push(make.name);
    }

    await logActivity({
      user: user.userId,
      userName: user.name || "Admin",
      action: `Car catalog seeded (${added} makes added)`,
      resource: "CarCatalog",
      resourceId: "seed",
      type: "car_catalog",
      ip: requestIp(request),
    });

    return NextResponse.json({
      success: true,
      added,
      skipped,
      addedNames,
      message:
        added > 0
          ? `Added ${added} make(s). ${skipped} existing make(s) were not changed.`
          : "All default makes already exist. No data was overwritten.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Seed failed." },
      { status: 500 }
    );
  }
}
