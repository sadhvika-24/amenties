
import { Pool } from "pg";

let masterPool;
const orgPools = new Map();

export function getMasterPool() {
  if (!process.env.MASTER_DB_URL) {
    throw new Error("MASTER_DB_URL is missing from .env.local");
  }

  if (!masterPool) {
    masterPool = new Pool({
      connectionString: process.env.MASTER_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
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

  return `org_${safeId}`.slice(0, 63);
}

export function makeOrgConnectionString(databaseName) {
  if (!/^org_[a-z0-9]+$/.test(databaseName)) {
    throw new Error("Invalid tenant database name");
  }

  const url = new URL(process.env.MASTER_DB_URL);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export function getOrgPool(databaseName) {
  if (!/^org_[a-z0-9]+$/.test(databaseName)) {
    throw new Error("Invalid tenant database name");
  }

  if (!orgPools.has(databaseName)) {
    const pool = new Pool({
      connectionString: makeOrgConnectionString(databaseName),
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 10000,
    });

    orgPools.set(databaseName, pool);
  }

  return orgPools.get(databaseName);
}
