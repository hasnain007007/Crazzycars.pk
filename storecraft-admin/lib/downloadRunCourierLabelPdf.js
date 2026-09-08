/**
 * Download Run Courier airbill as a real PDF (portal only serves HTML).
 * Fetches inlined HTML from our API, then html2canvas + jsPDF → .pdf file.
 */

function waitForImages(doc) {
  const imgs = doc ? Array.from(doc.images || []) : [];
  if (!imgs.length) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          setTimeout(done, 8000);
        })
    )
  );
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.rel = "noopener";
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function htmlStringToPdfBlob(html) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-14000px;top:0;width:900px;height:1400px;border:0;background:#ffffff;opacity:1;visibility:visible;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    iframe.remove();
    throw new Error("Could not create PDF frame.");
  }

  // Wrap if portal fragment somehow lacks html shell.
  const fullHtml = /<html[\s>]/i.test(html)
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="color-scheme" content="light only"/></head><body>${html}</body></html>`;

  idoc.open();
  idoc.write(fullHtml);
  idoc.close();

  try {
    await waitForImages(idoc);
    await new Promise((r) => setTimeout(r, 150));

    const target = idoc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: Math.max(800, target.scrollWidth || 800),
      foreignObjectRendering: false,
      onclone: (clonedDoc) => {
        try {
          clonedDoc.documentElement.style.colorScheme = "light";
          clonedDoc.body.style.background = "#ffffff";
          // Hide portal Print UI leftovers if any.
          clonedDoc.querySelectorAll("button, .print-btn, #print").forEach((el) => {
            el.style.display = "none";
          });
        } catch {
          /* ignore */
        }
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("Airbill canvas was empty.");
    }

    const imgData = canvas.toDataURL("image/png");
    // Airbill is roughly landscape half-page; fit to A4 portrait with margins.
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const usableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeight);
    } else {
      // Scale down to fit one page (typical single airbill).
      const scale = (pageHeight - margin * 2) / imgHeight;
      const w = usableWidth * scale;
      const h = imgHeight * scale;
      const x = margin + (usableWidth - w) / 2;
      pdf.addImage(imgData, "PNG", x, margin, w, h);
    }

    return pdf.output("blob");
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}

/**
 * @param {{ orderId?: string, trackingNumber?: string, orderIds?: string[], trackingNumbers?: string[] }} opts
 */
export async function downloadRunCourierLabelPdf(opts = {}) {
  const tn = String(opts.trackingNumber || opts.trackingNumbers?.[0] || "shipment").trim();
  const params = new URLSearchParams({ format: "html" });
  if (opts.orderId) params.set("orderId", String(opts.orderId));
  if (opts.trackingNumber) params.set("trackingNumber", String(opts.trackingNumber));
  if (opts.orderIds?.length) params.set("orderIds", opts.orderIds.join(","));
  if (opts.trackingNumbers?.length) {
    params.set("trackingNumbers", opts.trackingNumbers.join(","));
  }

  const res = await fetch(`/api/runcourier/label?${params.toString()}`, {
    credentials: "include",
    cache: "no-store",
  });
  const contentType = String(res.headers.get("content-type") || "");

  if (contentType.includes("application/pdf")) {
    const blob = await res.blob();
    triggerBlobDownload(blob, `runcourier-airbill-${tn}.pdf`);
    return { success: true, trackingNumber: tn };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success || !data?.html) {
    throw new Error(data?.error || "Airbill not available yet.");
  }

  const blob = await htmlStringToPdfBlob(data.html);
  const fileTn = String(data.trackingNumber || tn || "shipment").trim();
  triggerBlobDownload(blob, `runcourier-airbill-${fileTn}.pdf`);
  return { success: true, trackingNumber: fileTn };
}

/**
 * Download several airbills one-by-one as separate PDFs.
 */
export async function downloadRunCourierLabelsPdf(items = []) {
  const list = (Array.isArray(items) ? items : []).filter(
    (i) => i?.orderId || i?.trackingNumber
  );
  if (!list.length) throw new Error("No labels selected.");
  for (const item of list) {
    await downloadRunCourierLabelPdf(item);
  }
  return { success: true, count: list.length };
}
