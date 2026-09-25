/**
 * PATCH /api/social/import/[importId] — edit preview rows / photos / skip
 * GET — reload preview
 */
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getRequestUser } from "@/lib/getRequestUser";
import { denyUnlessAnyCapability } from "@/lib/denyCapability";
import {
  loadImportPreview,
  saveImportPreview,
  importDir,
  readImportManifest,
} from "@/lib/social/importService";
import { parsePktDateTime } from "@/lib/social/pktTime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const user = getRequestUser(_request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { importId } = await context.params;
    const preview = await loadImportPreview(importId);
    return NextResponse.json({ success: true, importId, ...preview });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Import not found" }, { status: 404 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = getRequestUser(request);
    const denied = denyUnlessAnyCapability(user, ["canManageContent", "canManageSettings"]);
    if (denied) return denied;
    const { importId } = await context.params;
    const preview = await loadImportPreview(importId);
    const ct = request.headers.get("content-type") || "";

    if (ct.includes("multipart/form-data")) {
      const form = await request.formData();
      const rowNo = Number(form.get("rowNo"));
      const row = (preview.rows || []).find((r) => r.rowNo === rowNo);
      if (!row) {
        return NextResponse.json({ success: false, error: "Row not found" }, { status: 404 });
      }
      const files = form.getAll("files").filter((f) => f && typeof f !== "string");
      const manifest = await readImportManifest(importId);
      for (const file of files) {
        const buf = Buffer.from(await file.arrayBuffer());
        const tmpId = randomUUID().slice(0, 8);
        const name = file.name || `${tmpId}.jpg`;
        const relPath = `extra/${tmpId}-${name}`.replace(/\\/g, "/");
        const abs = path.join(importDir(importId), "files", relPath);
        await mkdir(path.dirname(abs), { recursive: true });
        await writeFile(abs, buf);
        manifest.files.push({ tmpId, name, relPath });
        row.images = row.images || [];
        row.images.push({
          tmpId,
          name,
          order: row.images.length + 1,
          thumbUrl: `/api/social/import/${importId}/file/${tmpId}`,
        });
      }
      await writeFile(
        path.join(importDir(importId), "manifest.json"),
        JSON.stringify(manifest, null, 2)
      );
      row.errors = (row.errors || []).filter((e) => !/photo/i.test(e));
      if (row.images.length) row.include = !(row.errors || []).length;
      await saveImportPreview(importId, preview);
      return NextResponse.json({ success: true, row });
    }

    const body = await request.json().catch(() => ({}));
    const rowNo = Number(body.rowNo);
    const row = (preview.rows || []).find((r) => r.rowNo === rowNo);
    if (!row && body.action !== "move_photo") {
      return NextResponse.json({ success: false, error: "Row not found" }, { status: 404 });
    }

    if (body.action === "skip") {
      row.skip = Boolean(body.skip);
    }
    if (body.action === "include") {
      row.include = Boolean(body.include);
      row.skip = !row.include;
    }
    if (body.data && row) {
      row.data = { ...row.data, ...body.data };
      if (body.data.date && body.data.time) {
        try {
          row.data.scheduledAt = parsePktDateTime(body.data.date, body.data.time).toISOString();
          row.errors = (row.errors || []).filter((e) => !/time|date|past/i.test(e));
          if (new Date(row.data.scheduledAt) < new Date(Date.now() - 60_000)) {
            row.errors.push("Time is in the past");
          }
        } catch (e) {
          row.errors = [...(row.errors || []).filter((x) => !/time|date/i.test(x)), e.message];
        }
      }
    }
    if (body.action === "reorder_images" && Array.isArray(body.imageTmpIds) && row) {
      const map = Object.fromEntries((row.images || []).map((i) => [i.tmpId, i]));
      row.images = body.imageTmpIds.map((id, idx) => ({
        ...map[id],
        order: idx + 1,
      })).filter(Boolean);
    }
    if (body.action === "remove_image" && row) {
      row.images = (row.images || []).filter((i) => i.tmpId !== body.tmpId);
    }
    if (body.action === "move_photo") {
      const fromUnmatched = (preview.unmatched || []).find((u) => u.tmpId === body.tmpId);
      const target = (preview.rows || []).find((r) => r.rowNo === Number(body.toRowNo));
      if (fromUnmatched && target) {
        preview.unmatched = preview.unmatched.filter((u) => u.tmpId !== body.tmpId);
        target.images = target.images || [];
        target.images.push({
          ...fromUnmatched,
          order: target.images.length + 1,
          thumbUrl: `/api/social/import/${importId}/file/${fromUnmatched.tmpId}`,
        });
        target.errors = (target.errors || []).filter((e) => !/photo/i.test(e));
      }
    }

    if (row) {
      row.include = !(row.errors || []).length && !row.skip;
    }
    await saveImportPreview(importId, preview);
    return NextResponse.json({ success: true, rows: preview.rows, unmatched: preview.unmatched });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Update failed" }, { status: 400 });
  }
}
