
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

export async function POST(request) {
  try {
    // 1. Verify the existing login session
    const cookieStore = await cookies();
    const token = cookieStore.get("amenity_session")?.value;

    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    let session;

    try {
      session = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    const organizationId = session.organizationId;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization information is missing from your session." },
        { status: 401 }
      );
    }

    // 2. Find this organization's tenant database
    const masterPool = getMasterPool();

    const organizationResult = await masterPool.query(
      `SELECT organization_database_name, trial_end, subscription_status
       FROM master_user
       WHERE UPPER(organization_id) = UPPER($1)
       LIMIT 1`,
      [organizationId]
    );

    if (organizationResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    const organization = organizationResult.rows[0];

    if (
      organization.subscription_status !== "active" &&
      (!organization.trial_end ||
        new Date(organization.trial_end) < new Date())
    ) {
      return NextResponse.json(
        { error: "Your organization's trial has expired." },
        { status: 403 }
      );
    }

    const databaseName = organization.organization_database_name;

    if (
      typeof databaseName !== "string" ||
      !/^org_[a-z0-9]+$/.test(databaseName)
    ) {
      return NextResponse.json(
        { error: "Invalid organization database configuration." },
        { status: 500 }
      );
    }

    // 3. Read and validate the booking details
    const body = await request.json();

    const amenityId = Number(body.amenityId);
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim() : "";
    const startTime = new Date(body.startTime);
    const endTime = new Date(body.endTime);

    if (
      !Number.isSafeInteger(amenityId) ||
      amenityId <= 0 ||
      !name ||
      name.length > 200 ||
      (email && email.length > 255) ||
      !body.startTime ||
      !body.endTime ||
      Number.isNaN(startTime.getTime()) ||
      Number.isNaN(endTime.getTime()) ||
      endTime <= startTime
    ) {
      return NextResponse.json(
        {
          error:
            "Provide a valid amenityId, name, startTime, and endTime. End time must be after start time."
        },
        { status: 400 }
      );
    }

    // 4. Confirm the amenity exists and is published
    const tenantPool = getOrgPool(databaseName);

    const amenityResult = await tenantPool.query(
      `SELECT id, name
       FROM amenity
       WHERE id = $1 AND is_published = TRUE`,
      [amenityId]
    );

    if (amenityResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Published amenity not found." },
        { status: 404 }
      );
    }

    // 5. Save the booking
    const bookingReference =
      "BK-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 8).toUpperCase();

    const bookingResult = await tenantPool.query(
      `INSERT INTO booking_history (
         booking_reference,
         amenity_id,
         booked_by_name,
         booked_by_email,
         start_time,
         end_time
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, booking_reference, amenity_id,
                 booked_by_name, booked_by_email,
                 start_time, end_time, status, created_at`,
      [
        bookingReference,
        amenityId,
        name,
        email || null,
        startTime.toISOString(),
        endTime.toISOString()
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Booking created successfully.",
        booking: bookingResult.rows[0]
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create booking API error:", error);

    return NextResponse.json(
      { error: "Unable to create booking. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const token = (await cookies()).get("amenity_session")?.value;

    if (!token || !process.env.JWT_SECRET) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    let session;

    try {
      session = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Your session has expired. Please log in again." },
        { status: 401 }
      );
    }

    if (!session.organizationId || !session.email) {
      return NextResponse.json(
        { error: "Invalid login session." },
        { status: 401 }
      );
    }

    const master = await getMasterPool().query(
      `SELECT organization_database_name, subscription_status, trial_end
       FROM master_user
       WHERE UPPER(organization_id) = UPPER($1)
       LIMIT 1`,
      [session.organizationId]
    );

    const organization = master.rows[0];

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    const status = String(organization.subscription_status).toLowerCase();

    if (
      status !== "active" &&
      status !== "trial"
    ) {
      return NextResponse.json(
        { error: "Subscription is not active." },
        { status: 403 }
      );
    }

    if (
      status === "trial" &&
      (!organization.trial_end ||
        new Date(organization.trial_end).getTime() <= Date.now())
    ) {
      return NextResponse.json(
        { error: "Your free trial has expired." },
        { status: 403 }
      );
    }

    const databaseName = organization.organization_database_name;

    if (!/^org_[a-z0-9]+$/.test(databaseName || "")) {
      return NextResponse.json(
        { error: "Invalid tenant database configuration." },
        { status: 500 }
      );
    }

    const tenant = getOrgPool(databaseName);

    const permission = await tenant.query(
      `SELECT 1
       FROM users u
       JOIN role_permissions rp ON rp.role_id = u.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE LOWER(u.email) = LOWER($1)
         AND u.is_active = TRUE
         AND p.permission_name = 'bookings.read'
       LIMIT 1`,
      [session.email]
    );

    if (permission.rows.length === 0) {
      return NextResponse.json(
        { error: "You do not have permission to view bookings." },
        { status: 403 }
      );
    }

    const result = await tenant.query(
      `SELECT
         b.id,
         b.booking_reference,
         b.amenity_id,
         a.name AS amenity_name,
         b.booked_by_name,
         b.booked_by_email,
         b.start_time,
         b.end_time,
         b.status,
         b.created_at,
         b.updated_at
       FROM booking_history b
       LEFT JOIN amenity a ON a.id = b.amenity_id
       ORDER BY b.created_at DESC`
    );

    return NextResponse.json({ bookings: result.rows });
  } catch (error) {
    console.error("List bookings API error:", error);
    return NextResponse.json(
      { error: "Unable to load booking history." },
      { status: 500 }
    );
  }
}

