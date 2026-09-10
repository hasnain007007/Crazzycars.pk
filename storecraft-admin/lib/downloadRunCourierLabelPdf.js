/**
 * Download or print Run Courier airbill PDF from our API (server builds the PDF).
 */

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

/**
 * @param {{ orderId?: string, trackingNumber?: string, orderIds?: string[], trackingNumbers?: string[] }} opts
 */
async function fetchRunCourierLabelPdfBlob(opts = {}) {
  const tn = String(opts.trackingNumber || opts.trackingNumbers?.[0] || "shipment").trim();
  // download=1 → attachment (save file). Print uses inline like PostEx label PDFs.
  const params = new URLSearchParams({ format: "pdf" });
  if (opts.download) params.set("download", "1");
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

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Airbill download failed (HTTP ${res.status}).`);
  }

  if (!contentType.includes("application/pdf")) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || "Server did not return a PDF airbill.");
  }

  const blob = await res.blob();
  if (!blob.size) throw new Error("Downloaded PDF was empty.");
  if (blob.size < 500) throw new Error("Downloaded PDF looks empty. Try again.");

  return { blob, trackingNumber: tn };
}

/**
 * @param {{ orderId?: string, trackingNumber?: string, orderIds?: string[], trackingNumbers?: string[] }} opts
 */
export async function downloadRunCourierLabelPdf(opts = {}) {
  const { blob, trackingNumber: tn } = await fetchRunCourierLabelPdfBlob({
    ...opts,
    download: true,
  });
  triggerBlobDownload(blob, `runcourier-airbill-${tn}.pdf`);
  return { success: true, trackingNumber: tn };
}

/**
 * Open the system print dialog for the airbill PDF (no file download).
 * PDF is full A4 (PostEx-style) so Chrome defaults to A4 / ~100% scale.
 */
export async function printRunCourierLabelPdf(opts = {}) {
  const { blob, trackingNumber: tn } = await fetchRunCourierLabelPdfBlob({
    ...opts,
    download: false,
  });
  const url = URL.createObjectURL(blob);

  // Hidden iframe sized to A4 CSS px (~96dpi) so the PDF viewer paints at page size.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const cleanup = () => {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch {
      /* ignore */
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  await new Promise((resolve, reject) => {
    let settled = false;
    const done = (err) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve();
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("Print frame missing.");
        // Give the PDF viewer a moment to paint before print.
        setTimeout(() => {
          try {
            win.focus();
            win.print();
            done();
          } catch (e) {
            done(e);
          }
        }, 400);
      } catch (e) {
        done(e);
      }
    };

    iframe.onerror = () => done(new Error("Could not load airbill for printing."));
    iframe.src = url;

    // Fallback: some browsers never fire load for PDF iframes — open a tab + print.
    setTimeout(() => {
      if (settled) return;
      try {
        const w = window.open(url, "_blank", "noopener,noreferrer");
        if (!w) {
          done(new Error("Popup blocked. Allow popups to print, or use Download Label."));
          return;
        }
        const tryPrint = () => {
          try {
            w.focus();
            w.print();
          } catch {
            /* user can print manually from the tab */
          }
          done();
        };
        // PDF tabs often don't expose onload reliably.
        setTimeout(tryPrint, 800);
      } catch (e) {
        done(e);
      }
    }, 2500);
  }).finally(() => {
    // Keep iframe briefly so print dialog can still read it.
    setTimeout(cleanup, 120_000);
  });

  return { success: true, trackingNumber: tn };
}

/**
 * Download several airbills as one PDF (3 PostEx-style labels per A4 page).
 */
export async function downloadRunCourierLabelsPdf(items = []) {
  const list = (Array.isArray(items) ? items : []).filter(
    (i) => i?.orderId || i?.trackingNumber
  );
  if (!list.length) throw new Error("No labels selected.");
  if (list.length === 1) {
    return downloadRunCourierLabelPdf(list[0]);
  }
  return downloadRunCourierLabelPdf({
    orderIds: list.map((i) => i.orderId).filter(Boolean),
    trackingNumbers: list.map((i) => i.trackingNumber).filter(Boolean),
    trackingNumber: list[0].trackingNumber || "batch",
  });
}

/**
 * Print several airbills as one PDF (3 PostEx-style labels per A4 page).
 */
export async function printRunCourierLabelsPdf(items = []) {
  const list = (Array.isArray(items) ? items : []).filter(
    (i) => i?.orderId || i?.trackingNumber
  );
  if (!list.length) throw new Error("No labels selected.");
  if (list.length === 1) {
    return printRunCourierLabelPdf(list[0]);
  }
  return printRunCourierLabelPdf({
    orderIds: list.map((i) => i.orderId).filter(Boolean),
    trackingNumbers: list.map((i) => i.trackingNumber).filter(Boolean),
    trackingNumber: list[0].trackingNumber || "batch",
  });
}
