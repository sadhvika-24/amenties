
import { connection } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { cookies } from "next/headers";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

async function getUserContext() {
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
    `SELECT organization_database_name, subscription_status, trial_end
     FROM master_user
     WHERE UPPER(organization_id) = UPPER($1)
       AND LOWER(email) = LOWER($2)
     LIMIT 1`,
    [session.organizationId, session.email]
  );

  const organization = result.rows[0];

  if (!organization) {
    return { error: "Organization not found.", status: 404 };
  }

  const status = String(organization.subscription_status).toLowerCase();

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

  const databaseName = organization.organization_database_name;

  if (!/^org_[a-z0-9]+$/.test(databaseName || "")) {
    return {
      error: "Invalid organization database configuration.",
      status: 500,
    };
  }

  return {
    pool: getOrgPool(databaseName),
    email: session.email,
  };
}

async function canManageUsers(pool, email) {
  const result = await pool.query(
    `SELECT 1
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE LOWER(u.email) = LOWER($1)
       AND u.is_active = TRUE
       AND p.permission_name = 'users.manage'
     LIMIT 1`,
    [email]
  );

  return result.rows.length > 0;
}

export async function GET() {
  await connection();

  try {
    const context = await getUserContext();

    if (context.error) {
      return Response.json(
        { error: context.error },
        { status: context.status }
      );
    }

    if (!(await canManageUsers(context.pool, context.email))) {
      return Response.json(
        { error: "You do not have permission to manage users." },
        { status: 403 }
      );
    }

    const [usersResult, rolesResult] = await Promise.all([
      context.pool.query(
        `SELECT u.id, u.full_name, u.email, u.employee_id,
                u.role_id, r.role_name, u.is_active, u.created_at
         FROM users u
         JOIN roles r ON r.id = u.role_id
         ORDER BY u.id DESC`
      ),
      context.pool.query(
        `SELECT id, role_name, description
         FROM roles
         ORDER BY id`
      ),
    ]);

    return Response.json({
      users: usersResult.rows,
      roles: rolesResult.rows,
    });
  } catch (error) {
    console.error("GET users error:", error);

    return Response.json(
      { error: "Unable to load users. Check the server terminal." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  await connection();

  try {
    const context = await getUserContext();

    if (context.error) {
      return Response.json(
        { error: context.error },
        { status: context.status }
      );
    }

    if (!(await canManageUsers(context.pool, context.email))) {
      return Response.json(
        { error: "You do not have permission to manage users." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const roleId = Number(body.role_id);

    if (!fullName || fullName.length > 200) {
      return Response.json(
        { error: "Enter a name with no more than 200 characters." },
        { status: 400 }
      );
    }

    if (
      !email ||
      email.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (
      password.length < 8 ||
      password.length > 72 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return Response.json(
        { error: "Password must be 8–72 characters and at most 72 UTF-8 bytes." },
        { status: 400 }
      );
    }

    if (!Number.isSafeInteger(roleId) || roleId <= 0) {
      return Response.json(
        { error: "Select a valid role." },
        { status: 400 }
      );
    }

    const roleResult = await context.pool.query(
      "SELECT id FROM roles WHERE id = $1",
      [roleId]
    );

    if (roleResult.rows.length === 0) {
      return Response.json(
        { error: "The selected role does not exist." },
        { status: 400 }
      );
    }

    const duplicateResult = await context.pool.query(
      "SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email]
    );

    if (duplicateResult.rows.length > 0) {
      return Response.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await context.pool.query(
      `INSERT INTO users
         (full_name, email, password_hash, role_id, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, full_name, email, employee_id,
                 role_id, is_active, created_at`,
      [fullName, email, passwordHash, roleId]
    );

    return Response.json(
      {
        message: "User created successfully.",
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error.code === "23505") {
      return Response.json(
        { error: "A user with this email already exists." },
        { status: 409 }
      );
    }

    console.error("POST users error:", error);

    return Response.json(
      { error: "Unable to create user. Check the server terminal." },
      { status: 500 }
    );
  }
}
