/**
 * Full-screen dark-theme image editor (Cloudinary-style). Portaled to document.body.
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function pctSaved(orig, fin) {
  if (!orig || orig <= 0) return 0;
  return Math.round(((orig - fin) / orig) * 100);
}

function filenameFromUrl(url) {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const seg = decodeURIComponent(u.pathname.split("/").pop() || "image");
    return seg.split("?")[0] || "image.webp";
  } catch {
    return "image.webp";
  }
}

function cloudinaryTransformUrl(url, { brightness = 0, contrast = 0 }) {
  if (!url || typeof url !== "string") return url;
  const parts = [];
  if (brightness)
    parts.push(`e_brightness:${Math.round(Math.max(-99, Math.min(99, Number(brightness) || 0)))}`);
  if (contrast) parts.push(`e_contrast:${Math.round(Math.max(-99, Math.min(99, Number(contrast) || 0)))}`);
  if (!parts.length) return url;
  const chain = parts.join(",");
  const idx = url.search(/\/upload\//i);
  if (idx === -1) return url;
  const at = idx + "/upload/".length;
  return `${url.slice(0, at)}${chain}/${url.slice(at)}`;
}

function isCloudinaryDeliveryUrl(url) {
  return typeof url === "string" && /cloudinary\.com/i.test(url) && /\/upload\//i.test(url);
}

function cloudinaryUploadHead(url) {
  const idx = url.search(/\/upload\//i);
  if (idx === -1) return url;
  return url.slice(0, idx + "/upload/".length);
}

function cloudinaryTailAfterUpload(url) {
  const idx = url.search(/\/upload\//i);
  if (idx === -1) return "";
  return url.slice(idx + "/upload/".length);
}

function stripLeadingTransformSegments(tail) {
  const parts = tail.split("/").filter(Boolean);
  let i = 0;
  const isTransform = (p) => {
    if (/^v\d+/i.test(p)) return false;
    if (p.includes(",")) return true;
    if (/^(e_|b_|c_|w_|h_|a_|q_|f_|fl_|t_|d_|o_|x_|y_|so_|pg_|co_|e)/i.test(p)) return true;
    if (/^[a-z]{1,2}_\d+/i.test(p)) return true;
    return false;
  };
  while (i < parts.length && isTransform(parts[i])) i += 1;
  return parts.slice(i).join("/");
}

/** Insert/replace transformation chain immediately after /upload/ */
function cloudinaryComposeAfterUpload(url, chain) {
  if (!isCloudinaryDeliveryUrl(url)) return url;
  const head = cloudinaryUploadHead(url);
  const tail = cloudinaryTailAfterUpload(url);
  const rest = stripLeadingTransformSegments(tail);
  const c = String(chain || "").replace(/\/+$/, "").replace(/^\/+/, "");
  if (!c) return `${head}${rest}`;
  return `${head}${c}/${rest}`;
}

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("Image failed to load"));
    im.src = url;
  });
}

/** Flip using HTMLImageElement + canvas (reliable CORS for Cloudinary vs fetch+ImageBitmap). */
async function flipUrlToWebpFile(url, direction) {
  const im = await loadHtmlImage(url);
  const w = im.naturalWidth;
  const h = im.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  if (direction === "H") {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, h);
    ctx.scale(1, -1);
  }
  ctx.drawImage(im, 0, 0);
  return canvasToWebpFile(canvas, "flipped.webp");
}

async function rotateUrlToWebpFile(url, degrees) {
  const im = await loadHtmlImage(url);
  const w0 = im.naturalWidth;
  const h0 = im.naturalHeight;
  const rad = (degrees * Math.PI) / 180;
  const swap = Math.abs(degrees) % 180 === 90;
  const w = swap ? h0 : w0;
  const h = swap ? w0 : h0;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(im, -w0 / 2, -h0 / 2);
  return canvasToWebpFile(canvas, "rotated.webp");
}

function loadHtmlImage(url) {
  return new Promise((resolve, reject) => {
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = url;
  });
}

async function canvasToWebpFile(canvas, name = "edit.webp") {
  const blob = await new Promise((res) => canvas.toBlob((b) => res(b), "image/webp", 0.92));
  if (!blob) throw new Error("Encode failed");
  return new File([blob], name, { type: "image/webp" });
}

function drawTextWatermark(ctx, width, height, text) {
  if (!text?.trim()) return;
  const label = text.trim();
  const fontSize = Math.max(16, width * 0.04);
  const padding = width * 0.02;
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
  ctx.lineWidth = fontSize * 0.08;
  const textWidth = ctx.measureText(label).width;
  const x = width - textWidth - padding;
  const y = height - padding;
  ctx.strokeText(label, x, y);
  ctx.fillText(label, x, y);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.font = `bold ${fontSize * 2}px Arial`;
  ctx.fillStyle = "white";
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 4);
  const diagWidth = ctx.measureText(label).width;
  ctx.fillText(label, -diagWidth / 2, 0);
  ctx.restore();
}

