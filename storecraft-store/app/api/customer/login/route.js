import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Customer from "@/lib/models/Customer.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    // Step 1: Parse body
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

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password required",
          step: "validation",
        },
        { status: 400 }
      );
    }

    // Step 2: Connect to DB
    try {
      await dbConnect();
    } catch (e) {
      console.error("[customer/login] db_connect:", e);
      return NextResponse.json(
        {
          success: false,
          error: "Database connection failed: " + e.message,
          step: "db_connect",
        },
        { status: 500 }
      );
    }

    // Step 3: Find customer
    let customer;
    try {
      customer = await Customer.findOne({
        email: email.toLowerCase().trim(),
      });
    } catch (e) {
      console.error("[customer/login] find_customer:", e);
      return NextResponse.json(
        {
          success: false,
          error: "Database query failed: " + e.message,
          step: "find_customer",
        },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
          step: "not_found",
        },
        { status: 401 }
      );
    }

    // Step 4: Check password
    let isValid = false;
    try {
      const passwordToCheck =
        customer.password || customer.passwordHash || "";

      if (!passwordToCheck) {
        return NextResponse.json(
          {
            success: false,
            error: "Account has no password set. Please register again.",
            step: "no_password",
          },
          { status: 401 }
        );
      }

      isValid = await bcrypt.compare(password, passwordToCheck);
    } catch (e) {
      console.error("[customer/login] bcrypt:", e);
      return NextResponse.json(
        {
          success: false,
          error: "Password check failed: " + e.message,
          step: "bcrypt",
        },
        { status: 500 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
          step: "wrong_password",
        },
        { status: 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      console.error("[customer/login] jwt: JWT_SECRET is not set");
      return NextResponse.json(
        {
          success: false,
          error: "Token creation failed: JWT_SECRET is not configured",
          step: "jwt",
        },
        { status: 500 }
      );
    }

    // Step 5: Create JWT
    let token;
    try {
      token = jwt.sign(
        {
          customerId: String(customer._id),
          email: customer.email,
          type: "store_customer",
          sub: String(customer._id),
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );
    } catch (e) {
      console.error("[customer/login] jwt:", e);
      return NextResponse.json(
        {
          success: false,
          error: "Token creation failed: " + e.message,
          step: "jwt",
        },
        { status: 500 }
      );
    }

    // Step 6: Update last login
    try {
      customer.lastLogin = new Date();
      await customer.save();
    } catch (e) {
      console.error("[customer/login] last_login save failed:", e);
    }

    // Step 7: Set cookie and return
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
    console.error("[customer/login] unknown:", e);
    return NextResponse.json(
      {
        success: false,
        error: e.message,
        stack:
          process.env.NODE_ENV === "development" ? e.stack : undefined,
        step: "unknown",
      },
      { status: 500 }
    );
  }
}
