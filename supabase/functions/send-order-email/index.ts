import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'
import { jsPDF } from "https://esm.sh/jspdf"
import autoTable from "https://esm.sh/jspdf-autotable"
import QRCode from "https://esm.sh/qrcode"

serve(async (req: Request) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const SANIKA_EMAIL = "resin.kalaakaari@gmail.com"; // Sanika's notification address
  const BRANDED_SENDER = "Resin Kalaakaari <orders@resinkalaakaari.in>";

  try {
    const { record, old_record } = await req.json();

    // Trigger only when user submits the UTR (verifying_payment status)
    if (record.status !== 'verifying_payment' || old_record?.status === 'verifying_payment') {
      return new Response("No action needed", { status: 200 });
    }

    // --- DATA FETCHING ---
    const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(record.user_id);
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', record.user_id).single();
    const { data: items } = await supabaseAdmin.from('order_items').select(`quantity, products (name, price)`).eq('order_id', record.id);

    if (!user) throw new Error("User not found");
    const customerEmail = user.email || 'jatinsatare24@gmail.com'; // Fallback for safety

    // --- PDF GENERATION ---
    const doc = new jsPDF();

    // 1. LUXURY HEADER
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 45, 210, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(26);
    doc.setFont("helvetica", "bold");
    doc.text("RESIN KALAAKAARI", 14, 22);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text("Dombivli, Maharashtra | resinkalaakaari@gmail.com", 14, 30);
    doc.text("Where art meets the soul.", 14, 36);

    // 2. INVOICE META BOX
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(130, 55, 66, 35, 3, 3, 'FD');
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE DETAILS", 135, 62);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`No: RK-${record.id.slice(0, 8).toUpperCase()}`, 135, 70);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 135, 77);
    doc.setTextColor(212, 175, 55);
    doc.text(`UTR: ${record.transaction_id || 'N/A'}`, 135, 84);

    // 3. CUSTOMER INFO
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO / SHIP TO:", 14, 62);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${user.user_metadata?.full_name || 'Customer'}`, 14, 70);
    const splitAddress = doc.splitTextToSize(profile?.address_line || 'No address provided', 85);
    doc.text(splitAddress, 14, 77);

    // 4. ITEMS TABLE
    const tableBody = items?.map((item: any, index: number) => [
      index + 1,
      item.products?.name || "Custom Resin Art",
      item.quantity,
      `INR ${item.products?.price}`,
      `INR ${item.products?.price * item.quantity}`
    ]);

    autoTable(doc, {
      startY: 105,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      headStyles: { fillColor: [26, 26, 26], textColor: [212, 175, 55] },
    });

    // 5. TOTALS
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setDrawColor(212, 175, 55);
    doc.setLineWidth(0.5);
    doc.line(130, finalY - 5, 196, finalY - 5);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 26);
    doc.text("TOTAL AMOUNT:", 130, finalY + 5);
    doc.text(`INR ${record.total_price}`, 196, finalY + 5, { align: 'right' });

    // 6. QR CODE
    const upiString = `upi://pay?pa=9175461840@ibl&pn=ResinKalaakaari&am=${record.total_price}&cu=INR&tn=Order_RK_${record.id.slice(0, 8).toUpperCase()}`;
    const qrCodeDataUri = await QRCode.toDataURL(upiString, { margin: 1, scale: 4 });
    const qrSize = 32;
    const qrX = 164;
    const qrY = finalY + 12;
    doc.addImage(qrCodeDataUri, 'PNG', qrX, qrY, qrSize, qrSize);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(212, 175, 55);
    doc.text("SCAN TO PAY VIA ANY UPI APP", 196, qrY + qrSize + 6, { align: 'right' });

    // 7. TERMS
    const termsY = Math.max(qrY + qrSize + 25, 240);
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(230, 230, 230);
    doc.roundedRect(14, termsY, 182, 26, 2, 2, 'FD');
    doc.setTextColor(26, 26, 26);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("TERMS AND CONDITIONS", 19, termsY + 7);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("• Parcel Unboxing Video: Mandatory for any claims regarding damage or missing items.", 19, termsY + 13);
    doc.text("• Shipping: Resin Kalaakaari is not responsible for courier delays.", 19, termsY + 18);

    doc.text("Thank you for supporting Resin Kalaakaari!", 105, 288, { align: 'center' });

    const pdfBase64 = btoa(doc.output());

    // --- EMAIL 1: TO CUSTOMER ---
    await resend.emails.send({
      from: BRANDED_SENDER,
      to: [customerEmail],
      reply_to: 'resin.kalaakaari@gmail.com',
      subject: `Invoice: Order #${record.id.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2>Thank you for your order!</h2>
          <p>Hi ${user.user_metadata?.full_name || 'Customer'},</p>
          <p>We've received your payment details (UTR: ${record.transaction_id}). Sanika will verify this and update your order status shortly.</p>
          <p><strong>Attached is your official invoice.</strong></p>
          <br/>
          <p>Warm regards,<br/>Team Resin Kalaakaari</p>
        </div>
      `,
      attachments: [{ filename: `Invoice_RK_${record.id.slice(0, 8)}.pdf`, content: pdfBase64 }],
    });

    // --- EMAIL 2: TO SANIKA (Admin Alert) ---
    await resend.emails.send({
      from: BRANDED_SENDER,
      to: [SANIKA_EMAIL],
      subject: `🚨 New Order Submitted: #${record.id.slice(0, 8).toUpperCase()}`,
      html: `
        <div style="font-family: sans-serif;">
          <h3>New Payment Submission!</h3>
          <p><strong>Customer:</strong> ${user.user_metadata?.full_name || 'N/A'}</p>
          <p><strong>Amount:</strong> INR ${record.total_price}</p>
          <p><strong>UTR/Transaction ID:</strong> ${record.transaction_id}</p>
          <p><strong>Phone:</strong> ${profile?.phone || 'N/A'}</p>
          <hr/>
          <p>Check the admin dashboard to verify and mark as paid.</p>
        </div>
      `,
    });

    return new Response("Success", { status: 200 });

  } catch (err: any) {
    console.error(err);
    return new Response(err.message, { status: 500 });
  }
})