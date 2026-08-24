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
 * Generates a .pdf file download. Falls back to opening a new tab if canvas export fails.
 */
export async function downloadInvoicePdf(invoice, storeMeta = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const body = buildInvoiceBody(invoice, storeMeta);
  const mount = document.createElement("div");
  mount.setAttribute("aria-hidden", "true");
  mount.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    "width:794px",
    "padding:24px",
    "background:#ffffff",
    "color:#111111",
    "z-index:-9999",
    "opacity:0",
    "pointer-events:none",
  ].join(";");
  mount.innerHTML = body;
  document.body.appendChild(mount);

  try {
    stripCrossOriginImages(mount);
    await waitForImagesInDocument(mount.ownerDocument);
    if (document.fonts?.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
    }

    const canvas = await html2canvas(mount, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: 794,
      width: 794,
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("Invoice canvas was empty.");
    }

    let imgData;
    try {
      imgData = canvas.toDataURL("image/jpeg", 0.92);
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

    pdf.addImage(imgData, "JPEG", margin, y, usableWidth, imgHeight);
    heightLeft -= pageHeight - margin;

    while (heightLeft > 0) {
      y = margin - (imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", margin, y, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin;
    }

    pdf.save(`${invoiceFileBase(invoice)}.pdf`);
  } catch (err) {
    openInvoiceDocumentWindow(invoice, storeMeta);
    throw err;
  } finally {
    if (mount.parentNode) mount.parentNode.removeChild(mount);
  }
}
