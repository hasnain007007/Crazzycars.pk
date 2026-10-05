/**
 * GET /api/mobile/v1/faq
 * Structured FAQ (question/answer) from the same source as web /faq (getFaqItems).
 * Public — no auth.
 */
import { NextResponse } from "next/server";
import { getFaqItems } from "@/lib/storePolicyCopy";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = getFaqItems().map((row) => ({
      question: String(row.question || "").trim(),
      answer: String(row.answer || "").trim(),
    })).filter((row) => row.question && row.answer);

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
    );
  } catch (err) {
    console.error("[mobile/faq]", err);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Could not load FAQ." } },
      { status: 500 },
    );
  }
}
