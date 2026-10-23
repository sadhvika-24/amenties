
"use client";

import { useEffect, useState } from "react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");

  async function loadUsers() {
    setError("");

    try {
      const response = await fetch("/api/users", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load users.");
      }

      setUsers(data.users || []);
      setRoles(data.roles || []);

      if (data.roles?.length && !roleId) {
        setRoleId(String(data.roles[0].id));
      }
    } catch (err) {
      setError(err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          role_id: roleId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create user.");
      }

      setMessage("User created successfully!");
      setFullName("");
      setEmail("");
      setPassword("");

      await loadUsers();
    } catch (err) {
      setError(err.message || "Unable to create user.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: "1000px",
        margin: "30px auto",
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <p>
        <a href="/dashboard">← Back to Dashboard</a>
      </p>

      <h1>Users &amp; Roles Management</h1>
      <p>Create organization users and assign their roles.</p>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      <h2>Create User</h2>

      <form
        onSubmit={handleCreateUser}
        style={{
          display: "grid",
          gap: "14px",
          maxWidth: "500px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <label>
          Full Name
          <input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            maxLength={200}
            style={inputStyle}
            placeholder="Enter full name"
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={255}
            style={inputStyle}
            placeholder="user@example.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            maxLength={72}
            style={inputStyle}
            placeholder="At least 8 characters"
          />
        </label>

        <label>
          Assign Role
          <select
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            required
            style={inputStyle}
          >
            <option value="" disabled>
              Select a role
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.role_name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={saving || loading || roles.length === 0}
          style={{
            padding: "12px",
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "Creating User..." : "Create User"}
        </button>
      </form>

      <hr style={{ margin: "30px 0" }} />

      <h2>Available Roles ({roles.length})</h2>

      {loading ? (
        <p>Loading roles...</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {roles.map((role) => (
            <section
              key={role.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{role.role_name}</h3>
              <p>{role.description || "No description available."}</p>
            </section>
          ))}
        </div>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h2>Organization Users ({users.length})</h2>

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {["ID", "Full Name", "Email", "Role", "Status"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        textAlign: "left",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  {[
                    user.id,
                    user.full_name,
                    user.email,
                    user.role_name,
                    user.is_active ? "Active" : "Inactive",
                  ].map((value, index) => (
                    <td
                      key={index}
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                      }}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: "6px",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "5px",
};
