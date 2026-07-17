import nodemailer from "nodemailer";
import { formatAdminPrice } from "@/lib/currency";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, from }) {
  const fromAddress = from || process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk'}" <${fromAddress}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false, error: error.message };
  }
}

export function buildOrderConfirmationEmail(order, storeName, logoUrl) {
  const items =
    order.items
      ?.map(
        (item) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">
        ${item.name}
        ${item.variation ? `<br><small style="color:#666">${item.variation}</small>` : ""}
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">
        ${item.quantity}
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">
        ${formatAdminPrice(item.unitPrice || item.price || 0)}
      </td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">
        ${formatAdminPrice((item.unitPrice || item.price || 0) * item.quantity)}
      </td>
    </tr>
  `
      )
      .join("") || "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width">
    </head>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
      <div style="max-width:600px;margin:20px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)">
        
        <div style="background:#009688;padding:30px;text-align:center">
          ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-height:60px;object-fit:contain;margin-bottom:10px"><br>` : ""}
          <h1 style="color:white;margin:0;font-size:24px">${storeName}</h1>
          <p style="color:rgba(255,255,255,0.8);margin:5px 0 0">Order Confirmed — Crazzycars.pk</p>
        </div>
        
        <div style="padding:30px">
          <h2 style="color:#333;margin:0 0 10px">
            Your Crazzycars.pk Order is Confirmed 🎉
          </h2>
          <p style="color:#666;margin:0 0 20px">
            Dear ${order.customer?.name || "Customer"},<br>
            Thank you for shopping at Crazzycars.pk. Your order is confirmed and being prepared for delivery.
          </p>
          
          <div style="background:#f0faf9;border:1px solid #009688;border-radius:8px;padding:15px;margin-bottom:20px">
            <table style="width:100%">
              <tr>
                <td style="color:#666;font-size:13px">Order Number</td>
                <td style="font-weight:bold;text-align:right">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px">Order Date</td>
                <td style="text-align:right">${new Date(order.createdAt).toLocaleDateString("en-PK")}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px">Payment Method</td>
                <td style="text-align:right">${order.paymentMethod || "N/A"}</td>
              </tr>
              <tr>
                <td style="color:#666;font-size:13px">Order Status</td>
                <td style="text-align:right">
                  <span style="background:#009688;color:white;padding:2px 8px;border-radius:4px;font-size:12px">
                    ${order.orderStatus || "Pending"}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          <h3 style="color:#333;margin:0 0 10px">Order Items</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:10px 8px;text-align:left;font-size:13px">Product</th>
                <th style="padding:10px 8px;text-align:center;font-size:13px">Qty</th>
                <th style="padding:10px 8px;text-align:right;font-size:13px">Price</th>
                <th style="padding:10px 8px;text-align:right;font-size:13px">Total</th>
              </tr>
            </thead>
            <tbody>${items}</tbody>
          </table>
          
          <table style="width:100%;margin-bottom:20px">
            <tr>
              <td style="color:#666;padding:4px 0">Subtotal</td>
              <td style="text-align:right;padding:4px 0">${formatAdminPrice(order.pricing?.subtotal || 0)}</td>
            </tr>
            ${
              order.pricing?.discount > 0
                ? `
            <tr>
              <td style="color:#16a34a;padding:4px 0">Discount</td>
              <td style="text-align:right;color:#16a34a;padding:4px 0">-${formatAdminPrice(order.pricing.discount)}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="color:#666;padding:4px 0">Shipping</td>
              <td style="text-align:right;padding:4px 0">${formatAdminPrice(order.pricing?.shippingCost || 0)}</td>
            </tr>
            <tr style="border-top:2px solid #009688">
              <td style="font-weight:bold;padding:8px 0;font-size:16px">Total</td>
              <td style="text-align:right;font-weight:bold;padding:8px 0;font-size:16px;color:#009688">
                ${formatAdminPrice(order.pricing?.total || 0)}
              </td>
            </tr>
          </table>
          
          ${
            order.shippingAddress
              ? `
          <div style="background:#f9f9f9;border-radius:8px;padding:15px;margin-bottom:20px">
            <h3 style="color:#333;margin:0 0 10px;font-size:14px">📦 Shipping Address</h3>
            <p style="color:#555;margin:0;line-height:1.6">
              ${order.shippingAddress.name || ""}<br>
              ${order.shippingAddress.street || ""}<br>
              ${order.shippingAddress.city || ""}, ${order.shippingAddress.state || ""}<br>
              ${order.shippingAddress.country || ""}
            </p>
          </div>`
              : ""
          }
          
          <p style="color:#666;font-size:13px">
            If you have any questions, reply to this email or contact us.
          </p>
        </div>
        
        <div style="background:#f5f5f5;padding:20px;text-align:center;border-top:1px solid #eee">
          <p style="color:#999;font-size:12px;margin:0">
            © ${new Date().getFullYear()} ${storeName}. All rights reserved.
          </p>
          <p style="color:#009688;font-size:12px;margin:5px 0 0">
            Thank you for shopping at Crazzycars.pk!
          </p>
        </div>
        
      </div>
    </body>
    </html>
  `;
}

export function buildShippingEmail(order, storeName, logoUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
      <div style="max-width:600px;margin:20px auto;background:white;border-radius:8px;overflow:hidden">
        <div style="background:#009688;padding:30px;text-align:center">
          ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" style="max-height:60px;margin-bottom:10px"><br>` : ""}
          <h1 style="color:white;margin:0">${storeName}</h1>
          <p style="color:rgba(255,255,255,0.8);margin:5px 0 0">Your Order Has Shipped! 🚚</p>
        </div>
        <div style="padding:30px">
          <h2 style="color:#333">Great news, ${order.customer?.name || "Customer"}!</h2>
          <p style="color:#666">Your order <strong>${order.orderNumber}</strong> has been shipped.</p>
          
          ${
            order.tracking?.number
              ? `
          <div style="background:#f0faf9;border:1px solid #009688;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
            <p style="color:#666;margin:0 0 5px;font-size:13px">TRACKING NUMBER</p>
            <p style="font-size:24px;font-weight:bold;color:#009688;margin:0">${order.tracking.number}</p>
            <p style="color:#666;margin:5px 0 0">${order.tracking.carrier || "Courier"}</p>
            ${
              order.tracking.url
                ? `
            <a href="${order.tracking.url}" style="display:inline-block;margin-top:15px;background:#009688;color:white;padding:10px 25px;border-radius:5px;text-decoration:none;font-weight:bold">
              Track Your Package →
            </a>`
                : ""
            }
          </div>`
              : ""
          }
          
          <p style="color:#666">Thank you for shopping at Crazzycars.pk!</p>
        </div>
        <div style="background:#f5f5f5;padding:20px;text-align:center">
          <p style="color:#999;font-size:12px;margin:0">© ${new Date().getFullYear()} ${storeName}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function recordEmailSent(orderId, emailType, subject, to, resultStatus = "sent") {
  try {
    if (!orderId) return;
    const { dbConnect } = await import("@/lib/db");
    const OrderMod = (await import("@/lib/models/Order.model")).default;
    await dbConnect();
    await OrderMod.findByIdAndUpdate(String(orderId), {
      $push: {
        emailHistory: {
          type: emailType,
          subject: subject || "",
          to: to || "",
          sentAt: new Date(),
          status: resultStatus === "failed" ? "failed" : "sent",
        },
      },
    });
  } catch (e) {
    console.error("Error recording email:", e);
  }
}
