/**
 * Browser-only: load image, optional resize, optional watermark, export WebP blob.
 */

const WEBP_QUALITY_START = 0.85;
const WEBP_QUALITY_MIN = 0.45;

function drawWatermark(ctx, width, height, text) {
  if (!text?.trim()) return;
  const label = text.trim();
  const fontSize = Math.max(11, Math.round(width * 0.018));
  const barH = Math.round(fontSize * 2.2);
  ctx.save();
  ctx.fillStyle = "rgba(17, 17, 17, 0.42)";
  ctx.fillRect(0, height - barH, width, barH);
  ctx.font = `600 ${fontSize}px Georgia, serif`;
  ctx.fillStyle = "rgba(250, 247, 242, 0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, width / 2, height - barH / 2);
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
    watermarkText = process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'}`,
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

          const wmText = watermarkText || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Homefy.pk'}`;
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
