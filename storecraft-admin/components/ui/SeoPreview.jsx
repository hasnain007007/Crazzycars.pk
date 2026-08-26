"use client";

export function SeoPreview({ title, description, slug, baseUrl }) {
  const safeTitle = (title || "Untitled page").slice(0, 120);
  const safeDescription = (description || "No description provided.").slice(0, 240);
  const safeSlug = (slug || "products/surgical-steel-nose-ring").replace(/^\/+/, "");
  const host = (baseUrl || "homefy.pk").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const urlLine = `${host}/${safeSlug}`;
  const titleOk = safeTitle.length >= 31 && safeTitle.length <= 60;

  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-white p-4">
      <p className="mb-2 text-xs font-semibold text-[#6b7280]">Preview in Google Search:</p>
      <div className="rounded-md border border-[#e5e7eb] bg-white p-3">
        <p className="text-xs text-[#6b7280]">● {urlLine}</p>
        <p className="mt-1 text-[18px] leading-6 text-[#1a0dab]">{safeTitle}</p>
        <p className="mt-1 line-clamp-3 text-[13px] text-[#545454]">{safeDescription}</p>
      </div>
      <p className={`mt-2 text-xs font-medium ${titleOk ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
        {titleOk ? "✓ Looks good!" : "⚠ Title too long"}
      </p>
    </div>
  );
}
