
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

async function getOrganization() {
  const token = (await cookies()).get("amenity_session")?.value;

  if (!token || !process.env.JWT_SECRET) return null;

  let session;
  try {
    session = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  if (
    typeof session !== "object" ||
    !session.organizationId ||
    !session.email
  ) {
    return null;
  }

  const result = await getMasterPool().query(
    `SELECT organization_database_name
     FROM master_user
     WHERE organization_id = $1
       AND LOWER(email) = LOWER($2)
       AND subscription_status IN ('trial', 'active')
       AND (subscription_status <> 'trial' OR trial_end > NOW())
     LIMIT 1`,
    [session.organizationId, session.email]
  );

  if (!result.rowCount) return null;

  const databaseName = result.rows[0].organization_database_name;

  if (!/^org_[a-z0-9]+$/.test(databaseName)) {
    throw new Error("Invalid organization database mapping");
  }

  return { session, databaseName };
}

export async function GET() {
  let pool;

  try {
    const organization = await getOrganization();

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Please log in again." },
        { status: 401 }
      );
    }

    pool = getOrgPool(organization.databaseName);

    const result = await pool.query(
      `SELECT id, name, description, location, capacity,
              is_published, created_at
       FROM amenity
       ORDER BY id DESC`
    );

    return NextResponse.json({
      success: true,
      amenities: result.rows,
    });
  } catch (error) {
    console.error("Amenities GET:", error.message);
    return NextResponse.json(
      { success: false, message: "Unable to load amenities." },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}

export async function POST(request) {
  let pool;

  try {
    const organization = await getOrganization();

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Please log in again." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const location = String(body.location || "").trim();
    const capacity = Number(body.capacity);

    if (
      !name ||
      name.length > 200 ||
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 100000
    ) {
      return NextResponse.json(
        { success: false, message: "Enter a name and a valid capacity." },
        { status: 400 }
      );
    }

    pool = getOrgPool(organization.databaseName);

    const roleResult = await pool.query(
      `SELECT r.role_name, p.permission_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE LOWER(u.email) = LOWER($1)
         AND u.is_active = TRUE`,
      [organization.session.email]
    );

    const allowed = roleResult.some(
      (row) => row.permission_name === "amenities.manage"
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "You cannot create amenities." },
        { status: 403 }
      );
    }

    const result = await pool.query(
      `INSERT INTO amenity
         (name, description, location, capacity, is_published)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, name, description, location, capacity, is_published`,
      [name, description || null, location || null, capacity]
    );

    return NextResponse.json(
      { success: true, amenity: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Amenities POST:", error.message);
    return NextResponse.json(
      { success: false, message: "Unable to create amenity." },
      { status: 500 }
    );
  } finally {
    if (pool) await pool.end().catch(() => {});
  }
}
