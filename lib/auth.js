import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { tenant } from "./db";
export const j = (d, s = 200) => Response.json(d, { status: s });
export const sign = (p) => jwt.sign(p, process.env.JWT_SECRET, { expiresIn: "8h" });
const hits = new Map(); // simple in-memory rate limiter (use Redis in production)
export function limited(key, max = 10, ms = 60000) {
  const now = Date.now(), a = (hits.get(key) || []).filter((t) => now - t < ms);
  a.push(now); hits.set(key, a); return a.length > max;
}
export const ip = (req) => req.headers.get("x-forwarded-for") || "local";
// Verifies session, re-checks employee + role + permission in the DB on every call.
export async function guard(resource, action) {
  let s;
  try { s = jwt.verify((await cookies()).get("token")?.value, process.env.JWT_SECRET); }
  catch { return { err: j({ error: "Not authenticated" }, 401) }; }
  const t = await tenant(s.orgId);
  if (!t) return { err: j({ error: "Not authenticated" }, 401) };
  const e = await t.db.query("SELECT e.id,e.name,r.name AS role FROM employees e JOIN roles r ON r.id=e.role_id WHERE e.id=$1 AND e.active", [s.employeeId]);
  if (!e.rowCount) return { err: j({ error: "Not authenticated" }, 401) };
  if (resource) {
    const p = await t.db.query("SELECT 1 FROM permissions p JOIN roles r ON r.id=p.role_id WHERE r.name=$1 AND p.resource=$2 AND p.action=$3", [e.rows[0].role, resource, action]);
    if (!p.rowCount) return { err: j({ error: "Forbidden" }, 403) };
    if (action !== "read" && new Date(t.org.trial_period_ends) < new Date())
      return { err: j({ error: "Trial expired: read-only mode" }, 402) };
  }
  return { t, user: e.rows[0], orgId: s.orgId };
}
export const wrap = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { console.error(e); return j({ error: "Server error" }, 500); } };