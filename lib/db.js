
import { Pool } from "pg";

let masterPool;

export function getMasterPool() {
  if (!process.env.MASTER_DB_URL) {
    throw new Error("MASTER_DB_URL is missing from .env.local");
  }

  if (!masterPool) {
    masterPool = new Pool({
      connectionString: process.env.MASTER_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }

  return masterPool;
}

export function getOrgDatabaseName(organizationId) {
  const safeId = String(organizationId).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

  if (!safeId) {
    throw new Error("Invalid organization ID");
  }

  return `org_${safeId}`.slice(0, 63);
}

export function makeOrgConnectionString(databaseName) {
  const url = new URL(process.env.MASTER_DB_URL);
  url.pathname = `/${databaseName}`;
  return url.toString();
}
