/**
 * Invoice print + real PDF file download (html2canvas + jsPDF).
 */
import {
  invoiceInnerHtml,
  printDocumentShell,
  printHtmlWithIframe,
} from "@/components/orders/printOrderDocuments";

function buildInvoiceBody(invoice, storeMeta = {}) {
  return invoiceInnerHtml(invoice, {
    storeName: storeMeta.storeName,
    logoUrl: storeMeta.logoUrl,
    phone: storeMeta.phone,
    email: storeMeta.email,
    website: storeMeta.website,
    address: storeMeta.address,
    footerText: storeMeta.footerText,
    currency: storeMeta.currency,
    primaryColor: storeMeta.primaryColor,
    ntn: storeMeta.ntn,
    strn: storeMeta.strn,
    bankName: storeMeta.bankName,
    bankAccountTitle: storeMeta.bankAccountTitle,
    bankAccountNumber: storeMeta.bankAccountNumber,
    bankIban: storeMeta.bankIban,
    terms: storeMeta.terms,
    footerNote: storeMeta.footerNote,
  });
}

function invoiceFileBase(invoice) {
  return String(invoice.invoiceNumber || invoice.orderNumber || "invoice").replace(
    /[^\w.-]+/g,
    "_"
  );
}

/** Opens the browser print dialog (use for Print). */
export function printInvoice(invoice, storeMeta = {}) {
  const body = buildInvoiceBody(invoice, storeMeta);
  const number = invoice.invoiceNumber || invoice.orderNumber || "invoice";
  printHtmlWithIframe(printDocumentShell(`Invoice ${number}`, body));
}

/** @deprecated Use printInvoice — kept as alias for older call sites. */
export function downloadInvoicePdfPrint(invoice, storeMeta = {}) {
  printInvoice(invoice, storeMeta);
}

function waitForImages(root) {
  const imgs = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) => {
      try {
        img.crossOrigin = "anonymous";
      } catch {
        /* ignore */
      }
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        setTimeout(done, 4000);
      });
    })
  );
}

/**
 * Generates a real .pdf file and triggers a browser download (does not open print).
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
    "left:-10000px",
    "top:0",
    "width:794px",
    "padding:24px",
    "background:#ffffff",
    "color:#111111",
    "z-index:-1",
    "pointer-events:none",
  ].join(";");
  mount.innerHTML = body;
  document.body.appendChild(mount);

  try {
    await waitForImages(mount);
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
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
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
  } finally {
    if (mount.parentNode) mount.parentNode.removeChild(mount);
  }
}
