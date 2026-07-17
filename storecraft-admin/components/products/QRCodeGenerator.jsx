/**
 * Generate product QR codes (PNG/SVG), copy URL, size & color options.
 */
"use client";

import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const SIZES = [
  { id: 128, label: "Small" },
  { id: 256, label: "Medium" },
  { id: 512, label: "Large" },
];

const PRESETS = [
  { id: "bw", label: "Black on White", dark: "#000000", light: "#ffffff" },
  { id: "wb", label: "White on Black", dark: "#ffffff", light: "#000000" },
  { id: "blue", label: "Blue on White", dark: "#1d4ed8", light: "#ffffff" },
  { id: "custom", label: "Custom", dark: null, light: null },
];

export function defaultProductQrUrl(storeUrl, slug) {
  const base = (storeUrl || "https://crazzycars.pk").replace(/\/$/, "");
  const s = (slug || "product").trim() || "product";
  return `${base}/${s}`;
}

/** List / modal: fixed URL, 128px black on white. */
export function ProductQrCompact({ productName, productSlug, storeUrl }) {
  const url = useMemo(() => defaultProductQrUrl(storeUrl, productSlug), [storeUrl, productSlug]);
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url.trim(), { width: 128, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `product-qr-${(productSlug || "product").replace(/[^\w-]+/g, "-")}.png`;
    a.click();
  };

  return (
    <div className="flex flex-col items-center gap-3 p-2">
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="" width={128} height={128} className="rounded border border-[#e5e7eb]" />
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded border border-dashed border-[#e5e7eb] text-xs text-[#6b7280]">
          …
        </div>
      )}
      <p className="max-w-[220px] truncate text-center text-xs text-[#6b7280]">{productName || "Product"}</p>
      <button
        type="button"
        disabled={!dataUrl}
        onClick={downloadPng}
        className="rounded-lg border border-[#1d6fb8] px-3 py-1.5 text-sm font-medium text-[#1d6fb8] hover:bg-[#eff6ff] disabled:opacity-40"
      >
        Download PNG
      </button>
    </div>
  );
}

