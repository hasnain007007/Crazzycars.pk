/**
 * GET /api/mobile/v1/faq
 * Structured FAQ (question/answer) from the same source as web /faq (getFaqItems).
 * Public — no auth.
 */
import { NextResponse } from "next/server";
import { PREPAID_DISCOUNT_PERCENT } from "@/config/checkout-money";
import { dbConnect } from "@/lib/db";
import Settings, { SETTINGS_SINGLETON_KEY } from "@/lib/models/Settings.model";
import { getFaqItems } from "@/lib/storePolicyCopy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await dbConnect();
    const settingsDoc =
      (await Settings.findOne({ singletonKey: SETTINGS_SINGLETON_KEY }).lean()) ||
      (await Settings.findOne({}).lean());
    const prepaidPercent =
      Number(settingsDoc?.storePayment?.advancePaymentDiscountPercent) ||
      PREPAID_DISCOUNT_PERCENT;

    const items = getFaqItems({ prepaidPercent })
      .map((row) => ({
        question: String(row.question || "").trim(),
        answer: String(row.answer || "").trim(),
      }))
      .filter((row) => row.question && row.answer);

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
    );
  } catch (err) {
    console.error("[mobile/faq]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not load FAQ." } },
      { status: 500 }
    );
  }
}
