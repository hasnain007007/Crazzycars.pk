/**
 * Shared invoice PDF print helper — uses full store + invoice branding.
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
  const number = invoice.invoiceNumber || invoice.orderNumber || "invoice";
  printHtmlWithIframe(printDocumentShell(`Invoice ${number}`, body));
}
