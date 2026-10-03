// Builds the invoice PDF and returns it as base64 (what Resend wants for an
// attachment). Pure: no network, no database. Everything it prints comes from
// the order that handler.ts re-read from the database.
// Note: jsPDF's built-in Helvetica has no rupee sign or Indic letters, hence
// "INR" below and plain-Latin text; a name in another script would print wrong.
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
// @ts-types="npm:@types/qrcode@1.5.6"
import QRCode from "qrcode";
import { SHOP } from "./config.ts";
import type { InvoiceInput } from "./types.ts";

const DARK: [number, number, number] = [26, 26, 26];
const GOLD: [number, number, number] = [212, 175, 55];

export function shortId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

export async function buildInvoicePdf(input: InvoiceInput): Promise<string> {
  const short = shortId(input.orderId);
  const doc = new jsPDF();

  // 1. Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, 210, 45, "F");
  doc.setFillColor(...GOLD);
  doc.rect(0, 45, 210, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text(SHOP.name.toUpperCase(), 14, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`${SHOP.address} | ${SHOP.email}`, 14, 30);
  doc.text(SHOP.tagline, 14, 36);

  // 2. Invoice details box
  doc.setFillColor(248, 249, 250);
  doc.roundedRect(130, 55, 66, 35, 3, 3, "FD");
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE DETAILS", 135, 62);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`No: RK-${short}`, 135, 70);
  // Order date (not "today"), so a retry on another day prints the same invoice.
  doc.text(
    `Date: ${input.orderDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    135,
    77,
  );
  doc.setTextColor(...GOLD);
  doc.text(`UTR: ${input.utr}`, 135, 84);

  // 3. Customer
  doc.setTextColor(...DARK);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO / SHIP TO:", 14, 62);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(input.customerName, 14, 70);
  doc.text(
    doc.splitTextToSize(input.address || "No address provided", 85),
    14,
    77,
  );

  // 4. Items. Prices are the ones frozen on the order (price_at_purchase).
  autoTable(doc, {
    startY: 105,
    head: [["#", "Description", "Qty", "Unit Price", "Total"]],
    body: input.lines.map((line, i) => [
      i + 1,
      line.name,
      line.quantity,
      `INR ${line.unitPrice}`,
      `INR ${line.unitPrice * line.quantity}`,
    ]),
    headStyles: { fillColor: DARK, textColor: GOLD },
  });

  // 5. Totals. If there is no room left on this page, start a new one.
  const tableEnd = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY;
  let y = tableEnd + 10;
  if (y + 100 > 270) {
    doc.addPage();
    y = 20;
  }
  const subtotal = input.lines.reduce(
    (s, l) => s + l.unitPrice * l.quantity,
    0,
  );
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  doc.text("Subtotal:", 130, y);
  doc.text(`INR ${subtotal}`, 196, y, { align: "right" });
  if (input.shipping > 0) {
    y += 6;
    doc.text("Shipping:", 130, y);
    doc.text(`INR ${input.shipping}`, 196, y, { align: "right" });
  }
  y += 6;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(130, y, 196, y);
  y += 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT:", 130, y);
  doc.text(`INR ${input.total}`, 196, y, { align: "right" });

  // 6. UPI QR code for the exact amount
  const upi =
    `upi://pay?pa=${SHOP.upiId}&pn=${SHOP.upiPayeeName}` +
    `&am=${input.total}&cu=INR&tn=Order_RK_${short}`;
  const qr = await QRCode.toDataURL(upi, { margin: 1, scale: 4 });
  const qrSize = 32;
  const qrY = y + 7;
  doc.addImage(qr, "PNG", 164, qrY, qrSize, qrSize);
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("SCAN TO PAY VIA ANY UPI APP", 196, qrY + qrSize + 6, {
    align: "right",
  });

  // 7. Terms + footer
  const termsY = Math.max(qrY + qrSize + 25, 240);
  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(230, 230, 230);
  doc.roundedRect(14, termsY, 182, 26, 2, 2, "FD");
  doc.setTextColor(...DARK);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS AND CONDITIONS", 19, termsY + 7);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    "- Parcel Unboxing Video: Mandatory for any claims regarding damage or missing items.",
    19,
    termsY + 13,
  );
  doc.text(
    `- Shipping: ${SHOP.name} is not responsible for courier delays.`,
    19,
    termsY + 18,
  );
  doc.text(`Thank you for supporting ${SHOP.name}!`, 105, 288, {
    align: "center",
  });

  return btoa(doc.output());
}
