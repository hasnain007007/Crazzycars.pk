import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
          step: "parse",
        },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = body;

    // Validate
    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "All fields are required",
          step: "validation",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 6 characters",
          step: "validation",
        },
        { status: 400 }
      );
    }

    // Connect DB
    try {
      await dbConnect();
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed",
          step: "db_connect",
        },
        { status: 500 }
      );
    }

    // Check existing
    const existing = await Customer.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Email already registered. Please login.",
          step: "duplicate",
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const customerData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      passwordHash: hashedPassword,
      isActive: true,
    };

    const customer = await Customer.create(customerData);

    if (!process.env.JWT_SECRET) {
      console.error("[register] JWT_SECRET is not set");
      return NextResponse.json(
        {
          success: false,
          error: "Server configuration error",
          step: "jwt",
        },
        { status: 500 }
      );
    }

    // Create JWT
    const token = jwt.sign(
      {
        customerId: String(customer._id),
        sub: String(customer._id),
        email: customer.email,
        type: "store_customer",
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    const response = NextResponse.json({
      success: true,
      customer: {
        id: String(customer._id),
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
    });

    response.cookies.set("customer_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (e) {
    console.error("[register] error:", e);
    return NextResponse.json(
      {
        success: false,
        error: e.message || "Registration failed",
        step: "unknown",
      },
      { status: 500 }
    );
  }
}
