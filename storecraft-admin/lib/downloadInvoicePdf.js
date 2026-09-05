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
 */
export async function downloadInvoicePdf(invoice, storeMeta = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const body = buildInvoiceBody(invoice, storeMeta);

  // Isolated iframe — opacity:0 mounts inherit dark-mode and often export as B&W / blank.
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;left:-12000px;top:0;width:820px;height:1200px;border:0;background:#ffffff;opacity:1;visibility:visible;pointer-events:none;z-index:-1;";
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
      }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        padding: 24px;
        width: 794px;
        box-sizing: border-box;
      }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      img { max-width: 100%; }
    </style>
  </head><body>${body}</body></html>`;

  idoc.open();
  idoc.write(html);
  idoc.close();

  try {
    stripCrossOriginImages(idoc.body);
    await waitForImagesInDocument(idoc);
    await new Promise((r) => setTimeout(r, 120));

    const target = idoc.body;
    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 820,
      width: 794,
      foreignObjectRendering: false,
      onclone: (clonedDoc) => {
        try {
          clonedDoc.documentElement.style.colorScheme = "light";
          clonedDoc.body.style.background = "#ffffff";
          clonedDoc.body.style.color = "#0f172a";
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
    const imgHeight = (canvas.height * usableWidth) / canvas.width;

    let heightLeft = imgHeight;
    let y = margin;

    pdf.addImage(imgData, "PNG", margin, y, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin;

    while (heightLeft > 0) {
      y = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, y, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin;
    }

    pdf.save(`${invoiceFileBase(invoice)}.pdf`);
  } catch (err) {
    openInvoiceDocumentWindow(invoice, storeMeta);
    throw err;
  } finally {
    if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
  }
}
