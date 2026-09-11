/**
 * Invoice print + PDF download (html2canvas + jsPDF, with reliable fallbacks).
 */
import {
  invoiceInnerHtml,
  printDocumentShell,
  printHtmlWithIframe,
} from "@/components/orders/printOrderDocuments";
import { enrichOrderForInvoice } from "@/lib/orderInvoice";

function buildInvoiceBody(invoice, storeMeta = {}) {
  return invoiceInnerHtml(enrichOrderForInvoice(invoice), storeMeta);
}

function invoiceFileBase(invoice) {
  return String(invoice.invoiceNumber || invoice.orderNumber || "invoice").replace(
    /[^\w.-]+/g,
    "_"
  );
}

function waitForImagesInDocument(doc) {
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
          setTimeout(done, 5000);
        })
    )
  );
}

/** Remove cross-origin images so html2canvas can export (Cloudinary logos taint the canvas). */
function stripCrossOriginImages(root) {
  if (!root) return;
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src || src.startsWith("data:")) return;
    try {
      const u = new URL(src, window.location.href);
      if (u.origin !== window.location.origin) img.remove();
    } catch {
      img.remove();
    }
  });
}

/**
 * Open invoice in a new browser tab (always visible — use Print → Save as PDF).
 * @returns {Window}
 */
export function openInvoiceDocumentWindow(invoice, storeMeta = {}) {
  const body = buildInvoiceBody(invoice, storeMeta);
  const number = invoice.invoiceNumber || invoice.orderNumber || "invoice";
  const html = printDocumentShell(`Invoice ${number}`, body);
  const w = window.open("", "_blank", "noopener,noreferrer,width=920,height=1000");
  if (!w) {
    throw new Error("Popup blocked. Allow popups for admin.crazzycars.pk, then try again.");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return w;
}

/** Opens the browser print dialog (waits for images so the invoice is not blank). */
export function printInvoice(invoice, storeMeta = {}) {
  const body = buildInvoiceBody(invoice, storeMeta);
  const number = invoice.invoiceNumber || invoice.orderNumber || "invoice";
  const html = printDocumentShell(`Invoice ${number}`, body);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:0;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!idoc || !win) {
    iframe.remove();
    openInvoiceDocumentWindow(invoice, storeMeta);
    return;
  }

  idoc.open();
  idoc.write(html);
  idoc.close();

  waitForImagesInDocument(idoc).then(() => {
    win.focus();
    win.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  });
}

/** @deprecated Use printInvoice — kept as alias for older call sites. */
export function downloadInvoicePdfPrint(invoice, storeMeta = {}) {
  printInvoice(invoice, storeMeta);
}

/**
 * Generates a colored .pdf via an isolated light-mode iframe (avoids admin dark-mode washout).
 *
 * Blank page-2 fix:
 * 1) Capture only #invoice-root content height (not the tall iframe viewport).
 * 2) Prefer a single A4 page; soft-scale if slightly over; multi-page only when needed.
 * 3) Use a 1mm epsilon so float rounding never creates an empty trailing page.
 */
export async function downloadInvoicePdf(invoice, storeMeta = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const body = buildInvoiceBody(invoice, storeMeta);

  // Isolated iframe — opacity:0 mounts inherit dark-mode and often export as B&W / blank.
  // Height is only a viewport hint; capture uses #invoice-root scrollHeight (not iframe height).
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:820px;height:200px;border:0;background:#ffffff;opacity:1;visibility:visible;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const idoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!idoc) {
    iframe.remove();
    openInvoiceDocumentWindow(invoice, storeMeta);
    throw new Error("Could not create PDF frame.");
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <meta name="color-scheme" content="light only"/>
    <style>
      :root { color-scheme: light only; }
      html, body {
        margin: 0; padding: 0;
        background: #ffffff !important;
        color: #0f172a !important;
        color-scheme: light only;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        forced-color-adjust: none !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
      }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        padding: 0;
        width: 794px;
        box-sizing: border-box;
      }
      #invoice-root {
        display: block;
        width: 794px;
        padding: 16px 20px 20px;
        box-sizing: border-box;
        background: #ffffff;
        height: auto !important;
        min-height: 0 !important;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      img { max-width: 100%; }
    </style>
  </head><body><div id="invoice-root">${body}</div></body></html>`;

  idoc.open();
  idoc.write(html);
  idoc.close();

  try {
    const root = idoc.getElementById("invoice-root") || idoc.body;
    stripCrossOriginImages(root);
    await waitForImagesInDocument(idoc);
    await new Promise((r) => setTimeout(r, 120));

    // Force layout to content height — never the iframe chrome height.
    const contentH = Math.ceil(
      Math.max(root.scrollHeight, root.offsetHeight, root.getBoundingClientRect().height)
    );

    const canvas = await html2canvas(root, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
      width: 794,
      height: contentH,
      windowHeight: contentH,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: false,
      onclone: (clonedDoc) => {
        try {
          clonedDoc.documentElement.style.colorScheme = "light";
          clonedDoc.documentElement.style.height = "auto";
          clonedDoc.body.style.background = "#ffffff";
          clonedDoc.body.style.color = "#0f172a";
          clonedDoc.body.style.height = "auto";
          clonedDoc.body.style.minHeight = "0";
          const cloneRoot = clonedDoc.getElementById("invoice-root");
          if (cloneRoot) {
            cloneRoot.style.height = "auto";
            cloneRoot.style.minHeight = "0";
          }
        } catch {
          /* ignore */
        }
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("Invoice canvas was empty.");
    }

    // PNG keeps brand reds/greens; JPEG often looks washed / near-grayscale.
    let imgData;
    try {
      imgData = canvas.toDataURL("image/png");
    } catch {
      throw new Error("Could not export invoice image (cross-origin content).");
    }

    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableWidth = pageWidth - margin * 2;
    const usableHeight = pageHeight - margin * 2;
    const imgHeightMm = (canvas.height * usableWidth) / canvas.width;

    // Case 1: fits one A4 page
    if (imgHeightMm <= usableHeight + 0.75) {
      pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeightMm, undefined, "FAST");
      pdf.save(`${invoiceFileBase(invoice)}.pdf`);
      return;
    }

    // Case 2: only slightly over — scale down instead of a blank page 2
    if (imgHeightMm <= usableHeight * 1.15) {
      const scale = usableHeight / imgHeightMm;
      const w = usableWidth * scale;
      const h = usableHeight;
      const x = margin + (usableWidth - w) / 2;
      pdf.addImage(imgData, "PNG", x, margin, w, h, undefined, "FAST");
      pdf.save(`${invoiceFileBase(invoice)}.pdf`);
      return;
    }

    // Case 3: genuine multi-page invoice (many line items)
    let heightLeft = imgHeightMm;
    let position = margin;
    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeightMm, undefined, "FAST");
    heightLeft -= usableHeight;

    // Epsilon (> 1mm) prevents a trailing blank page from float rounding
    while (heightLeft > 1) {
      position = margin - (imgHeightMm - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeightMm, undefined, "FAST");
      heightLeft -= usableHeight;
    }

    pdf.save(`${invoiceFileBase(invoice)}.pdf`);
  } catch (err) {
    openInvoiceDocumentWindow(invoice, storeMeta);
    throw err;
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}
