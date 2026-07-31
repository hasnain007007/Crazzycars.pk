import { NextResponse } from "next/server";
import Stripe from "stripe";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { recordEmailSent, resolveOrderConfirmationEmail, sendEmail, sendAdminOrderNotification } from "@/lib/email";

async function getStripeConfig() {
  try {
    await dbConnect();
    const settings =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("payment").lean()) ||
      (await Settings.findOne({}).select("payment").lean());

    const secretKey =
      settings?.payment?.stripeSecretKey ||
      settings?.payment?.stripe?.secretKey ||
      process.env.STRIPE_SECRET_KEY ||
      "";

    const webhookSecret =
      settings?.payment?.stripeWebhookSecret ||
      settings?.payment?.stripe?.webhookSecret ||
      process.env.STRIPE_WEBHOOK_SECRET ||
      "";

    return { secretKey, webhookSecret };
  } catch (e) {
    console.error("getStripeConfig:", e?.message || e);
    return {
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    };
  }
}

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  const { secretKey, webhookSecret } = await getStripeConfig();

  if (!secretKey) {
    console.error("Stripe secret key not configured");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2023-10-16",
  });

  let event;

  try {
    if (!webhookSecret) {
      console.error("Stripe webhook secret not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }
    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    console.error("Webhook signature error:", e.message);
    return NextResponse.json({ error: `Webhook error: ${e.message}` }, { status: 400 });
  }

  try {
    await dbConnect();
    const Order = (await import("@/lib/models/Order.model")).default;

    console.log("Webhook event:", event.type);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        console.log("Payment succeeded for order:", orderId);

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            $set: {
              paymentStatus: "paid",
              orderStatus: "processing",
              "payment.stripePaymentIntentId": paymentIntent.id,
              "payment.paidAt": new Date(),
              "payment.amount": paymentIntent.amount_received
                ? paymentIntent.amount_received / 100
                : paymentIntent.amount / 100,
            },
          });
          console.log("Order updated to paid:", orderId);

          const paidOrder = await Order.findById(orderId).lean();
          if (paidOrder?.customer?.email) {
            const siteSettings =
              (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).select("general").lean()) || {};
            const storeName = siteSettings?.general?.storeName || process.env.NEXT_PUBLIC_STORE_NAME || 'Crazzycars.pk';
            const logoUrl = siteSettings?.general?.logo?.url || "";
            resolveOrderConfirmationEmail(paidOrder, storeName, logoUrl)
              .then(({ subject, html: emailHtml }) =>
                sendEmail({
                  to: paidOrder.customer.email,
                  subject,
                  html: emailHtml,
                }).then(async (sent) => {
                  if (sent?.success) {
                    await recordEmailSent(orderId, "order_confirmation", subject, paidOrder.customer.email);
                  }
                })
              )
              .catch((e) => console.error("Stripe order email failed:", e));
            sendAdminOrderNotification(paidOrder).catch((e) =>
              console.error("Stripe admin notification failed:", e)
            );
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        console.log("Payment failed for order:", orderId);

        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            $set: {
              paymentStatus: "failed",
              orderStatus: "pending",
            },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const piRef = charge.payment_intent;
        const paymentIntentId = typeof piRef === "string" ? piRef : piRef?.id;

        console.log("Charge refunded:", paymentIntentId);

        if (paymentIntentId) {
          await Order.findOneAndUpdate(
            { "payment.stripePaymentIntentId": paymentIntentId },
            {
              $set: {
                paymentStatus: "refunded",
                orderStatus: "refunded",
              },
            }
          );
        }
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error("Webhook handler error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
