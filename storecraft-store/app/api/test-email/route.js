import { NextResponse } from "next/server";
import { sendTestEmail } from "@/lib/email";

/** Development-only email smoke test. Disabled in production. */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  try {
    const result = await sendTestEmail();
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Send failed" }, { status: 500 });
    }
    return NextResponse.json({
      success: true,
      message: "Test email sent",
      to: result.to,
      messageId: result.messageId,
    });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Send failed" }, { status: 500 });
  }
}
