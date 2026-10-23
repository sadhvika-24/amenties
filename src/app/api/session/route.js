
import { NextResponse, connection } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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

    return NextResponse.json({
      success: true,
      organization: {
        organizationId: decoded.organizationId,
        organizationName: decoded.organizationName,
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
