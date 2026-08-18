/**
 * Browser-only: load image, optional resize, optional watermark, export WebP blob.
 */

const WEBP_QUALITY_START = 0.85;
const WEBP_QUALITY_MIN = 0.45;

function drawWatermark(ctx, width, height, text) {
  if (!text?.trim()) return;
  // Tiled diagonal watermark (gulautos.pk style): repeat the label across the
  // whole image, rotated -30deg, in a subtle gray.
  const label = text.trim().toUpperCase();
  const fontSize = Math.max(11, Math.round(width * 0.02));
  ctx.save();
  ctx.font = `600 ${fontSize}px Arial`;
  ctx.fillStyle = "rgba(120, 120, 120, 0.22)";
  const spaced = label.split("").join("\u200a\u200a");
  const textWidth = ctx.measureText(spaced).width;
  const stepX = textWidth + fontSize * 4;
  const stepY = fontSize * 7;
  ctx.translate(width / 2, height / 2);
  ctx.rotate((-30 * Math.PI) / 180);
  const reach = Math.ceil(Math.hypot(width, height) / 2);
  let row = 0;
  for (let y = -reach; y <= reach; y += stepY, row++) {
    // Offset every other row for a brick-like pattern like the reference.
    const offset = row % 2 ? stepX / 2 : 0;
    for (let x = -reach - offset; x <= reach; x += stepX) {
      ctx.fillText(spaced, x, y);
    }
  }
  ctx.restore();
}

/**
 * @param {File|Blob} file
 * @param {{ maxWidth?: number; watermark?: boolean; watermarkText?: string; skipResize?: boolean; maxBytes?: number; quality?: number }} options
 * @returns {Promise<{ blob: Blob; originalSize: number; finalSize: number; previewUrl: string; outputWidth: number; outputHeight: number }>}
 */
export async function processImageToWebp(file, options = {}) {
  const {
    quality = WEBP_QUALITY_START,
    maxWidth = 1200,
    watermark = false,
    watermarkText = process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
    skipResize = false,
    maxBytes,
  } = options;

  const originalSize = Number(file?.size) || 0;

  const HtmlImage = typeof window !== "undefined" ? window.Image : null;
  if (!HtmlImage) {
    throw new Error("Image processing requires a browser environment.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err || "Image processing failed")));
    };
    const ok = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Guard against mobile browsers that never fire load/error for HEIC/odd formats.
    const watchdog = setTimeout(() => fail(new Error("Image processing timed out. Try JPG or PNG.")), 30000);

    reader.onload = (e) => {
      const img = new HtmlImage();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let width = img.naturalWidth;
          let height = img.naturalHeight;

          if (!width || !height) {
            clearTimeout(watchdog);
            fail(new Error("Could not read image dimensions. Try JPG or PNG."));
            return;
          }

          if (!skipResize && width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            clearTimeout(watchdog);
            fail(new Error("Canvas not supported"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          const wmText = watermarkText || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
          if (watermark && wmText) {
            drawWatermark(ctx, width, height, wmText);
          }

          const toBlobWithQuality = (q) =>
            new Promise((res) => {
              // Prefer WebP; fall back to JPEG if the browser returns null (older Safari).
              canvas.toBlob((blob) => {
                if (blob) {
                  res(blob);
                  return;
                }
                canvas.toBlob((jpg) => res(jpg), "image/jpeg", Math.min(0.92, q + 0.05));
              }, "image/webp", q);
            });

          (async () => {
            let q = quality;
            let blob = await toBlobWithQuality(q);

            const targetMax = maxBytes ?? Infinity;
            while (blob && blob.size > targetMax && q > WEBP_QUALITY_MIN + 0.01) {
              q -= 0.1;
              blob = await toBlobWithQuality(q);
            }

            clearTimeout(watchdog);
            if (!blob) {
              fail(new Error("Failed to create image blob"));
              return;
            }
            ok({
              blob,
              originalSize,
              finalSize: blob.size,
              previewUrl: URL.createObjectURL(blob),
              outputWidth: width,
              outputHeight: height,
            });
          })().catch((err) => {
            clearTimeout(watchdog);
            fail(err);
          });
        } catch (err) {
          clearTimeout(watchdog);
          fail(err);
        }
      };

      img.onerror = () => {
        clearTimeout(watchdog);
        fail(new Error("Failed to load image. Try JPG or PNG."));
      };
      img.src = e.target?.result;
    };

    reader.onerror = () => {
      clearTimeout(watchdog);
      fail(new Error("Failed to read file"));
    };
    reader.readAsDataURL(file);
  });
}
