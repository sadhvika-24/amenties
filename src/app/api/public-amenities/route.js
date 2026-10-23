
import { NextResponse, connection } from "next/server";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

export async function GET(request) {
  await connection();

  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required." },
        { status: 400 }
      );
    }

    const masterPool = getMasterPool();

    const result = await masterPool.query(
      `SELECT organization_id, organization_database_name,
              trial_end, subscription_status
       FROM master_user
       WHERE UPPER(organization_id) = UPPER($1)
       LIMIT 1`,
      [organizationId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    const organization = result.rows[0];
    const status = String(
      organization.subscription_status || ""
    ).toLowerCase();

    if (!["active", "trial"].includes(status)) {
      return NextResponse.json(
        { error: "Organization subscription is not active." },
        { status: 403 }
      );
    }

    if (
      status === "trial" &&
      (!organization.trial_end ||
        new Date(organization.trial_end).getTime() <= Date.now())
    ) {
      return NextResponse.json(
        { error: "Organization trial has expired." },
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

    const tenantPool = getOrgPool(databaseName);

    const amenities = await tenantPool.query(
      `SELECT id, name, description, location, capacity
       FROM amenity
       WHERE is_published = TRUE
       ORDER BY name`
    );

    return NextResponse.json({ amenities: amenities.rows });
  } catch (error) {
    console.error("Public amenities API error:", error);

    return NextResponse.json(
      { error: "Unable to load published amenities." },
      { status: 500 }
    );
  }
}
