
import { NextResponse, connection } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getMasterPool } from "@/lib/db.js";

export async function GET() {
  await connection();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("amenity_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Please log in first." },
        { status: 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await getMasterPool().query(
      `SELECT organization_id, organization_name, email,
              trial_start, trial_end, subscription_status
       FROM master_user
       WHERE organization_id = $1
       LIMIT 1`,
      [decoded.organizationId]
    );

    if (result.rowCount !== 1) {
      throw new Error("Organization not found.");
    }

    const org = result.rows[0];
    const now = Date.now();
    const trialEnd = org.trial_end
      ? new Date(org.trial_end).getTime()
      : null;

    let subscriptionStatus = String(
      org.subscription_status || ""
    ).toLowerCase();

    if (
      subscriptionStatus === "trial" &&
      (!trialEnd || trialEnd <= now)
    ) {
      subscriptionStatus = "expired";
    }

    const daysRemaining =
      subscriptionStatus === "trial"
        ? Math.max(0, Math.ceil((trialEnd - now) / 86400000))
        : 0;

    return NextResponse.json({
      success: true,
      organization: {
        organizationId: org.organization_id,
        organizationName: org.organization_name,
        email: org.email,
        subscriptionStatus,
        trialStart: org.trial_start,
        trialEnd: org.trial_end,
        daysRemaining,
      },
      user: {
        id: decoded.userId ?? null,
        email: decoded.email,
        role: decoded.role || "Super Admin",
        userType: decoded.userType || "organization",
      },
    });
  } catch (error) {
    console.error("Session verification failed:", error.message);

    const response = NextResponse.json(
      {
        success: false,
        message: "Your session is invalid or expired. Please log in again.",
      },
      { status: 401 }
    );

    response.cookies.set("amenity_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  }
}
