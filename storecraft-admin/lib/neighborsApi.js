/**
 * Shared GET handler factory for `/api/.../[id]/neighbors`.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { findNeighborsByOrder } from "@/lib/findNeighbors";

/**
 * @param {import("mongoose").Model} Model
 * @param {{
 *   orderBy?: Record<string, 1|-1>,
 *   labelField?: string,
 *   where?: object | ((doc: object) => object),
 *   extraSelect?: string,
 * }} config
 */
export function createNeighborsGetHandler(Model, config = {}) {
  return async function GET(request, context) {
    try {
      const user = getRequestUser(request);
      if (!user) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
      const { id } = await context.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: "Invalid id." }, { status: 400 });
      }
      await dbConnect();
      const where =
        typeof config.where === "function"
          ? config.where()
          : config.where && typeof config.where === "object"
            ? config.where
            : {};
      const { prev, next } = await findNeighborsByOrder(Model, id, {
        where,
        orderBy: config.orderBy || { createdAt: -1 },
        labelField: config.labelField || "name",
        extraSelect: config.extraSelect || "",
      });
      return NextResponse.json({ success: true, prev, next, previous: prev });
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error.message || "Failed to load neighbors." },
        { status: 500 }
      );
    }
  };
}
