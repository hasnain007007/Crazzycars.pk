/**
 * Download Run Courier airbill as a real PDF from our API (server builds the PDF).
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
export async function downloadRunCourierLabelPdf(opts = {}) {
  const tn = String(opts.trackingNumber || opts.trackingNumbers?.[0] || "shipment").trim();
  const params = new URLSearchParams({ format: "pdf", download: "1" });
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
  // Guard against tiny blank PDFs
  if (blob.size < 500) throw new Error("Downloaded PDF looks empty. Try again.");

  triggerBlobDownload(blob, `runcourier-airbill-${tn}.pdf`);
  return { success: true, trackingNumber: tn };
}

/**
 * Download several airbills as one PDF (2 compact labels per A4 page).
 */
export async function downloadRunCourierLabelsPdf(items = []) {
  const list = (Array.isArray(items) ? items : []).filter(
    (i) => i?.orderId || i?.trackingNumber
  );
  if (!list.length) throw new Error("No labels selected.");
  if (list.length === 1) {
    return downloadRunCourierLabelPdf(list[0]);
  }
  // Single request → server stacks 2 airbills per A4 page.
  return downloadRunCourierLabelPdf({
    orderIds: list.map((i) => i.orderId).filter(Boolean),
    trackingNumbers: list.map((i) => i.trackingNumber).filter(Boolean),
    trackingNumber: list[0].trackingNumber || "batch",
  });
}
