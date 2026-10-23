
import { Pool } from "pg";

let masterPool;
const tenantPools = new Map();

export function getMasterPool() {
  const connectionString = process.env.MASTER_DB_URL;

  if (!connectionString) {
    throw new Error("MASTER_DB_URL is missing from .env.local");
  }

  if (!masterPool) {
    masterPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    masterPool.on("error", (error) => {
      console.error("Master database pool error:", error.message);
    });
  }

  return masterPool;
}

export function getOrgDatabaseName(organizationId) {
  const safeId = String(organizationId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  if (!safeId) {
    throw new Error("Invalid organization ID");
  }

  const databaseName = `org_${safeId}`;

  if (databaseName.length > 63) {
    throw new Error("Tenant database name is too long");
  }

  return databaseName;
}

export function makeOrgConnectionString(databaseName) {
  if (
    typeof databaseName !== "string" ||
    !/^org_[a-z0-9]+$/.test(databaseName)
  ) {
    throw new Error("Invalid tenant database name");
  }

  const masterUrl = process.env.MASTER_DB_URL;

  if (!masterUrl) {
    throw new Error("MASTER_DB_URL is missing from .env.local");
  }

  const url = new URL(masterUrl);
  url.pathname = `/${databaseName}`;

  return url.toString();
}

export function getOrgPool(databaseName) {
  if (
    typeof databaseName !== "string" ||
    !/^org_[a-z0-9]+$/.test(databaseName)
  ) {
    throw new Error("Invalid tenant database name");
  }

  if (!tenantPools.has(databaseName)) {
    const pool = new Pool({
      connectionString: makeOrgConnectionString(databaseName),
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (error) => {
      console.error(
        `Tenant database pool error (${databaseName}):`,
        error.message
      );
    });

    tenantPools.set(databaseName, pool);
  }

  return tenantPools.get(databaseName);
}
