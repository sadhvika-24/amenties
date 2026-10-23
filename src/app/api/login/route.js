
import { NextResponse } from "next/server";
import { connection } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

export async function POST(request) {
  await connection();

  try {
    const body = await request.json();

    const organizationId = String(body.organizationId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = body.password;

    if (
      !organizationId ||
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Organization ID, email, and password are required.",
        },
        { status: 400 }
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env.local");
    }

    // 1. Find the organization in the master database.
    const masterPool = getMasterPool();

    const result = await masterPool.query(
      `SELECT organization_id, organization_name, email,
              password_hash, organization_database_name,
              trial_end, subscription_status
       FROM master_user
       WHERE UPPER(organization_id) = UPPER($1)
       LIMIT 1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid organization ID, email, or password.",
        },
        { status: 401 }
      );
    }

    const organization = result.rows[0];
    const subscriptionStatus = String(
      organization.subscription_status || ""
    ).toLowerCase();

    // 2. Verify that the organization can log in.
    if (!["trial", "active"].includes(subscriptionStatus)) {
      return NextResponse.json(
        {
          success: false,
          message: "This organization's subscription is not active.",
        },
        { status: 403 }
      );
    }

    if (
      subscriptionStatus === "trial" &&
      (!organization.trial_end ||
        new Date(organization.trial_end).getTime() <= Date.now())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "The organization's trial has expired.",
        },
        { status: 403 }
      );
    }

    const databaseName = organization.organization_database_name;

    if (!/^org_[a-z0-9]+$/.test(databaseName || "")) {
      throw new Error("Invalid organization database configuration.");
    }

    let user;
    let userType;

    // 3. Try the existing organization-owner account first.
    if (organization.email.toLowerCase() === email) {
      const passwordMatches = await bcrypt.compare(
        password,
        organization.password_hash
      );

      if (!passwordMatches) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid organization ID, email, or password.",
          },
          { status: 401 }
        );
      }

      user = {
        id: null,
        full_name: organization.organization_name,
        email: organization.email.toLowerCase(),
        role_name: "Super Admin",
      };

      userType = "organization";
    } else {
      // 4. Otherwise, authenticate against this organization's tenant DB.
      const tenantPool = getOrgPool(databaseName);

      const userResult = await tenantPool.query(
        `SELECT u.id, u.full_name, u.email, u.password_hash,
                r.role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE LOWER(u.email) = LOWER($1)
           AND u.is_active = TRUE
         LIMIT 1`,
        [email]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid organization ID, email, or password.",
          },
          { status: 401 }
        );
      }

      const tenantUser = userResult.rows[0];

      const passwordMatches = await bcrypt.compare(
        password,
        tenantUser.password_hash
      );

      if (!passwordMatches) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid organization ID, email, or password.",
          },
          { status: 401 }
        );
      }

      user = {
        id: tenantUser.id,
        full_name: tenantUser.full_name,
        email: tenantUser.email.toLowerCase(),
        role_name: tenantUser.role_name,
      };

      userType = "tenant";
    }

    // 5. Create the session for the authenticated account.
    const token = jwt.sign(
      {
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
        email: user.email,
        userId: user.id,
        userType,
        role: user.role_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role_name,
        userType,
      },
      organization: {
        organizationId: organization.organization_id,
        organizationName: organization.organization_name,
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
    console.error("LOGIN ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