export function QRCodeGenerator({ productName, productSlug, storeUrl, ean = "", onEanChange }) {
  const initialUrl = useMemo(() => defaultProductQrUrl(storeUrl, productSlug), [storeUrl, productSlug]);
  const [mode, setMode] = useState("url");
  const [linkUrl, setLinkUrl] = useState(initialUrl);
  const [size, setSize] = useState(128);
  const [preset, setPreset] = useState("bw");
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [dataUrl, setDataUrl] = useState("");
  const [svgStr, setSvgStr] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setLinkUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    setDataUrl("");
    setSvgStr("");
  }, [mode]);

  const encoded = useMemo(() => {
    if (mode === "ean") return String(ean || "").trim();
    return linkUrl.trim();
  }, [mode, ean, linkUrl]);

  const slugSafe = (productSlug || "product").replace(/[^\w-]+/g, "-");
  const fileSuffix = mode === "ean" ? "ean" : "url";

  const colors = useMemo(() => {
    const p = PRESETS.find((x) => x.id === preset);
    if (preset === "custom") return { dark: fg, light: bg };
    return { dark: p?.dark || "#000000", light: p?.light || "#ffffff" };
  }, [preset, fg, bg]);

  const runGenerate = useCallback(async () => {
    const text = encoded;
    if (!text) {
      toast.error(mode === "ean" ? "Enter an EAN / GTIN" : "Enter a URL");
      return;
    }
    setGenerating(true);
    try {
      const opts = { width: size, margin: 1, color: { dark: colors.dark, light: colors.light } };
      const [png, svg] = await Promise.all([
        QRCode.toDataURL(text, opts),
        QRCode.toString(text, { type: "svg", ...opts }),
      ]);
      setDataUrl(png);
      setSvgStr(svg);
    } catch (e) {
      toast.error(e?.message || "Could not generate QR code");
      setDataUrl("");
      setSvgStr("");
    } finally {
      setGenerating(false);
    }
  }, [encoded, mode, size, colors.dark, colors.light]);

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `product-qr-${fileSuffix}-${slugSafe}.png`;
    a.click();
  };

  const downloadSvg = () => {
    if (!svgStr) return;
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `product-qr-${fileSuffix}-${slugSafe}.svg`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const copyEncoded = async () => {
    try {
      await navigator.clipboard.writeText(encoded);
      toast.success(mode === "ean" ? "EAN copied" : "URL copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-[#d1d5db] bg-white p-4">
      <h3 className="text-sm font-semibold text-[#111827]">Product QR Code</h3>
      <p className="mt-1 text-xs text-[#6b7280]">Generate a QR code for the product page URL or a manual EAN / GTIN.</p>

      <div className="mt-3">
        <p className="text-xs font-medium text-[#374151]">Encode as</p>
        <div className="mt-1 inline-flex rounded-lg border border-[#e5e7eb] p-0.5">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium",
              mode === "url" ? "bg-[#1d6fb8] text-white" : "text-[#374151] hover:bg-[#f9fafb]",
            ].join(" ")}
          >
            Product URL
          </button>
          <button
            type="button"
            onClick={() => setMode("ean")}
            className={[
              "rounded-md px-3 py-1.5 text-xs font-medium",
              mode === "ean" ? "bg-[#1d6fb8] text-white" : "text-[#374151] hover:bg-[#f9fafb]",
            ].join(" ")}
          >
            EAN (GTIN)
          </button>
        </div>
      </div>

      {mode === "url" ? (
        <>
          <label className="mt-3 block text-xs font-medium text-[#374151]">URL</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm"
            placeholder="https://…"
          />
        </>
      ) : (
        <>
          <label className="mt-3 block text-xs font-medium text-[#374151]">EAN / GTIN (manual)</label>
          <input
            value={ean}
            onChange={(e) => onEanChange?.(e.target.value)}
            className="mt-1 h-10 w-full rounded-lg border border-[#e5e7eb] px-3 text-sm font-mono tabular-nums"
            placeholder="e.g. 5901234123457"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1 text-xs text-[#6b7280]">Saved with the product when you save the editor. Digits only recommended.</p>
        </>
      )}

      <div className="mt-3">
        <p className="text-xs font-medium text-[#374151]">Size</p>
        <div className="mt-1 inline-flex rounded-lg border border-[#e5e7eb] p-0.5">
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSize(s.id)}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-medium",
                size === s.id ? "bg-[#1d6fb8] text-white" : "text-[#374151] hover:bg-[#f9fafb]",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium text-[#374151]">Colors</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium",
                preset === p.id ? "border-[#1d6fb8] bg-[#eff6ff] text-[#1d4ed8]" : "border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-[#6b7280]">
              Foreground
              <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-8 w-10 cursor-pointer rounded border" />
            </label>
            <label className="flex items-center gap-1 text-xs text-[#6b7280]">
              Background
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-8 w-10 cursor-pointer rounded border" />
            </label>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={runGenerate}
        disabled={generating}
        className="mt-4 rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white hover:bg-[#185f9e] disabled:opacity-60"
      >
        {generating ? "Generating…" : "Generate QR Code"}
      </button>

      {dataUrl ? (
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-[#e5e7eb] bg-[#fafafa] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="QR" width={Math.min(size, 256)} height={Math.min(size, 256)} className="max-w-full rounded bg-white p-1" />
          <p className="mt-2 max-w-full truncate text-center text-xs text-[#6b7280]">
            {productName || "Product"}
            {encoded ? <span className="mt-0.5 block font-mono text-[10px] text-[#9ca3af]">{encoded}</span> : null}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={downloadPng} className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]">
              Download PNG
            </button>
            <button type="button" onClick={downloadSvg} className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]">
              Download SVG
            </button>
            <button type="button" onClick={copyEncoded} className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]">
              {mode === "ean" ? "Copy EAN" : "Copy URL"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
