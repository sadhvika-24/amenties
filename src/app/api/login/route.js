
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getMasterPool } from "@/lib/db.js";

export async function POST(request) {
  try {
    const body = await request.json();

    const organizationId = String(body.organizationId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = body.password;

    // 1. Validate the required fields
    if (!organizationId || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Organization ID, email, and password are required.",
        },
        { status: 400 }
      );
    }

    if (typeof password !== "string") {
      return NextResponse.json(
        { success: false, message: "Invalid login details." },
        { status: 400 }
      );
    }

    // 2. Check the organization in the master database
    const pool = getMasterPool();

    const result = await pool.query(
      `SELECT
         id,
         organization_id,
         organization_name,
         email,
         password_hash,
         organization_database_name,
         trial_end,
         subscription_status
       FROM master_user
       WHERE UPPER(organization_id) = UPPER($1)
         AND LOWER(email) = $2
       LIMIT 1`,
      [organizationId, email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid organization ID, email, or password." },
        { status: 401 }
      );
    }

    const organization = result.rows[0];

    // 3. Verify the password against the stored bcrypt hash
    const passwordMatches = await bcrypt.compare(
      password,
      organization.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, message: "Invalid organization ID, email, or password." },
        { status: 401 }
      );
    }

    // 4. Check trial and subscription status
    const allowedStatuses = ["trial", "active"];

    if (!allowedStatuses.includes(organization.subscription_status)) {
      return NextResponse.json(
        { success: false, message: "This organization's subscription is not active." },
        { status: 403 }
      );
    }

    if (
      organization.subscription_status === "trial" &&
      new Date(organization.trial_end) <= new Date()
    ) {
      return NextResponse.json(
        { success: false, message: "The organization's trial has expired." },
        { status: 403 }
      );
    }

    // 5. Confirm the JWT secret exists
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env.local");
    }

    // 6. Create a signed login token
    const token = jwt.sign(
      {
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
        email: organization.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 7. Return the token in a secure, HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      organization: {
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
        email: organization.email,
      },
    });

    response.cookies.set("amenity_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error.message);

    return NextResponse.json(
      { success: false, message: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
