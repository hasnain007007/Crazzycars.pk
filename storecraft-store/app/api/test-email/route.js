import { NextResponse } from "next/server";
import { getAdminEmail, getFromEmail, sendTestEmail } from "@/lib/email";

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ success: false, error: "RESEND_API_KEY not set" });
  }

  try {
    const result = await sendTestEmail();

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
        keyPrefix: apiKey.substring(0, 15) + "...",
        fromEmail: getFromEmail(),
        adminEmail: getAdminEmail(),
      });
    }

    return NextResponse.json({
      success: true,
      message: "Test email sent!",
      to: result.to,
      messageId: result.messageId,
      keyPrefix: apiKey.substring(0, 15) + "...",
      fromEmail: getFromEmail(),
      adminEmail: getAdminEmail(),
    });
  } catch (e) {
    return NextResponse.json({
      success: false,
      error: e.message,
      keyPrefix: apiKey.substring(0, 15) + "...",
      fromEmail: getFromEmail(),
      adminEmail: getAdminEmail(),
    });
  }
}
