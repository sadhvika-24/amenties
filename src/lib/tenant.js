
import { Pool } from "pg";
import { masterPool } from "./db.js";

const tenantPools = new Map();

export function makeDatabaseName(orgId) {
  const normalized = orgId.trim().toLowerCase();

  if (!/^[a-z0-9]{1,55}$/.test(normalized)) {
    throw new Error("Invalid Organization ID");
  }

  return `${normalized}_db`;
}

export function tenantConnectionString(databaseName) {
  if (!/^[a-z0-9]{1,55}_db$/.test(databaseName)) {
    throw new Error("Invalid database name");
  }

  const url = new URL(process.env.PROVISION_DB_URL);
  url.pathname = `/${databaseName}`;

  return url.toString();
}

export async function createTenantDatabase(databaseName) {
  if (!/^[a-z0-9]{1,55}_db$/.test(databaseName)) {
    throw new Error("Invalid database name");
  }

  const existing = await masterPool.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [databaseName]
  );

  if (existing.rowCount > 0) {
    throw new Error("Organization database already exists");
  }

  // CREATE DATABASE cannot run inside a transaction.
  await masterPool.query(`CREATE DATABASE "${databaseName}"`);
}

export function getTenantPool(databaseName) {
  if (!/^[a-z0-9]{1,55}_db$/.test(databaseName)) {
    throw new Error("Invalid database name");
  }

  if (!tenantPools.has(databaseName)) {
    tenantPools.set(
      databaseName,
      new Pool({
        connectionString: tenantConnectionString(databaseName),
        max: 3,
        connectionTimeoutMillis: 10000,
      })
    );
  }

  return tenantPools.get(databaseName);
}

export async function closeTenantPool(databaseName) {
  const pool = tenantPools.get(databaseName);

  if (pool) {
    tenantPools.delete(databaseName);
    await pool.end();
  }
}

export async function initializeTenantDatabase(databaseName) {
  const pool = getTenantPool(databaseName);

  await pool.query(`
    CREATE TABLE roles (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(50) UNIQUE NOT NULL
    );

    CREATE TABLE permissions (
      id BIGSERIAL PRIMARY KEY,
      role_id BIGINT NOT NULL REFERENCES roles(id),
      resource VARCHAR(50) NOT NULL,
      can_create BOOLEAN NOT NULL DEFAULT FALSE,
      can_read BOOLEAN NOT NULL DEFAULT FALSE,
      can_update BOOLEAN NOT NULL DEFAULT FALSE,
      can_delete BOOLEAN NOT NULL DEFAULT FALSE,
      can_publish BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(role_id, resource)
    );

    CREATE TABLE employees (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role_id BIGINT NOT NULL REFERENCES roles(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY,
      employee_id BIGINT UNIQUE NOT NULL
        REFERENCES employees(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE amenities (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      slot_minutes INT NOT NULL DEFAULT 60 CHECK (slot_minutes = 60),
      is_published BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE booking_history (
      id BIGSERIAL PRIMARY KEY,
      amenity_id BIGINT NOT NULL REFERENCES amenities(id),
      slot_start TIMESTAMPTZ NOT NULL,
      guest_name VARCHAR(100) NOT NULL,
      guest_email VARCHAR(255) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'booked'
        CHECK (status IN ('booked', 'arrived', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX unique_active_amenity_slot
    ON booking_history (amenity_id, slot_start)
    WHERE status IN ('booked', 'arrived');
  `);

  await pool.query(`
    INSERT INTO roles (name) VALUES
      ('Super Admin'),
      ('Operation Manager'),
      ('Receptionist');
  `);

  // Super Admin: full access.
  await pool.query(`
    INSERT INTO permissions
      (role_id, resource, can_create, can_read, can_update,
       can_delete, can_publish)
    SELECT id, resource, TRUE, TRUE, TRUE, TRUE, TRUE
    FROM roles
    CROSS JOIN (
      VALUES ('amenities'), ('booking_history'), ('employees')
    ) AS resources(resource)
    WHERE name = 'Super Admin';
  `);

  // Operation Manager: manage amenities and read bookings.
  await pool.query(`
    INSERT INTO permissions
      (role_id, resource, can_create, can_read, can_update,
       can_delete, can_publish)
    SELECT r.id, x.resource,
      (x.resource = 'amenities'), TRUE,
      (x.resource = 'amenities'),
      (x.resource = 'amenities'),
      (x.resource = 'amenities')
    FROM roles r
    CROSS JOIN (
      VALUES ('amenities'), ('booking_history')
    ) AS x(resource)
    WHERE r.name = 'Operation Manager';
  `);

  // Receptionist: read amenities and update bookings.
  await pool.query(`
    INSERT INTO permissions
      (role_id, resource, can_create, can_read, can_update,
       can_delete, can_publish)
    SELECT r.id, x.resource, FALSE, TRUE,
      (x.resource = 'booking_history'), FALSE, FALSE
    FROM roles r
    CROSS JOIN (
      VALUES ('amenities'), ('booking_history')
    ) AS x(resource)
    WHERE r.name = 'Receptionist';
  `);

  return pool;
}
