
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getMasterPool, getOrgPool } from "@/lib/db.js";

async function getEmployeeContext() {
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

async function canManageEmployees(pool, email) {
  const result = await pool.query(
    `SELECT 1
     FROM users u
     JOIN role_permissions rp ON rp.role_id = u.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE LOWER(u.email) = LOWER($1)
       AND u.is_active = TRUE
       AND p.permission_name = 'employees.manage'
     LIMIT 1`,
    [email]
  );

  return result.rows.length > 0;
}

export async function GET() {
  try {
    const context = await getEmployeeContext();

    if (context.error) {
      return Response.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const allowed = await canManageEmployees(
      context.pool,
      context.email
    );

    if (!allowed) {
      return Response.json(
        { error: "You do not have permission to view employees." },
        { status: 403 }
      );
    }

    const result = await context.pool.query(
      `SELECT id, employee_code, full_name, email, phone, job_title, created_at
       FROM employees
       ORDER BY id DESC`
    );

    return Response.json({ employees: result.rows });
  } catch (error) {
    console.error("GET employees error:", error);

    return Response.json(
      { error: "Unable to load employees. Check the server terminal." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const context = await getEmployeeContext();

    if (context.error) {
      return Response.json(
        { error: context.error },
        { status: context.status }
      );
    }

    const allowed = await canManageEmployees(
      context.pool,
      context.email
    );

    if (!allowed) {
      return Response.json(
        { error: "You do not have permission to add employees." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const employeeCode =
      typeof body.employee_code === "string"
        ? body.employee_code.trim()
        : "";
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : "";
    const jobTitle =
      typeof body.job_title === "string" ? body.job_title.trim() : "";

    if (!fullName || fullName.length > 200) {
      return Response.json(
        { error: "Full name is required and must be at most 200 characters." },
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

    if (employeeCode.length > 100 || phone.length > 50 || jobTitle.length > 150) {
      return Response.json(
        { error: "One or more fields exceed the allowed length." },
        { status: 400 }
      );
    }

    const result = await context.pool.query(
      `INSERT INTO employees
         (employee_code, full_name, email, phone, job_title)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, employee_code, full_name, email, phone, job_title, created_at`,
      [
        employeeCode || null,
        fullName,
        email,
        phone || null,
        jobTitle || null,
      ]
    );

    return Response.json(
      {
        message: "Employee added successfully.",
        employee: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST employees error:", error);

    if (error.code === "23505") {
      return Response.json(
        { error: "That employee email or employee code already exists." },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Unable to add employee. Check the server terminal." },
      { status: 500 }
    );
  }
}
