
import "dotenv/config";
import { initializeTenantDatabase } from "./src/lib/tenant-db.js";

const databaseName = "org_orgf9f2ac8e";

try {
  const result = await initializeTenantDatabase(databaseName);
  console.log("Tenant initialization result:", result);
  process.exitCode = 0;
} catch (error) {
  console.error("Tenant initialization failed:", error.message);
  process.exitCode = 1;
}
