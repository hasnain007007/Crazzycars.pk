import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import { comparePassword } from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginAttempts,
  loginRateLimitKey,
  rateLimitMessage,
  rateLimitResponseInit,
  recordAttempt,
} from "@/lib/loginRateLimit";
import { requestIp } from "@/lib/requestIp";
import { setStoreCustomerAuthCookie, signStoreCustomerToken } from "@/lib/storeAuth";

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required." }, { status: 400 });
    }

    // Shares the "customer-login" scope with /api/customer/login so alternating
    // between the two endpoints cannot be used to double the attempt budget.
    const limitKey = loginRateLimitKey("customer-login", email, requestIp(request));
    const limit = await checkLoginRateLimit(limitKey);
    if (limit.limited) {
      return NextResponse.json(
        { success: false, error: rateLimitMessage(limit.retryAfterSeconds) },
        rateLimitResponseInit(limit.retryAfterSeconds)
      );
    }

    const customer = await Customer.findOne({ email, isActive: { $ne: false } });
    const storedHash = customer?.password || customer?.passwordHash || "";
    if (!storedHash) {
      await recordAttempt(limitKey);
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }
    const ok = await comparePassword(password, storedHash);
    if (!ok) {
      await recordAttempt(limitKey);
      return NextResponse.json({ success: false, error: "Invalid email or password." }, { status: 401 });
    }

    await clearLoginAttempts(limitKey);

    customer.lastLogin = new Date();
    await customer.save();

    const lean = await Customer.findById(customer._id).select("-passwordHash").lean();
    const token = signStoreCustomerToken(customer._id.toString());
    const res = NextResponse.json({
      success: true,
      customer: {
        id: lean._id.toString(),
        name: lean.name,
        email: lean.email,
        phone: lean.phone || "",
      },
    });
    setStoreCustomerAuthCookie(res, token);
    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || "Login failed." }, { status: 500 });
  }
}
