"use client";

import { isLocalMedia, localMediaDerivative } from "@/lib/cloudinaryImage";

/**
 * Swap a failed thumb to a mid-size derivative — never a multi-MB PNG/JPEG master.
 * Prefer explicit width/height + sizes for CLS; keep plain <img> for /media
 * (avoids /_next/image 400s).
 */
export function applyMasterFallback(img) {
  const current = String(img.getAttribute("src") || "")
    .trim()
    .split("?")[0];
  const configured = String(img.getAttribute("data-master") || "")
    .trim()
    .split("?")[0];
  const base = configured || current;
  const tried = new Set(
    String(img.getAttribute("data-tried") || "")
      .split("|")
      .filter(Boolean)
  );
  if (current) tried.add(current);

  const candidates = [];
  if (isLocalMedia(base) || base.includes("/media/")) {
    // Card/list thumbs: -800 then -400 only. Never jump to the master.
    candidates.push(localMediaDerivative(base, "800"), localMediaDerivative(base, "400"));
  } else if (configured && configured !== current) {
    candidates.push(configured);
  }

  for (const next of candidates) {
    if (!next || tried.has(next)) continue;
    tried.add(next);
    img.setAttribute("data-tried", [...tried].join("|"));
    img.src = next;
    return;
  }

  img.removeAttribute("alt");
  img.style.visibility = "hidden";
}

export default function LocalMediaImg({
  src,
  master,
  alt = "",
  title,
  className = "",
  style,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  width,
  height,
  draggable,
  onLoad,
}) {
  // Prefer a mid derivative as the recovery target so onError never fetches a 2MB+ master.
  const rawMaster = String(master || src || "")
    .trim()
    .split("?")[0];
  const masterUrl =
    isLocalMedia(rawMaster) || rawMaster.includes("/media/")
      ? localMediaDerivative(rawMaster, "800")
      : rawMaster;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      title={title}
      className={className}
      style={style}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      width={width}
      height={height}
      draggable={draggable}
      data-master={masterUrl}
      onLoad={onLoad}
      // A thumb that failed before hydration (e.g. a 404 the browser cached) fires its
      // error event before React listens, so check once the element is attached too.
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
          applyMasterFallback(img);
        }
      }}
      onError={(e) => applyMasterFallback(e.currentTarget)}
    />
  );
}
