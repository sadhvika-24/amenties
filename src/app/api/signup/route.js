
import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import { getMasterPool, getOrgDatabaseName, getOrgPool } from "@/lib/db.js";
import {
  createTenantDatabase,
  initializeTenantDatabase,
} from "@/lib/tenant-db.js";


const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function deleteTenantDatabase(databaseName) {
  const { NEON_API_KEY, NEON_PROJECT_ID, NEON_BRANCH_ID } = process.env;

  const url =
    `https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}` +
    `/branches/${NEON_BRANCH_ID}/databases/${encodeURIComponent(databaseName)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${NEON_API_KEY}`,
      Accept: "application/json",
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Tenant cleanup failed: HTTP ${response.status}`);
  }
}

async function initializeWithRetry(databaseName) {
  let lastError;

  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      return await initializeTenantDatabase(databaseName);
    } catch (error) {
      lastError = error;
      if (attempt < 6) await wait(1500);
    }
  }

  throw lastError;
}

export async function POST(request) {
  let databaseName;
  let databaseCreated = false;
  let tenantPool;
  let masterRecordSaved = false;

  try {
    const body = await request.json();

    const organizationName = String(body.organizationName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!organizationName || !email || !password || !confirmPassword) {
      return Response.json(
        { success: false, message: "All signup fields are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { success: false, message: "Enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        { success: false, message: "Password must contain at least 8 characters." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return Response.json(
        { success: false, message: "Passwords do not match." },
        { status: 400 }
      );
    }

    const masterPool = getMasterPool();

    const existing = await masterPool.query(
      "SELECT id FROM master_user WHERE email = $1 LIMIT 1",
      [email]
    );

    if (existing.rowCount > 0) {
      return Response.json(
        { success: false, message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const organizationId =
      `ORG-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

    databaseName = getOrgDatabaseName(organizationId);

    const passwordHash = await bcrypt.hash(password, 12);
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Create the new database in the configured Neon branch.
    await createTenantDatabase(databaseName);
    databaseCreated = true;

    // Create the tenant schema and default roles/permissions.
    await initializeWithRetry(databaseName);

    // Create the first organization user as Super Admin.
    tenantPool = getOrgPool(databaseName);

    const adminRole = await tenantPool.query(
      "SELECT id FROM roles WHERE role_name = $1",
      ["Super Admin"]
    );

    if (adminRole.rowCount !== 1) {
      throw new Error("Super Admin role was not initialized.");
    }

    await tenantPool.query(
      `INSERT INTO users
        (role_id, full_name, email, password_hash, is_active)
       VALUES ($1, $2, $3, $4, TRUE)`,
      [adminRole.rows[0].id, organizationName, email, passwordHash]
    );

    await tenantPool.end();
    tenantPool = null;

    // Save the organization only after tenant setup succeeds.
    await masterPool.query(
      `INSERT INTO master_user (
        organization_id,
        organization_name,
        email,
        password_hash,
        organization_database_name,
        trial_start,
        trial_end,
        subscription_status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
      [
        organizationId,
        organizationName,
        email,
        passwordHash,
        databaseName,
        trialStart,
        trialEnd,
        "trial",
      ]
    );

    masterRecordSaved = true;

    return Response.json(
      {
        success: true,
        message: "Organization registered successfully.",
        organization: {
          organizationId,
          organizationName,
          email,
          trialEnd: trialEnd.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (tenantPool) {
      await tenantPool.end().catch(() => {});
    }

    // Remove only the tenant database created by this signup attempt.
    if (databaseCreated && !masterRecordSaved && databaseName) {
      try {
        await deleteTenantDatabase(databaseName);
      } catch (cleanupError) {
        console.error("Tenant cleanup failed:", cleanupError.message);
      }
    }

    console.error("Signup provisioning failed:", error.message);

    return Response.json(
      {
        success: false,
        message: "Signup could not be completed. Please check the server logs.",
      },
      { status: 500 }
    );
  }
}
