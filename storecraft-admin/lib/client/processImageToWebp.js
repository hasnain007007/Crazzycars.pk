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
  const fontSize = Math.max(14, Math.round(width * 0.03));
  ctx.save();
  ctx.font = `600 ${fontSize}px Arial`;
  ctx.fillStyle = "rgba(120, 120, 120, 0.28)";
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
