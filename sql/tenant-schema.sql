CREATE TABLE roles (id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL);
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY, role_id INT NOT NULL REFERENCES roles(id),
  resource VARCHAR(30) NOT NULL, action VARCHAR(30) NOT NULL,
  UNIQUE(role_id, resource, action));
CREATE TABLE employees (
  id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, role_id INT NOT NULL REFERENCES roles(id),
  active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE users (
  id SERIAL PRIMARY KEY, employee_id INT UNIQUE REFERENCES employees(id),
  email VARCHAR(150) UNIQUE NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE amenities (
  id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE booking_history (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(8) UNIQUE NOT NULL DEFAULT substr(md5(random()::text),1,8),
  amenity_id INT NOT NULL REFERENCES amenities(id) ON DELETE RESTRICT,
  slot_start TIMESTAMP NOT NULL, guest_name VARCHAR(100) NOT NULL, guest_email VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','arrived','cancelled','no_show')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
-- DB-level double-booking protection; cancelled bookings free the slot
CREATE UNIQUE INDEX one_active_booking ON booking_history(amenity_id, slot_start) WHERE status <> 'cancelled';
CREATE INDEX booking_email_idx ON booking_history(lower(guest_email));
INSERT INTO roles(name) VALUES ('Super Admin'),('Operation Manager'),('Receptionist');
INSERT INTO permissions(role_id,resource,action)
SELECT r.id,x.resource,x.action FROM roles r JOIN (VALUES
 ('Super Admin','amenities','create'),('Super Admin','amenities','read'),('Super Admin','amenities','update'),('Super Admin','amenities','delete'),('Super Admin','amenities','publish'),
 ('Super Admin','bookings','read'),('Super Admin','bookings','update'),('Super Admin','employees','manage'),
 ('Operation Manager','amenities','create'),('Operation Manager','amenities','read'),('Operation Manager','amenities','update'),('Operation Manager','amenities','delete'),('Operation Manager','amenities','publish'),
 ('Operation Manager','bookings','read'),
 ('Receptionist','amenities','read'),('Receptionist','bookings','read'),('Receptionist','bookings','update')
) AS x(role,resource,action) ON x.role=r.name;