async function resizeUrlToDimensionsFile(url, targetW, targetH, lockAspect) {
  const im = await loadHtmlImage(url);
  let tw = Math.max(1, Math.round(Number(targetW) || 1));
  let th = Math.max(1, Math.round(Number(targetH) || 1));
  if (lockAspect) {
    const r = im.naturalWidth / Math.max(1, im.naturalHeight);
    th = Math.max(1, Math.round(tw / r));
  }
  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  ctx.drawImage(im, 0, 0, tw, th);
  return canvasToWebpFile(canvas, "resize.webp");
}

async function compositeImageOnColorFile(url, colorKeyOrHex) {
  const im = await loadHtmlImage(url);
  const w = im.naturalWidth;
  const h = im.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  const palette = {
    transparent: null,
    verydark: "#111111",
    dark: "#1a1a1a",
    gray: "#888888",
    light: "#cccccc",
    white: "#ffffff",
    red: "#ef4444",
    yellow: "#eab308",
    green: "#22c55e",
    cyan: "#06b6d4",
    blue: "#3b82f6",
    magenta: "#d946ef",
  };
  const hex =
    typeof colorKeyOrHex === "string" && colorKeyOrHex.startsWith("#")
      ? colorKeyOrHex
      : palette[colorKeyOrHex];
  if (hex) {
    ctx.fillStyle = hex;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(im, 0, 0);
  return canvasToWebpFile(canvas, "bg.webp");
}

function swatchToCloudinaryBToken(key, customHex) {
  if (key === "transparent") return null;
  if (typeof key === "string" && key.startsWith("#")) {
    const h = key.replace(/^#/, "").slice(0, 6);
    return h.length === 6 ? `b_rgb:${h}` : null;
  }
  const named = {
    white: "b_white",
    red: "b_red",
    yellow: "b_rgb:eab308",
    green: "b_rgb:22c55e",
    cyan: "b_rgb:06b6d4",
    blue: "b_rgb:3b82f6",
    magenta: "b_rgb:d946ef",
    verydark: "b_rgb:111111",
    dark: "b_rgb:1a1a1a",
    gray: "b_rgb:888888",
    light: "b_rgb:cccccc",
  };
  if (named[key]) return named[key];
  if (customHex) return `b_rgb:${String(customHex).replace(/^#/, "").slice(0, 6)}`;
  return null;
}

const CHECKERBOARD =
  "repeating-conic-gradient(#333 0% 25%, #222 0% 50%) 0 0 / 20px 20px";

/** Human-readable crop aspect + orientation for the panel (CropModal uses the same orientation). */
function aspectRatioLabel(preset, orient) {
  const o = orient === "portrait" ? "Portrait" : "Landscape";
  if (!preset || preset === "freeform" || preset === "free") return `Freeform (${o})`;
  if (preset === "original") return `Original (${o})`;
  if (preset === "1") return `1:1 (${o})`;
  if (orient === "portrait") {
    const map = { "3/2": "2:3", "5/4": "4:5", "7/5": "5:7", "16/9": "9:16" };
    return `${map[preset] || preset} (${o})`;
  }
  const map = { "3/2": "3:2", "5/4": "5:4", "7/5": "7:5", "16/9": "16:9" };
  return `${map[preset] || preset} (${o})`;
}

function computeCloudinaryBgFinalUrl(sourceUrl, colorKey, customHex) {
  if (!isCloudinaryDeliveryUrl(sourceUrl)) return null;
  let bTok = null;
  if (colorKey === "custom") {
    const hex = String(customHex || "").replace(/^#/, "").slice(0, 6);
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    bTok = `b_rgb:${hex}`;
  } else {
    bTok = swatchToCloudinaryBToken(colorKey, null);
  }
  const chain = bTok ? `e_background_removal,${bTok}` : "e_background_removal";
  return cloudinaryComposeAfterUpload(sourceUrl, chain);
}

const MONO_SWATCHES = [
  { key: "transparent", label: "Transparent", css: null, checker: true },
  { key: "verydark", label: "Very dark", css: "#111111" },
  { key: "dark", label: "Dark", css: "#1a1a1a" },
  { key: "gray", label: "Gray", css: "#888888" },
  { key: "light", label: "Light", css: "#cccccc" },
  { key: "white", label: "White", css: "#ffffff" },
];

const STD_SWATCHES = [
  { key: "red", label: "Red", css: "#ef4444" },
  { key: "yellow", label: "Yellow", css: "#eab308" },
  { key: "green", label: "Green", css: "#22c55e" },
  { key: "cyan", label: "Cyan", css: "#06b6d4" },
  { key: "blue", label: "Blue", css: "#3b82f6" },
  { key: "magenta", label: "Magenta", css: "#d946ef" },
];

function selectionLabel(key, customHex) {
  if (!key) return "";
  if (key === "custom") {
    const h = String(customHex || "").replace(/^#/, "").toUpperCase();
    return h ? `#${h.slice(0, 6)}` : "Custom";
  }
  const all = [...MONO_SWATCHES, ...STD_SWATCHES];
  const f = all.find((s) => s.key === key);
  return f?.label || key;
}

function DarkSection({ title, expanded, onToggle, children }) {
  return (
    <div className="border-b border-[#2a2a2a]">
      <button
        type="button"
        className="flex w-full items-center justify-between bg-[#1a1a1a] px-3 py-2.5 text-left transition hover:bg-[#2a2a2a]"
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-white">{title}</span>
        <span className="text-[#aaaaaa]">{expanded ? "▼" : "▶"}</span>
      </button>
      {expanded ? <div className="space-y-3 border-t border-[#2a2a2a] bg-[#1a1a1a] px-3 py-3">{children}</div> : null}
    </div>
  );
}

const inputDark = "w-full rounded border border-[#333333] bg-[#2a2a2a] px-2.5 py-2 text-sm text-white placeholder:text-[#666] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]";
const btnDark = "rounded border border-[#333333] bg-[#333333] px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-[#444444]";
const btnDarkActive = "border-[#3b82f6] bg-[#1e3a5f] text-white";

export function FullScreenImageEditor({
  items,
  index,
  onNavigateIndex,
  cropModalOpen = false,
  onClose,
  onSetMain,
  onRemove,
  replaceAtIndexWithFile,
  onUpdateItem,
  onRequestCrop,
  enableWatermark,
  hideWatermarkToolbar,
  watermarkEnabled,
  setWatermarkEnabled,
  watermarkText,
  setWatermarkText,
  usageContext,
  /** True while ImageUploader is processing upload/WebP pipeline (replaceAtIndexWithFile). */
  galleryProcessing = false,
}) {
  const item = items[index];
  const total = items.length;
  const imgRef = useRef(null);
  const overlayRef = useRef(null);
  const drawCtxRef = useRef(null);

  const [workingUrl, setWorkingUrl] = useState(item?.url || "");
  const [imgDims, setImgDims] = useState({ w: null, h: null });
  const [busy, setBusy] = useState(false);
  const [overlayMsg, setOverlayMsg] = useState("");
  const [cropOrient, setCropOrient] = useState("landscape");
  const [cropAspect, setCropAspect] = useState("freeform");
  const [resizeW, setResizeW] = useState("");
  const [resizeH, setResizeH] = useState("");
  const [lockResizeAspect, setLockResizeAspect] = useState(true);
  const [bright, setBright] = useState(0);
  const [cont, setCont] = useState(0);
  const [sections, setSections] = useState({
    info: true,
    crop: false,
    resize: false,
    draw: false,
    color: false,
  });
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState("#3b82f6");
  const [drawing, setDrawing] = useState(false);
  const lastPoint = useRef(null);
  /** Color-background section: selection previews URL; Apply commits. */
  const [bgSelectedKey, setBgSelectedKey] = useState(null);
  const [bgHexInput, setBgHexInput] = useState("FFFFFF");
  const [bgCustomHex, setBgCustomHex] = useState("#ffffff");
  const pickerRef = useRef(null);

  const cropAspectLabel = useMemo(() => aspectRatioLabel(cropAspect, cropOrient), [cropAspect, cropOrient]);

  const bgPreviewUrl = useMemo(() => {
    const src = item?.url || "";
    if (!bgSelectedKey || !isCloudinaryDeliveryUrl(src)) return null;
    if (bgSelectedKey === "custom") {
      const hex = String(bgHexInput || "").replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
      if (hex.length !== 6) return null;
      return computeCloudinaryBgFinalUrl(src, "custom", `#${hex}`);
    }
    return computeCloudinaryBgFinalUrl(src, bgSelectedKey, null);
  }, [item?.url, bgSelectedKey, bgHexInput]);

  const orientBtnActive = "rounded border border-transparent bg-blue-600 px-3 py-1.5 text-xs font-medium text-white";
  const orientBtnInactive =
    "rounded border border-[#333333] bg-[#333333] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#444444]";

  const selectedTileStyle = useMemo(() => {
    if (!bgSelectedKey) return { backgroundColor: "#333333" };
    if (bgSelectedKey === "transparent") return { backgroundImage: CHECKERBOARD, backgroundColor: "transparent" };
    if (bgSelectedKey === "custom") return { backgroundColor: bgCustomHex };
    const f = [...MONO_SWATCHES, ...STD_SWATCHES].find((s) => s.key === bgSelectedKey);
    return { backgroundColor: f?.css || "#333333" };
  }, [bgSelectedKey, bgCustomHex]);

  const baseUrl = item?.url || "";
  const previewEnhanceUrl = useMemo(() => cloudinaryTransformUrl(workingUrl, { brightness: bright, contrast: cont }), [workingUrl, bright, cont]);
  const displayUrl = previewEnhanceUrl;

  const getSourceUrl = () => (workingUrl || baseUrl || item?.url || "").trim();
  const opsLocked = busy || Boolean(overlayMsg) || Boolean(galleryProcessing);

  useEffect(() => {
    setWorkingUrl(item?.url || "");
    setBright(0);
    setCont(0);
    setBgSelectedKey(null);
    setBgHexInput("FFFFFF");
    setBgCustomHex("#ffffff");
  }, [item?.url, index]);

  useEffect(() => {
    if (!displayUrl) return;
    const im = new window.Image();
    im.crossOrigin = "anonymous";
    im.onload = () => setImgDims({ w: im.naturalWidth, h: im.naturalHeight });
    im.src = displayUrl;
  }, [displayUrl]);

  useEffect(() => {
    const w = item?.width || imgDims.w;
    const h = item?.height || imgDims.h;
    if (w && h) {
      setResizeW(String(w));
      setResizeH(String(h));
    }
  }, [item?.width, item?.height, imgDims.w, imgDims.h]);

  const naturalW = Number(imgDims.w) || Number(item?.width) || 0;
  const naturalH = Number(imgDims.h) || Number(item?.height) || 0;
  const resizeRatio = naturalW > 0 && naturalH > 0 ? naturalW / naturalH : null;

  useEffect(() => {
    if (cropModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, cropModalOpen]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!sections.draw || !overlayRef.current || !imgRef.current) return;
    const canvas = overlayRef.current;
    const img = imgRef.current;
    const sync = () => {
      const wCss = img.clientWidth;
      const hCss = img.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(wCss * dpr));
      const h = Math.max(1, Math.round(hCss * dpr));
      canvas.style.width = `${wCss}px`;
      canvas.style.height = `${hCss}px`;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      drawCtxRef.current = canvas.getContext("2d");
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(img);
    return () => ro.disconnect();
  }, [sections.draw, displayUrl, index]);

  const mapPanelAspectToPreset = (a) => (a === "freeform" ? "freeform" : a);

  const openCropEditor = () => {
    const url = getSourceUrl();
    if (!url) {
      toast.error("No image to crop");
      return;
    }
    if (typeof onRequestCrop !== "function") {
      toast.error("Crop is unavailable.");
      return;
    }
    onRequestCrop({
      aspectPreset: mapPanelAspectToPreset(cropAspect),
      orientation: cropOrient,
      sourceUrl: url,
    });
  };

  const handleRotate = async (deg) => {
    const url = getSourceUrl();
    if (!url) {
      toast.error("No image to rotate");
      return;
    }
    setBusy(true);
    try {
      const file = await rotateUrlToWebpFile(url, deg);
      await replaceAtIndexWithFile(index, file, { silent: true });
      toast.success(deg > 0 ? "Rotated 90° right" : "Rotated 90° left");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Rotation failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFlip = async (direction) => {
    const url = getSourceUrl();
    if (!url) {
      toast.error("No image to flip");
      return;
    }
    setBusy(true);
    try {
      const file = await flipUrlToWebpFile(url, direction);
      await replaceAtIndexWithFile(index, file, { silent: true });
      toast.success(direction === "H" ? "Flipped horizontally" : "Flipped vertically");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Flip failed");
    } finally {
      setBusy(false);
    }
  };

  const onResizeWChange = (v) => {
    setResizeW(v);
    if (lockResizeAspect && resizeRatio) {
      const n = Math.max(1, Math.round(Number(v) || 0));
      setResizeH(String(Math.max(1, Math.round(n / resizeRatio))));
    }
  };

  const onResizeHChange = (v) => {
    setResizeH(v);
    if (lockResizeAspect && resizeRatio) {
      const n = Math.max(1, Math.round(Number(v) || 0));
      setResizeW(String(Math.max(1, Math.round(n * resizeRatio))));
    }
  };

  const applyResize = async () => {
    const url = getSourceUrl();
    if (!url) {
      toast.error("No image to resize");
      return;
    }
    const w = parseInt(String(resizeW), 10);
    const h = parseInt(String(resizeH), 10);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      toast.error("Enter valid dimensions");
      return;
    }
    setBusy(true);
    try {
      const file = await resizeUrlToDimensionsFile(url, w, h, lockResizeAspect);
      await replaceAtIndexWithFile(index, file, { silent: true });
      toast.success(`Resized to ${w}×${h}px`);
    } catch (e) {
      console.error(e);
      toast.error(`Resize failed: ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const selectBgSwatch = (key, hexSync) => {
    setBgSelectedKey(key);
    if (hexSync && typeof hexSync === "string" && /^#[0-9a-fA-F]{6}$/.test(hexSync)) {
      setBgCustomHex(hexSync);
      setBgHexInput(hexSync.slice(1).toUpperCase());
    }
  };

  const applyColorBackgroundSave = async () => {
    if (!bgSelectedKey) {
      toast.error("Select a background first.");
      return;
    }
    const source = item.url;
    if (isCloudinaryDeliveryUrl(source)) {
      const url =
        bgSelectedKey === "custom"
          ? computeCloudinaryBgFinalUrl(source, "custom", `#${String(bgHexInput).replace(/[^0-9a-fA-F]/g, "").slice(0, 6)}`)
          : computeCloudinaryBgFinalUrl(source, bgSelectedKey, null);
      if (!url) {
        toast.error("Enter a valid 6-digit hex color.");
        return;
      }
      setOverlayMsg("Applying…");
      try {
        await preloadImage(url);
        onUpdateItem?.({ url });
        setWorkingUrl(url);
        toast.success("Applied! ✓");
      } catch (e) {
        console.error(e);
        toast.error(e?.message || "Failed to apply URL.");
      } finally {
        setOverlayMsg("");
      }
      return;
    }
    if (bgSelectedKey === "transparent") {
      toast("Transparent background uses Cloudinary removal on hosted images.");
      return;
    }
    setBusy(true);
    try {
      const keyOrHex = bgSelectedKey === "custom" ? bgCustomHex : bgSelectedKey;
      const file = await compositeImageOnColorFile(workingUrl || source, keyOrHex);
      await replaceAtIndexWithFile(index, file, { silent: true });
      toast.success("Applied! ✓");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onBgHexTextChange = (raw) => {
    const hex = String(raw || "")
      .replace(/^#/, "")
      .replace(/[^0-9a-fA-F]/g, "")
      .slice(0, 6)
      .toUpperCase();
    setBgHexInput(hex);
    if (hex.length === 6) {
      setBgCustomHex(`#${hex.toLowerCase()}`);
      setBgSelectedKey("custom");
    }
  };

  const onBgPickerChange = (hexFull) => {
    const h = String(hexFull || "#000000");
    setBgCustomHex(h);
    setBgHexInput(h.replace(/^#/, "").toUpperCase().slice(0, 6));
    setBgSelectedKey("custom");
  };

  const applyDrawing = async () => {
    const url = getSourceUrl();
    if (!url) {
      toast.error("No image to apply drawing to");
      return;
    }
    const canvas = overlayRef.current;
    const ctx = drawCtxRef.current;
    if (!canvas || !ctx) {
      toast.error("Draw layer missing");
      return;
    }
    const baseForMerge = displayUrl || url;
    if (!baseForMerge) {
      toast.error("No preview image to merge");
      return;
    }
    setBusy(true);
    try {
      const im = await loadHtmlImage(baseForMerge);
      const out = document.createElement("canvas");
      out.width = im.naturalWidth;
      out.height = im.naturalHeight;
      const ox = out.getContext("2d");
      if (!ox) throw new Error("Canvas");
      ox.drawImage(im, 0, 0);
      ox.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, out.width, out.height);
      const file = await canvasToWebpFile(out, "draw.webp");
      await replaceAtIndexWithFile(index, file, { silent: true });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      toast.success("Drawing applied!");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to apply drawing");
    } finally {
      setBusy(false);
    }
  };

  const applyEnhance = async () => {
    const url = getSourceUrl();
    if (!url) {
      toast.error("No image to enhance");
      return;
    }
    setBusy(true);
    try {
      const im = await loadHtmlImage(url);
      const out = document.createElement("canvas");
      out.width = im.naturalWidth;
      out.height = im.naturalHeight;
      const ox = out.getContext("2d");
      if (!ox) throw new Error("Canvas unsupported");
      const bFactor = 1 + (Number(bright) || 0) / 100;
      const cFactor = 1 + (Number(cont) || 0) / 100;
      ox.filter = `brightness(${Math.max(0.1, bFactor)}) contrast(${Math.max(0.1, cFactor)})`;
      ox.drawImage(im, 0, 0, out.width, out.height);
      ox.filter = "none";
      if (enableWatermark && watermarkEnabled) {
        const wm = watermarkText || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'}`;
        drawTextWatermark(ox, out.width, out.height, wm);
      }
      const file = await canvasToWebpFile(out, "enhanced.webp");
      await replaceAtIndexWithFile(index, file, { silent: true });
      setBright(0);
      setCont(0);
      toast.success("Enhancements applied.");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Enhance failed");
    } finally {
      setBusy(false);
    }
  };

  const clearDrawing = () => {
    const c = overlayRef.current;
    const ctx = drawCtxRef.current;
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  };

  const drawLine = (x0, y0, x1, y1) => {
    const ctx = drawCtxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = Math.max(1, brushSize * (window.devicePixelRatio || 1));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  };

  const onOverlayPointerDown = (e) => {
    if (!sections.draw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
    const y = (e.clientY - rect.top) * (window.devicePixelRatio || 1);
    lastPoint.current = { x, y };
  };

  const onOverlayPointerMove = (e) => {
    if (!drawing || !sections.draw) return;
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect || !lastPoint.current) return;
    const x = (e.clientX - rect.left) * (window.devicePixelRatio || 1);
    const y = (e.clientY - rect.top) * (window.devicePixelRatio || 1);
    drawLine(lastPoint.current.x, lastPoint.current.y, x, y);
    lastPoint.current = { x, y };
  };

  const onOverlayPointerUp = () => {
    setDrawing(false);
    lastPoint.current = null;
  };

  const onFocalClick = (e) => {
    if (sections.draw) return;
    if (e.target !== imgRef.current) return;
    const img = imgRef.current;
    const ir = img.getBoundingClientRect();
    const cx = e.clientX - ir.left;
    const cy = e.clientY - ir.top;
    if (cx < 0 || cy < 0 || cx > ir.width || cy > ir.height) return;
    const xPct = Math.round((cx / ir.width) * 1000) / 10;
    const yPct = Math.round((cy / ir.height) * 1000) / 10;
    onUpdateItem?.({ focalPoint: { x: Math.min(100, Math.max(0, xPct)), y: Math.min(100, Math.max(0, yPct)) } });
  };

  const toggle = (key) => () => setSections((s) => ({ ...s, [key]: !s[key] }));

  const displayName = (item?.imageName && String(item.imageName).trim()) || filenameFromUrl(baseUrl);
  const fp = item?.focalPoint;
  const saved = item?.originalSize != null && item?.finalSize != null ? pctSaved(item.originalSize, item.finalSize) : null;
  const usedN = usageContext?.usedInProducts ?? 1;
  const addedLabel = usageContext?.addedAtLabel ?? "—";

  const goPrev = () => {
    if (index <= 0) return;
    onNavigateIndex?.(index - 1);
  };
  const goNext = () => {
    if (index >= total - 1) return;
    onNavigateIndex?.(index + 1);
  };

  if (!item) return null;

  const ui = (
    <div
      className="fixed inset-0 flex text-[#e5e5e5]"
      style={{ zIndex: 10000, width: "100vw", height: "100vh", backgroundColor: "#111111" }}
      role="dialog"
      aria-modal="true"
      aria-label="Image editor"
    >
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <button
              type="button"
              className="flex shrink-0 items-center gap-2 rounded px-2 py-1.5 text-sm text-white hover:bg-[#2a2a2a]"
              onClick={onClose}
            >
              <span className="text-lg">←</span>
              <span>Back</span>
            </button>
            <span className="truncate text-sm text-[#aaaaaa]">
              {displayName} · {index + 1} of {total}
            </span>
          </div>
          {total > 1 ? (
            <div className="flex shrink-0 gap-1">
              <button type="button" disabled={index <= 0} className={`${btnDark} disabled:opacity-30`} onClick={goPrev}>
                &lt;
              </button>
              <button type="button" disabled={index >= total - 1} className={`${btnDark} disabled:opacity-30`} onClick={goNext}>
                &gt;
              </button>
            </div>
          ) : null}
        </div>

        <div
          className="relative flex min-h-0 flex-1 cursor-default items-center justify-center pt-14"
          style={{ background: CHECKERBOARD }}
          role="presentation"
        >
          <div className="relative inline-block max-h-[calc(100vh-120px)] max-w-[calc(100vw-340px)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={displayUrl}
              alt=""
              crossOrigin="anonymous"
              className={`relative z-0 block max-h-[calc(100vh-120px)] max-w-[calc(100vw-340px)] object-contain transition-opacity duration-300 ${sections.draw ? "cursor-default" : "cursor-crosshair"}`}
              style={{ opacity: opsLocked ? 0.65 : 1 }}
              draggable={false}
              onClick={onFocalClick}
            />
            {sections.draw ? (
              <canvas
                ref={overlayRef}
                className="pointer-events-auto absolute left-0 top-0 z-10 touch-none"
                onPointerDown={onOverlayPointerDown}
                onPointerMove={onOverlayPointerMove}
                onPointerUp={onOverlayPointerUp}
                onPointerLeave={onOverlayPointerUp}
                onClick={(e) => e.stopPropagation()}
              />
            ) : null}
            {fp && typeof fp.x === "number" && typeof fp.y === "number" && !sections.draw ? (
              <div
                className="pointer-events-none absolute z-[5] h-3 w-3 rounded-full border-2 border-white bg-[#3b82f6] shadow"
                style={{ left: `${fp.x}%`, top: `${fp.y}%`, transform: "translate(-50%, -50%)" }}
              />
            ) : null}
          </div>
          {overlayMsg || busy || galleryProcessing ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
              <div className="flex flex-col items-center gap-2 rounded-lg bg-[#1a1a1a] px-5 py-4 text-center text-sm text-white shadow-lg">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
                <span>{overlayMsg || "Processing…"}</span>
              </div>
            </div>
          ) : null}
        </div>
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 text-center text-xs text-[#888]">
          Click image to set focal point
          {sections.draw ? " (disabled while Draw section is open)" : ""}
        </p>
      </div>

      <aside
        className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-[#2a2a2a] bg-[#1a1a1a]"
        style={{ maxWidth: "100vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#2a2a2a] px-3 py-3">
          <h2 className="text-sm font-semibold text-white">Edit Image</h2>
          <button
            type="button"
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded text-[#aaa] hover:bg-[#2a2a2a] hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <DarkSection title="① Information" expanded={sections.info} onToggle={toggle("info")}>
            <label className="block text-xs text-[#aaaaaa]">Name</label>
            <input
              type="text"
              value={item.imageName ?? ""}
              onChange={(e) => onUpdateItem?.({ imageName: e.target.value })}
              className={`${inputDark} mt-1`}
              placeholder={displayName}
            />
            <label className="mt-3 block text-xs text-[#aaaaaa]">Alt text</label>
            <input
              type="text"
              value={item.altText ?? ""}
              onChange={(e) => onUpdateItem?.({ altText: e.target.value })}
              className={`${inputDark} mt-1`}
              placeholder="Describe for SEO"
            />
            <div className="mt-3 space-y-1 border-t border-[#2a2a2a] pt-3 text-xs text-[#aaaaaa]">
              <p>
                WEBP · {imgDims.w != null && imgDims.h != null ? `${imgDims.w}×${imgDims.h}` : "—"} ·{" "}
                {item.originalSize != null && item.finalSize != null
                  ? `${formatBytes(item.finalSize)}${saved != null ? ` (${saved}% saved)` : ""}`
                  : "—"}
              </p>
              <p>Added {addedLabel}</p>
              <p>
                Used in Products ({usedN})
              </p>
            </div>
          </DarkSection>

          <DarkSection title="② Crop and transform" expanded={sections.crop} onToggle={toggle("crop")}>
            <p className="text-xs text-[#888]">Orientation</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCropOrient("landscape")}
                className={cropOrient === "landscape" ? orientBtnActive : orientBtnInactive}
              >
                □ Landscape
              </button>
              <button
                type="button"
                onClick={() => setCropOrient("portrait")}
                className={cropOrient === "portrait" ? orientBtnActive : orientBtnInactive}
              >
                □ Portrait
              </button>
            </div>
            <p className="mt-2 rounded bg-[#2a2a2a] px-2 py-1.5 text-center text-xs font-medium text-[#93c5fd]">{cropAspectLabel}</p>
            <p className="mt-2 text-xs text-[#888]">Aspect</p>
            <div className="flex flex-wrap gap-1">
              {["original", "1", "3/2", "5/4", "7/5", "16/9", "freeform"].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCropAspect(id)}
                  className={`${btnDark} px-1.5 ${cropAspect === id ? btnDarkActive : ""}`}
                >
                  {id === "1" ? "Square" : id === "freeform" ? "Freeform" : id}
                </button>
              ))}
            </div>
            <button type="button" disabled={opsLocked} className={`${btnDark} w-full bg-[#3b82f6] hover:bg-[#2563eb]`} onClick={openCropEditor}>
              Apply
            </button>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={opsLocked} className={btnDark} onClick={() => handleFlip("H")}>
                ▷ H
              </button>
              <button type="button" disabled={opsLocked} className={btnDark} onClick={() => handleFlip("V")}>
                △ V
              </button>
              <button type="button" disabled={opsLocked} className={btnDark} onClick={() => handleRotate(-90)}>
                ↺ 90°L
              </button>
              <button type="button" disabled={opsLocked} className={btnDark} onClick={() => handleRotate(90)}>
                ↻ 90°R
              </button>
            </div>
          </DarkSection>

          <DarkSection title="③ Resize" expanded={sections.resize} onToggle={toggle("resize")}>
            <div className="flex flex-wrap items-end gap-2 text-xs text-[#aaa]">
              <div>
                <label className="text-[#888]">W</label>
                <input type="number" min={1} value={resizeW} onChange={(e) => onResizeWChange(e.target.value)} className={`${inputDark} mt-0.5 w-24`} />
                <span className="text-[#666]"> px</span>
              </div>
              <button
                type="button"
                className="mb-1 rounded border border-[#333] px-2 py-1 text-base leading-none hover:bg-[#333]"
                title={lockResizeAspect ? "Aspect locked" : "Aspect unlocked"}
                onClick={() => setLockResizeAspect((x) => !x)}
              >
                {lockResizeAspect ? "🔒" : "🔓"}
              </button>
              <div>
                <label className="text-[#888]">H</label>
                <input type="number" min={1} value={resizeH} onChange={(e) => onResizeHChange(e.target.value)} className={`${inputDark} mt-0.5 w-24`} />
                <span className="text-[#666]"> px</span>
              </div>
            </div>
            <button type="button" disabled={opsLocked} className={`${btnDark} w-full bg-[#3b82f6] hover:bg-[#2563eb]`} onClick={applyResize}>
              Apply resize
            </button>
          </DarkSection>

          <DarkSection title="④ Draw" expanded={sections.draw} onToggle={toggle("draw")}>
            <label className="text-xs text-[#888]">Brush size</label>
            <input
              type="range"
              min={1}
              max={48}
              value={brushSize}
              disabled={opsLocked}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full"
            />
            <label className="text-xs text-[#888]">Color</label>
            <input
              type="color"
              value={brushColor}
              disabled={opsLocked}
              onChange={(e) => setBrushColor(e.target.value)}
              className="h-9 w-full cursor-pointer rounded border border-[#333] bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button type="button" disabled={opsLocked} className={`${btnDark} w-full`} onClick={clearDrawing}>
              Clear drawing
            </button>
            <button type="button" disabled={opsLocked} className={`${btnDark} w-full bg-[#3b82f6] hover:bg-[#2563eb]`} onClick={applyDrawing}>
              Apply drawing
            </button>
          </DarkSection>

          <DarkSection title="⑤ 🎨 Color background" expanded={sections.color} onToggle={toggle("color")}>
            <p className="text-xs text-[#888]">Pick a color for preview. Apply saves (Cloudinary URL or canvas upload).</p>
            <p className="text-xs font-medium text-[#ccc]">Monochrome</p>
            <div className="flex flex-wrap gap-2">
              {MONO_SWATCHES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  title={s.label}
                  disabled={opsLocked}
                  onClick={() => selectBgSwatch(s.key, s.css)}
                  className={[
                    "shrink-0 border-2 transition",
                    bgSelectedKey === s.key ? "border-[#3b82f6]" : "border-transparent hover:border-[#555]",
                  ].join(" ")}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: s.checker ? undefined : s.css,
                    backgroundImage: s.checker ? CHECKERBOARD : undefined,
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-[#ccc]">Standard colors</p>
            <div className="flex flex-wrap gap-2">
              {STD_SWATCHES.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  title={s.label}
                  disabled={opsLocked}
                  onClick={() => selectBgSwatch(s.key, s.css)}
                  className={[
                    "shrink-0 border-2 transition",
                    bgSelectedKey === s.key ? "border-[#3b82f6]" : "border-transparent hover:border-[#555]",
                  ].join(" ")}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: s.css,
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-xs font-medium text-[#ccc]">Custom color</p>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-[#aaa]">#</span>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                maxLength={6}
                value={bgHexInput}
                disabled={opsLocked}
                onChange={(e) => onBgHexTextChange(e.target.value)}
                placeholder="FF5733"
                className={`${inputDark} flex-1 font-mono uppercase`}
              />
              <label
                className="relative flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border-2 border-[#444444]"
                style={{ backgroundColor: bgCustomHex }}
                title="Open color picker"
              >
                <input
                  ref={pickerRef}
                  type="color"
                  value={bgCustomHex}
                  onChange={(e) => onBgPickerChange(e.target.value)}
                  className="absolute inset-0 h-full min-h-[2.25rem] w-full min-w-[2.25rem] cursor-pointer opacity-0"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#aaaaaa]">
              <span>Selected:</span>
              <span
                className="inline-block shrink-0 rounded-md border border-[#444444]"
                style={{ width: 40, height: 40, borderRadius: 6, ...selectedTileStyle }}
              />
              <span className="min-w-0 flex-1 text-white">{bgSelectedKey ? selectionLabel(bgSelectedKey, bgCustomHex) : "—"}</span>
              {bgPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bgPreviewUrl}
                  alt=""
                  width={80}
                  height={80}
                  className="shrink-0 rounded-md border border-[#333333] object-cover"
                />
              ) : null}
            </div>
            <button
              type="button"
              disabled={opsLocked}
              className={`${btnDark} mt-3 w-full border-amber-600/50 bg-amber-900/30 hover:bg-amber-900/50`}
              onClick={() => {
                if (!isCloudinaryDeliveryUrl(item.url)) {
                  toast.error("Remove background preview needs a Cloudinary image.");
                  return;
                }
                selectBgSwatch("transparent", null);
              }}
            >
              ✨ Remove Background
            </button>
            <button
              type="button"
              disabled={opsLocked}
              className={`${btnDark} mt-2 w-full bg-blue-600 hover:bg-blue-700`}
              onClick={applyColorBackgroundSave}
            >
              Apply (save URL)
            </button>
          </DarkSection>

          <div className="border-b border-[#2a2a2a] px-3 py-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#888]">Enhance</p>
            {enableWatermark && !hideWatermarkToolbar ? (
              <label className="mb-2 flex items-center gap-2 text-xs">
                <input type="checkbox" checked={watermarkEnabled} onChange={(e) => setWatermarkEnabled(e.target.checked)} className="rounded" />
                Watermark
              </label>
            ) : null}
            {enableWatermark && !hideWatermarkToolbar && watermarkEnabled ? (
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                className={`${inputDark} mb-2`}
              />
            ) : null}
            {enableWatermark && hideWatermarkToolbar && watermarkEnabled ? (
              <input type="text" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} className={`${inputDark} mb-2`} />
            ) : null}
            <label className="text-xs text-[#888]">Brightness ({bright})</label>
            <input
              type="range"
              min={-50}
              max={50}
              value={bright}
              disabled={opsLocked}
              onChange={(e) => setBright(Number(e.target.value))}
              className="mb-2 w-full"
            />
            <label className="text-xs text-[#888]">Contrast ({cont})</label>
            <input
              type="range"
              min={-50}
              max={50}
              value={cont}
              disabled={opsLocked}
              onChange={(e) => setCont(Number(e.target.value))}
              className="mb-2 w-full"
            />
            <button
              type="button"
              disabled={opsLocked}
              className={`${btnDark} w-full bg-[#3b82f6] hover:bg-[#2563eb]`}
              onClick={applyEnhance}
            >
              Apply
            </button>
          </div>

          <div className="space-y-2 p-3">
            <button
              type="button"
              disabled={opsLocked}
              className="w-full rounded border border-amber-700/40 bg-amber-950/40 py-2 text-sm text-amber-100 hover:bg-amber-950/60 disabled:opacity-50"
              onClick={onSetMain}
            >
              Set as Main Image
            </button>
            <a
              href={workingUrl || baseUrl}
              download={filenameFromUrl(workingUrl || baseUrl)}
              aria-disabled={opsLocked}
              className={[
                "block w-full rounded border border-[#333] py-2 text-center text-sm text-white hover:bg-[#2a2a2a]",
                opsLocked ? "pointer-events-none opacity-50" : "",
              ].join(" ")}
            >
              Download
            </a>
            <button
              type="button"
              disabled={opsLocked}
              className="w-full rounded border border-[#333] py-2 text-sm hover:bg-[#2a2a2a] disabled:opacity-50"
              onClick={() => {
                navigator.clipboard?.writeText?.(workingUrl || baseUrl);
                toast.success("URL copied.");
              }}
            >
              Copy URL
            </button>
            <button
              type="button"
              disabled={opsLocked}
              className="w-full rounded bg-red-900/80 py-2 text-sm text-red-100 hover:bg-red-900 disabled:opacity-50"
              onClick={() => {
                if (window.confirm("Remove this image?")) onRemove();
              }}
            >
              Remove Image
            </button>
          </div>
        </div>
      </aside>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
