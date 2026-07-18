/**
 * Shared invoice PDF print helper.
 */
import {
  invoiceInnerHtml,
  printDocumentShell,
  printHtmlWithIframe,
} from "@/components/orders/printOrderDocuments";

export function downloadInvoicePdf(invoice, storeMeta = {}) {
  const body = invoiceInnerHtml(invoice, {
    storeName: storeMeta.storeName,
    logoUrl: storeMeta.logoUrl,
  });
  const number = invoice.invoiceNumber || invoice.orderNumber || "invoice";
  printHtmlWithIframe(printDocumentShell(`Invoice ${number}`, body));
}
