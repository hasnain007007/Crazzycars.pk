/**
 * Browser-only: load image, optional resize, optional watermark, export WebP blob.
 */

const WEBP_QUALITY_START = 0.85;
const WEBP_QUALITY_MIN = 0.45;

function drawWatermark(ctx, width, height, text) {
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

  // Optional diagonal watermark for stronger protection.
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

/**
 * @param {File|Blob} file
 * @param {{ maxWidth?: number; watermark?: boolean; watermarkText?: string; skipResize?: boolean; maxBytes?: number; quality?: number }} options
 * @returns {Promise<{ blob: Blob; originalSize: number; finalSize: number; previewUrl: string; outputWidth: number; outputHeight: number }>}
 */
export async function processImageToWebp(file, options = {}) {
  console.log("processImageToWebp called with options:", options);
  console.log("watermark:", options.watermark);
  console.log("watermarkText:", options.watermarkText);

  const {
    quality = WEBP_QUALITY_START,
    maxWidth = 1200,
    watermark = false,
    watermarkText = process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`,
    skipResize = false,
    maxBytes,
  } = options;

  const originalSize = Number(file?.size) || 0;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        if (!skipResize && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const wmText = watermarkText || process.env.NEXT_PUBLIC_APP_NAME || `${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}`;
        console.log("About to draw watermark:", watermark, wmText);
        if (watermark && wmText) {
          drawWatermark(ctx, width, height, wmText);
          console.log("Watermark drawn successfully");
        }

        const toBlobWithQuality = (q) =>
          new Promise((res) => {
            canvas.toBlob((blob) => res(blob), "image/webp", q);
          });

        (async () => {
          let q = quality;
          let blob = await toBlobWithQuality(q);

          const targetMax = maxBytes ?? Infinity;
          while (blob && blob.size > targetMax && q > WEBP_QUALITY_MIN + 0.01) {
            q -= 0.1;
            blob = await toBlobWithQuality(q);
          }

          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }
          console.log("Blob created, size:", blob.size);
          resolve({
            blob,
            originalSize,
            finalSize: blob.size,
            previewUrl: URL.createObjectURL(blob),
            outputWidth: width,
            outputHeight: height,
          });
        })().catch((err) => reject(err));
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
