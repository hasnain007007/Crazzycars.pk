"use client";

/**
 * Local /media thumb with automatic fallback to the master file when *-400.webp is missing.
 */
export default function LocalMediaImg({
  src,
  master,
  alt = "",
  className = "",
  style,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
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
      className={className}
      style={style}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      sizes={sizes}
      data-master={masterUrl}
      onLoad={onLoad}
      onError={(e) => {
        const img = e.currentTarget;
        const fallback = img.getAttribute("data-master") || "";
        if (fallback && img.getAttribute("src") !== fallback) {
          img.src = fallback;
          return;
        }
        img.removeAttribute("alt");
        img.style.visibility = "hidden";
      }}
    />
  );
}
