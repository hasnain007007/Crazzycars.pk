/**
 * Branded 1200×630 JPEG share cards (WhatsApp / Facebook / X link previews).
 *
 * Why: WhatsApp center-crops previews and often fails on WebP. The old default
 * card was an empty dark gradient (centre crop = blank square) and product /
 * category / car pages pointed at square WebP files. These cards use the real
 * product photo(s), price and brand, rendered with bundled Inter (no system fonts)
 * and re-encoded as JPEG (< ~150 KB).
 *
 * Server-only. Text is drawn by Satori from the WOFF files in public/og-fonts.
 * Plain createElement (no JSX) so node:test can import it directly.
 */
import fs from "node:fs";
import sharp from "sharp";
import { createElement as h } from "react";
import { ImageResponse } from "next/og";
import { resolveExistingLocalMedia } from "@/lib/resolveLocalMedia";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const RED = "#c8102e";
const INK = "#0f0f10";
const PUBLIC_ORIGIN = "https://crazzycars.pk";
const MEDIA_ROOT = String(process.env.MEDIA_ROOT || "/app/media").replace(/\/+$/, "");

let fontCache = null;
function loadFonts() {
  if (fontCache) return fontCache;
  const base = `${process.cwd()}/public/og-fonts`;
  const read = (w) => fs.readFileSync(/* turbopackIgnore: true */ `${base}/inter-latin-${w}.woff`);
  fontCache = [
    { name: "Inter", data: read(400), weight: 400, style: "normal" },
    { name: "Inter", data: read(700), weight: 700, style: "normal" },
    { name: "Inter", data: read(800), weight: 800, style: "normal" },
  ];
  return fontCache;
}

