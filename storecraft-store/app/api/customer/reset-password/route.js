import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { passwordResetFingerprintMatches } from "@/lib/passwordResetFingerprint";

export async function POST(req) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Token and password are required",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters",
        },
        { status: 400 }
      );
    }

    if (!process.env.JWT_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
        },
        { status: 500 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Reset link is invalid or has expired",
        },
        { status: 400 }
      );
    }

    if (decoded.type !== "password_reset") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid reset token",
        },
        { status: 400 }
      );
    }

    await dbConnect();

    // Link is single-use: it was issued against the then-current hash.
    const current = await Customer.findById(decoded.customerId).select("password passwordHash").lean();
    const storedHash = current?.password || current?.passwordHash || "";
    if (!current || !passwordResetFingerprintMatches(decoded.pwf, storedHash)) {
      return NextResponse.json(
        {
          success: false,
          error: "Reset link is invalid or has expired",
        },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const updated = await Customer.findOneAndUpdate(
      {
        _id: decoded.customerId,
        // Compare-and-set: a second concurrent use of the same link finds no match.
        [current.password ? "password" : "passwordHash"]: storedHash,
      },
      {
        $set: {
          password: hashedPassword,
          passwordHash: hashedPassword,
        },
      },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Reset password error:", e);
    return NextResponse.json(
      {
        success: false,
        error: e.message,
      },
      { status: 500 }
    );
  }
}
