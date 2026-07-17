/**
 * Product editor — SEO (collapsible sidebar or static card; meta description 160-char counter).
 */
"use client";

import { SeoField } from "@/components/ui/SeoField";
import { SeoPreview } from "@/components/ui/SeoPreview";
import { richTextPlainPreview } from "@/lib/richTextPlain";

function plainMetaWords(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
}

const GOOGLE_RECOMMENDED_META_WORDS = 25;

function SEOFields({ form, updateFormData, previewUrl, metaWords }) {
  const repeated = (() => {
    const words = String(form.seo?.metaDescription || "").toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || [];
    const freq = words.reduce((m, w) => ((m[w] = (m[w] || 0) + 1), m), {});
    return Object.values(freq).some((n) => n >= 3);
  })();
  const hasAllCaps = /\b[A-Z]{3,}\b/.test(String(form.seo?.metaDescription || ""));
  const noPunctuation = !/[.!?]\s*$/.test(String(form.seo?.metaDescription || "").trim());
  const keyword = (form.seo?.metaKeywords || [])[0];
  const missingKeyword = keyword
    ? !String(form.seo?.metaDescription || "").toLowerCase().includes(String(keyword).toLowerCase())
    : false;

  return (
    <>
      <SeoField
        type="title"
        label="Meta Title"
        value={form.seo.metaTitle}
        onChange={(v) => updateFormData("seo", { ...form.seo, metaTitle: v })}
      />
      <SeoField
        type="description"
        label="Meta Description"
        value={form.seo.metaDescription}
        onChange={(v) => updateFormData("seo", { ...form.seo, metaDescription: v })}
      />
      {repeated || hasAllCaps || missingKeyword || noPunctuation ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <p className="font-semibold">⚠️ Warnings</p>
          {repeated ? <p>- Potential keyword stuffing (same word repeated 3+ times)</p> : null}
          {hasAllCaps ? <p>- Contains ALL CAPS words</p> : null}
          {missingKeyword ? <p>- Missing primary keyword in description</p> : null}
          {noPunctuation ? <p>- Description should end with punctuation</p> : null}
        </div>
      ) : null}
      <SeoField
        type="keywords"
        label="Meta Keywords"
        keywordValue={form.seo.metaKeywords}
        onKeywordChange={(tags) => updateFormData("seo", { ...form.seo, metaKeywords: tags })}
      />
      <SeoPreview
        title={form.seo.metaTitle?.trim() || form.name || "Product title"}
        description={form.seo.metaDescription?.trim() || richTextPlainPreview(form.shortDescription, 180) || "Description preview…"}
        slug={previewUrl?.replace(/^https?:\/\/[^/]+\/?/, "")}
        baseUrl={previewUrl?.match(/^https?:\/\/[^/]+/)?.[0] || "crazzycars.pk"}
      />
      {metaWords > GOOGLE_RECOMMENDED_META_WORDS ? (
        <p className="text-xs font-medium text-amber-600">
          Warning: this is above Google&apos;s usual recommendation (~{GOOGLE_RECOMMENDED_META_WORDS} words). It will still be saved.
        </p>
      ) : null}
    </>
  );
}

export function TabSEO({ form, updateFormData, previewUrl, staticCard = false }) {
  const metaWords = plainMetaWords(form.seo?.metaDescription);

  if (staticCard) {
    return (
      <div className="space-y-4">
        <SEOFields
          form={form}
          updateFormData={updateFormData}
          previewUrl={previewUrl}
          metaWords={metaWords}
        />
      </div>
    );
  }

  return (
    <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-[#111827] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-2">
          <span>SEO</span>
          <span className="text-xs font-normal text-gray-500">Show / hide</span>
        </span>
      </summary>
      <div className="space-y-4 border-t border-gray-200 px-4 py-4">
        <SEOFields
          form={form}
          updateFormData={updateFormData}
          previewUrl={previewUrl}
          metaWords={metaWords}
        />
      </div>
    </details>
  );
}