/** Read a /media/... image (disk first, live site fallback for local dev). */
async function readMediaBuffer(mediaUrl) {
  const src = String(mediaUrl || "").trim();
  if (!src) return null;
  const pick = resolveExistingLocalMedia(src, { prefer: ["800", "1200", "original", "400"] });
  const path = String(pick || src).split("?")[0];
  if (path.startsWith("/media/") && !path.includes("..")) {
    try {
      return fs.readFileSync(/* turbopackIgnore: true */ `${MEDIA_ROOT}/${path.slice("/media/".length)}`);
    } catch {
      /* fall through to HTTP */
    }
  }
  const url = path.startsWith("http") ? path : path.startsWith("/") ? `${PUBLIC_ORIGIN}${path}` : "";
  if (!url || !url.startsWith(`${PUBLIC_ORIGIN}/`)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Square JPEG data URI on white (Satori cannot draw WebP). */
export async function photoDataUri(mediaUrl, size) {
  const buf = await readMediaBuffer(mediaUrl);
  if (!buf) return null;
  try {
    const jpg = await sharp(buf)
      .resize(size, size, { fit: "contain", background: "#ffffff" })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 88 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

export function formatRs(n) {
  const v = Math.round(Number(n) || 0);
  return `Rs ${v.toLocaleString("en-US")}`;
}

/** Keep long product names to ~4 lines at 40px in a 470px column. */
export function clampText(text, max) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,–-]+$/, "")}…`;
}

const row = (style, ...kids) => h("div", { style: { display: "flex", ...style } }, ...kids);

function Wordmark({ size = 34 }) {
  return row(
    { fontSize: size, fontWeight: 800, letterSpacing: -0.5 },
    h("span", { style: { color: "#ffffff" } }, "CrazzyCars"),
    h("span", { style: { color: RED } }, ".pk")
  );
}

function Check() {
  return h(
    "svg",
    { width: 22, height: 22, viewBox: "0 0 24 24", style: { marginRight: 8 } },
    h("circle", { cx: 12, cy: 12, r: 11, fill: RED }),
    h("path", {
      d: "M7 12.5l3.2 3.2L17 9",
      stroke: "#fff",
      strokeWidth: 2.6,
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    })
  );
}

function Chip(text) {
  return row(
    {
      alignItems: "center",
      fontSize: 22,
      fontWeight: 700,
      color: "#f4f4f5",
      border: "2px solid #3f3f46",
      borderRadius: 999,
      padding: "8px 16px 8px 10px",
      marginRight: 10,
      marginBottom: 10,
    },
    Check(),
    text
  );
}

function Photo(uri, size) {
  return row(
    {
      width: size,
      height: size,
      borderRadius: 18,
      overflow: "hidden",
      background: uri ? "#ffffff" : "#1c1c1f",
    },
    uri ? h("img", { src: uri, width: size, height: size, alt: "" }) : null
  );
}

/**
 * Product card: photo left (white), dark panel right with name, price, trust chips.
 * @param {{ name: string, price: number, regular?: number, photo: string|null, cod: boolean }} p
 */
export function ProductCard({ name, price, regular, photo, cod }) {
  const off = regular && regular > price ? Math.round(((regular - price) / regular) * 100) : 0;
  const was =
    off > 0
      ? h(
          "div",
          { style: { display: "flex", flexDirection: "column", marginLeft: 18 } },
          row({ fontSize: 26, color: "#a1a1aa", textDecoration: "line-through" }, formatRs(regular)),
          row(
            {
              fontSize: 22,
              fontWeight: 800,
              color: "#ffffff",
              background: RED,
              borderRadius: 8,
              padding: "2px 10px",
              marginTop: 4,
            },
            `${off}% OFF`
          )
        )
      : null;
  return row(
    { width: OG_WIDTH, height: OG_HEIGHT, background: "#ffffff", fontFamily: "Inter" },
    row(
      { width: 630, height: 630, alignItems: "center", justifyContent: "center" },
      photo ? h("img", { src: photo, width: 600, height: 600, alt: "" }) : Wordmark({ size: 56 })
    ),
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 570,
          height: 630,
          background: INK,
          borderLeft: `10px solid ${RED}`,
          padding: "44px 40px 40px 44px",
        },
      },
      Wordmark({}),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        row({ fontSize: 40, fontWeight: 700, color: "#ffffff", lineHeight: 1.18 }, clampText(name, 96)),
        row(
          { alignItems: "center", marginTop: 26 },
          row({ fontSize: 62, fontWeight: 800, color: "#ffffff", letterSpacing: -1 }, formatRs(price)),
          was
        )
      ),
      row(
        { flexWrap: "wrap" },
        Chip(cod ? "Cash on Delivery" : "Secure advance payment"),
        Chip("Delivery all over Pakistan")
      )
    )
  );
}

/**
 * Collection card (site default, category, car hub): text left, real product photos right.
 * @param {{ kicker: string, title: string, sub: string, photos: (string|null)[], cod?: "all"|"some"|"none" }} c
 */
export function CollectionCard({ kicker, title, sub, photos, cod = "some" }) {
  const [a, b, c] = photos;
  const titleSize = title.length > 34 ? 50 : title.length > 22 ? 58 : 66;
  const codText =
    cod === "all" ? "Cash on Delivery" : cod === "none" ? "Secure advance payment" : "COD on eligible items";
  return row(
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      background: INK,
      fontFamily: "Inter",
      borderBottom: `12px solid ${RED}`,
    },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 560,
          height: 618,
          padding: "46px 20px 40px 52px",
        },
      },
      Wordmark({ size: 38 }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column" } },
        row({ fontSize: 24, fontWeight: 800, color: RED, letterSpacing: 2 }, kicker.toUpperCase()),
        row(
          { fontSize: titleSize, fontWeight: 800, color: "#ffffff", lineHeight: 1.05, letterSpacing: -1, marginTop: 12 },
          clampText(title, 52)
        ),
        row({ fontSize: 26, color: "#d4d4d8", marginTop: 16, lineHeight: 1.3 }, clampText(sub, 80))
      ),
      row({ flexWrap: "wrap" }, Chip(codText), Chip("All over Pakistan"))
    ),
    row(
      { alignItems: "center", width: 640, height: 618, paddingRight: 36 },
      Photo(a, 392),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", marginLeft: 16 } },
        Photo(b, 188),
        row({ height: 16 }),
        Photo(c, 188)
      )
    )
  );
}

/** Render element → PNG (Satori/Resvg) → JPEG bytes. */
export async function renderOgJpeg(element) {
  const png = await new ImageResponse(element, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: loadFonts(),
  }).arrayBuffer();
  return sharp(Buffer.from(png)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
}
