"use client";

import { TagInput } from "@/components/ui/TagInput";

function countWords(s) {
  return String(s || "").trim().split(/\s+/).filter(Boolean).length;
}

function progressClass(type, len) {
  if (type === "title") {
    if (len <= 30) return { color: "bg-red-500", msg: "Too short", text: "text-[#dc2626]" };
    if (len <= 60) return { color: "bg-green-500", msg: "Perfect ✓", text: "text-[#16a34a]" };
    if (len <= 70) return { color: "bg-amber-500", msg: "Getting long", text: "text-[#a16207]" };
    return { color: "bg-red-500", msg: "Too long - Google will cut off", text: "text-[#dc2626]" };
  }
  if (len <= 50) return { color: "bg-red-500", msg: "Too short - add more detail", text: "text-[#dc2626]" };
  if (len <= 150) return { color: "bg-amber-500", msg: "Good, can add more", text: "text-[#a16207]" };
  if (len <= 160) return { color: "bg-green-500", msg: "Perfect ✓", text: "text-[#16a34a]" };
  return { color: "bg-red-500", msg: "Too long - Google will truncate", text: "text-[#dc2626]" };
}

export function SeoField({ type, value, onChange, label, keywordValue = [], onKeywordChange }) {
  if (type === "keywords") {
    const count = Array.isArray(keywordValue) ? keywordValue.length : 0;
    const color = count < 5 ? "text-[#a16207]" : count <= 10 ? "text-[#16a34a]" : count > 15 ? "text-[#dc2626]" : "text-[#16a34a]";
    return (
      <div>
        <label className="mb-2 block text-sm font-medium text-[#374151]">{label}</label>
        <TagInput value={keywordValue} onChange={onKeywordChange} placeholder="e.g. car accessories, seat covers, floor mats" />
        <p className={`mt-2 text-xs font-medium ${color}`}>{count} keywords added</p>
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-[#1e3a8a]">
          <p className="font-semibold">ℹ️ SEO Tips:</p>
          <p>- Include product type (seat covers, floor mats, etc.)</p>
          <p>- Include product type (seat covers, floor mats, LED lights)</p>
          <p>- Include size/gauge if relevant</p>
          <p>- Use terms customers search for</p>
        </div>
      </div>
    );
  }

  const len = String(value || "").length;
  const words = countWords(value);
  const max = type === "title" ? 60 : 160;
  const pr = Math.min(100, Math.round((len / max) * 100));
  const state = progressClass(type, len);
  const titleWordColor =
    words < 3 ? "text-[#dc2626]" : words >= 5 && words <= 10 ? "text-[#16a34a]" : words > 10 ? "text-[#a16207]" : "text-[#6b7280]";
  const charsOver = Math.max(0, len - 60);

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#374151]">{label}</label>
      {type === "title" ? (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Premium Leather Seat Covers | Crazzycars.pk"
          className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. Buy premium car accessories online in Pakistan. COD available nationwide."
          rows={4}
          className="w-full resize-y rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm"
        />
      )}
      <p className="mt-1 text-xs text-[#6b7280]">
        {type === "title"
          ? "Include product type, car fitment, and brand. Google recommends 50-60 characters."
          : "Describe the accessory, fitment, and benefits. Include make, model, and material info."}
      </p>
      <div className="mt-2 h-2 w-full rounded bg-[#e5e7eb]">
        <div className={`h-2 rounded transition-all ${state.color}`} style={{ width: `${pr}%` }} />
      </div>
      <p className={`mt-1 text-xs ${state.text}`}>{len}/{max} chars · {state.msg}</p>
      {type === "title" ? (
        <>
          <p className={`mt-1 text-xs font-medium ${titleWordColor}`}>Words: {words} / Recommended: 5-10 words</p>
          {len > 60 ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              ⚠️ Too long! Google will cut off your title at ~60 characters. Current: {len} chars. Remove {charsOver} characters.
            </div>
          ) : len >= 50 && len <= 60 ? (
            <p className="mt-2 text-xs font-medium text-[#16a34a]">✅ Perfect length for Google ({len} chars)</p>
          ) : null}
        </>
      ) : (
        <p className="mt-1 text-xs text-[#6b7280]">Words: {words} (Google recommends 15-30 words)</p>
      )}
    </div>
  );
}
