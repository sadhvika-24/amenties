
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

async function getOrganization() {
  const token = (await cookies()).get("amenity_session")?.value;

  if (!token || !process.env.JWT_SECRET) {
    return { error: "Please log in again.", status: 401 };
  }

  let session;

  try {
    session = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return {
      error: "Your session has expired. Please log in again.",
      status: 401,
    };
  }

  if (!session.organizationId || !session.email) {
    return { error: "Invalid login session.", status: 401 };
  }

  const result = await getMasterPool().query(
    `SELECT organization_id, organization_database_name,
            subscription_status, trial_end
     FROM master_user
     WHERE organization_id = $1
       AND LOWER(email) = LOWER($2)
     LIMIT 1`,
    [session.organizationId, session.email]
  );

  const organization = result.rows[0];

  if (!organization) {
    return { error: "Organization not found.", status: 404 };
  }

  const status = String(
    organization.subscription_status
  ).toLowerCase();

  if (status !== "active" && status !== "trial") {
    return { error: "Your subscription is not active.", status: 403 };
  }

  if (
    status === "trial" &&
    (!organization.trial_end ||
      new Date(organization.trial_end).getTime() <= Date.now())
  ) {
    return { error: "Your free trial has expired.", status: 403 };
  }

  if (
    !/^org_[a-z0-9]+$/.test(
      organization.organization_database_name || ""
    )
  ) {
    return {
      error: "Invalid tenant database configuration.",
      status: 500,
    };
  }

  return {
    organization,
    pool: getOrgPool(organization.organization_database_name),
    email: session.email,
  };
}

async function hasPermission(pool, email, permission) {
  const result = await pool.query(
    `SELECT p.permission_name
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE LOWER(u.email) = LOWER($1)
       AND u.is_active = TRUE`,
    [email]
  );

  return result.rows.some(
    (row) => row.permission_name === permission
  );
}

export async function GET() {
  try {
    const context = await getOrganization();

    if (context.error) {
      return Response.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const result = await context.pool.query(
      `SELECT id, name, description, location, capacity,
              is_published, created_at, updated_at
       FROM amenity
       ORDER BY id DESC`
    );

    return Response.json({ amenities: result.rows });
  } catch (error) {
    console.error("GET amenities error:", error);

    return Response.json(
      { error: "Unable to load amenities. Check the server logs." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const context = await getOrganization();

    if (context.error) {
      return Response.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const allowed = await hasPermission(
      context.pool,
      context.email,
      "amenities.manage"
    );

    if (!allowed) {
      return Response.json(
        { error: "You do not have permission to add amenities." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = String(body.description || "").trim();
    const location = String(body.location || "").trim();

    if (!name) {
      return Response.json(
        { error: "Amenity name is required." },
        { status: 400 }
      );
    }

    let capacity = null;

    if (
      body.capacity !== undefined &&
      body.capacity !== null &&
      String(body.capacity).trim() !== ""
    ) {
      capacity = Number(body.capacity);

      if (!Number.isInteger(capacity) || capacity <= 0) {
        return Response.json(
          { error: "Capacity must be a positive whole number." },
          { status: 400 }
        );
      }
    }

    const result = await context.pool.query(
      `INSERT INTO amenity
         (name, description, location, capacity, is_published)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, name, description, location, capacity,
                 is_published, created_at, updated_at`,
      [
        name,
        description || null,
        location || null,
        capacity,
      ]
    );

    return Response.json(
      {
        message: "Amenity created successfully.",
        amenity: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST amenities error:", error);

    return Response.json(
      { error: "Unable to save amenity. Check the server logs." },
      { status: 500 }
    );
  }
}
