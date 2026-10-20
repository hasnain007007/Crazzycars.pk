"use client";

/**
 * Local /media thumb with automatic fallback to the master when *-400.webp / *-800.webp is missing.
 * Prefer explicit width/height + sizes for CLS; keep plain <img> for /media (avoids /_next/image 400s).
 */
/** Swap a failed thumb to its full-size master (data-master); hide it if that fails too. */
export function applyMasterFallback(img) {
  const fallback = img.getAttribute("data-master") || "";
  if (fallback && img.getAttribute("src") !== fallback) {
    img.src = fallback;
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
  const masterUrl = String(master || src || "")
    .trim()
    .split("?")[0];

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
