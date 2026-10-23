
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

async function getContext() {
  const token = (await cookies()).get("amenity_session")?.value;

  if (!token || !process.env.JWT_SECRET) {
    return {
      error: "Please log in again.",
      status: 401,
    };
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
    `SELECT organization_database_name, subscription_status, trial_end
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
    return { error: "Subscription is inactive.", status: 403 };
  }

  if (
    status === "trial" &&
    (!organization.trial_end ||
      new Date(organization.trial_end).getTime() <= Date.now())
  ) {
    return { error: "Your free trial has expired.", status: 403 };
  }

  const databaseName = organization.organization_database_name;

  if (!/^org_[a-z0-9]+$/.test(databaseName || "")) {
    return {
      error: "Invalid tenant database configuration.",
      status: 500,
    };
  }

  return {
    pool: getOrgPool(databaseName),
    email: session.email,
  };
}

async function hasPermission(pool, email, permission) {
  const result = await pool.query(
    `SELECT 1
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE LOWER(u.email) = LOWER($1)
       AND u.is_active = TRUE
       AND p.permission_name = $2
     LIMIT 1`,
    [email, permission]
  );

  return result.rows.length > 0;
}

function sendError(error) {
  console.error("Amenity operation error:", error);

  return NextResponse.json(
    { error: error.message || "Unable to complete the operation." },
    { status: error.status || 500 }
  );
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const amenityId = Number(id);

    if (!Number.isInteger(amenityId) || amenityId < 1) {
      return NextResponse.json(
        { error: "Invalid amenity ID." },
        { status: 400 }
      );
    }

    const context = await getContext();

    if (context.error) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const body = await request.json();
    const isPublishAction = typeof body.is_published === "boolean";

    const permission = isPublishAction
      ? "amenities.publish"
      : "amenities.manage";

    if (
      !(await hasPermission(context.pool, context.email, permission))
    ) {
      return NextResponse.json(
        { error: `Missing permission: ${permission}` },
        { status: 403 }
      );
    }

    let result;

    if (isPublishAction) {
      result = await context.pool.query(
        `UPDATE amenity
         SET is_published = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, description, location, capacity,
                   is_published, created_at, updated_at`,
        [body.is_published, amenityId]
      );
    } else {
      const name = String(body.name || "").trim();
      const description = String(body.description || "").trim();
      const location = String(body.location || "").trim();
      const capacity = Number(body.capacity);

      if (!name) {
        return NextResponse.json(
          { error: "Amenity name is required." },
          { status: 400 }
        );
      }

      if (!Number.isInteger(capacity) || capacity < 1) {
        return NextResponse.json(
          { error: "Capacity must be a positive whole number." },
          { status: 400 }
        );
      }

      result = await context.pool.query(
        `UPDATE amenity
         SET name = $1,
             description = $2,
             location = $3,
             capacity = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, name, description, location, capacity,
                   is_published, created_at, updated_at`,
        [
          name,
          description || null,
          location || null,
          capacity,
          amenityId,
        ]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Amenity not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Amenity updated successfully.",
      amenity: result.rows[0],
    });
  } catch (error) {
    return sendError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const amenityId = Number(id);

    if (!Number.isInteger(amenityId) || amenityId < 1) {
      return NextResponse.json(
        { error: "Invalid amenity ID." },
        { status: 400 }
      );
    }

    const context = await getContext();

    if (context.error) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status }
      );
    }

    if (
      !(await hasPermission(
        context.pool,
        context.email,
        "amenities.manage"
      ))
    ) {
      return NextResponse.json(
        { error: "You do not have permission to delete amenities." },
        { status: 403 }
      );
    }

    const existing = await context.pool.query(
      "SELECT id FROM amenity WHERE id = $1",
      [amenityId]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "Amenity not found." },
        { status: 404 }
      );
    }

    const bookings = await context.pool.query(
      "SELECT 1 FROM booking_history WHERE amenity_id = $1 LIMIT 1",
      [amenityId]
    );

    if (bookings.rows.length > 0) {
      return NextResponse.json(
        {
          error:
            "This amenity has booking history. Unpublish it instead of deleting it.",
        },
        { status: 409 }
      );
    }

    await context.pool.query(
      "DELETE FROM amenity WHERE id = $1",
      [amenityId]
    );

    return NextResponse.json({
      message: "Amenity deleted successfully.",
    });
  } catch (error) {
    return sendError(error);
  }
}
