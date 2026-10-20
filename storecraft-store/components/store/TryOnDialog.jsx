"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { drawLip } from "@/lib/tryOnDraw";
import { STORE_CONTACT } from "@/config/store-policy";

const MAX_SIDE = 1400;

async function loadPhoto(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function startFit(W, H) {
  return { cx: W / 2, cy: H * 0.84, w: W * 0.72, h: Math.max(8, W * 0.032), curve: 0.6, tilt: 0, angle: 0 };
}

/**
 * "Try it on your car photo": the shopper's photo stays on their device; we draw the
 * front lip on a canvas they can move, resize and tilt, then save or share.
 */
export default function TryOnDialog({ productName, style, onClose }) {
  const canvasRef = useRef(null);
  const photoRef = useRef(null);
  const fileRef = useRef(null);
  const pointers = useRef(new Map());
  const pinch = useRef(null);
  const [size, setSize] = useState(null);
  const [fit, setFit] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    if (!canvas || !photo || !fit) return;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);
    drawLip(ctx, fit, style);
  }, [fit, style]);

  useEffect(() => {
    const id = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(id);
  }, [draw, size]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      const photo = await loadPhoto(file);
      const scale = Math.min(1, MAX_SIDE / Math.max(photo.width, photo.height));
      const W = Math.round(photo.width * scale);
      const H = Math.round(photo.height * scale);
      photoRef.current = photo;
      setSize({ W, H });
      setFit(startFit(W, H));
    } catch {
      setError("Could not open that photo. Try a JPG or PNG picture.");
    }
  };

  const toCanvas = (e) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toCanvas(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), w: fit.w, h: fit.h };
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    const now = toCanvas(e);
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const k = Math.hypot(a.x - b.x, a.y - b.y) / (pinch.current.dist || 1);
      setFit((f) => ({ ...f, w: pinch.current.w * k, h: pinch.current.h * k }));
    } else if (pointers.current.size === 1) {
      setFit((f) => ({ ...f, cx: f.cx + now.x - prev.x, cy: f.cy + now.y - prev.y }));
    }
  };

  const onPointerUp = (e) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const exportBlob = () =>
    new Promise((resolve) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      draw();
      const pad = Math.round(canvas.width * 0.015);
      const fs = Math.max(12, Math.round(canvas.width * 0.022));
      ctx.font = `600 ${fs}px system-ui, sans-serif`;
      const label = "crazzycars.pk · approximate preview";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(canvas.width - tw - pad * 3, canvas.height - fs - pad * 3, tw + pad * 2, fs + pad * 2);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, canvas.width - tw - pad * 2, canvas.height - pad * 2 - fs * 0.2);
      canvas.toBlob((b) => {
        resolve(b);
        requestAnimationFrame(draw);
      }, "image/jpeg", 0.9);
    });

  const save = async () => {
    const blob = await exportBlob();
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-car-with-splitter.jpg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const share = async () => {
    const blob = await exportBlob();
    if (!blob) return;
    const file = new File([blob], "my-car-with-splitter.jpg", { type: "image/jpeg" });
    const text = `My car with "${productName}" from CrazzyCars.pk`;
    try {
      await navigator.share({ files: [file], text });
    } catch {
      /* cancelled or not allowed: Save picture still works */
    }
  };

  // Client-only component (loaded with ssr: false), so navigator is available here.
  const [canShare] = useState(() => {
    try {
      const probe = new File([new Blob(["x"], { type: "image/jpeg" })], "x.jpg", { type: "image/jpeg" });
      return Boolean(navigator.canShare?.({ files: [probe] }));
    } catch {
      return false;
    }
  });

  const askUs = `https://wa.me/${STORE_CONTACT.phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi, will "${productName}" fit my car? I'm sending a photo.`
  )}`;

  const slider = (label, key, min, max, step, toView = (v) => v, fromView = (v) => v) => (
    <label className="block text-xs font-medium text-[#374151]">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={toView(fit[key])}
        onChange={(e) => setFit((f) => ({ ...f, [key]: fromView(Number(e.target.value)) }))}
        className="mt-1 block w-full accent-[#C41E1E]"
      />
    </label>
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Try ${productName} on your car photo`}
      className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/60 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-2xl sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#C41E1E]">Try it on your car photo</p>
            <p className="truncate text-sm text-[#374151]">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] text-lg text-[#374151] hover:bg-[#f9fafb]"
          >
            ×
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

        {!size ? (
          <div className="rounded-xl border-2 border-dashed border-[#e5e7eb] p-6 text-center">
            <p className="text-sm font-semibold text-[#111827]">Take or choose a photo of the front of your car</p>
            <p className="mt-1 text-xs text-[#6b7280]">
              Stand in front of the car, a little to the side, with the whole bumper in the picture. Your
              photo stays on your phone. Nothing is uploaded.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 rounded-lg bg-[#C41E1E] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#A01818]"
            >
              📷 Choose car photo
            </button>
            {error ? <p className="mt-3 text-xs text-[#b91c1c]">{error}</p> : null}
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={size.W}
              height={size.H}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="block max-h-[52vh] w-full touch-none rounded-xl bg-[#111] object-contain"
              style={{ aspectRatio: `${size.W} / ${size.H}` }}
            />
            <p className="mt-2 text-xs text-[#6b7280]">
              Drag the splitter onto the bottom edge of your bumper. Pinch or use the sliders to fit it;
              if the photo is from the side, use Angle. This is an approximate preview of the shape; see
              the product photos for exact details.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
              {slider("Size", "w", size.W * 0.2, size.W * 1.2, 1)}
              {slider("Thickness", "h", size.W * 0.006, size.W * 0.045, 0.5)}
              {slider("Curve", "curve", 0, 2, 0.05)}
              {slider("Tilt", "tilt", -20, 20, 0.5, (v) => (v * 180) / Math.PI, (v) => (v * Math.PI) / 180)}
              <div className="col-span-2">
                {slider("Angle (photo from the side)", "angle", -60, 60, 1, (v) => (v * 180) / Math.PI, (v) => (v * Math.PI) / 180)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={save}
                className="rounded-lg bg-[#C41E1E] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#A01818]"
              >
                Save picture
              </button>
              {canShare ? (
                <button
                  type="button"
                  onClick={share}
                  className="rounded-lg border border-[#C41E1E] px-3 py-2.5 text-sm font-semibold text-[#C41E1E] hover:bg-[#fff5f5]"
                >
                  Share
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={`rounded-lg border border-[#e5e7eb] px-3 py-2.5 text-sm font-semibold text-[#374151] hover:bg-[#f9fafb] ${canShare ? "col-span-2" : ""}`}
              >
                Change photo
              </button>
            </div>
          </>
        )}

        <a
          href={askUs}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-lg bg-[#f0fdf4] px-3 py-2.5 text-center text-sm font-medium text-[#166534] hover:bg-[#dcfce7]"
        >
          Not sure it fits? Send us your car photo on WhatsApp
        </a>
      </div>
    </div>
  );
}
