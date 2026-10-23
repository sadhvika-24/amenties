
"use client";

import { useEffect, useState } from "react";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadEmployees() {
    setError("");

    try {
      const response = await fetch("/api/employees");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load employees.");
      }

      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message || "Unable to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          employee_code: employeeCode,
          phone,
          job_title: jobTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to add employee.");
      }

      setMessage("Employee added successfully.");
      setFullName("");
      setEmail("");
      setEmployeeCode("");
      setPhone("");
      setJobTitle("");

      await loadEmployees();
    } catch (err) {
      setError(err.message || "Unable to add employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: "1000px", margin: "30px auto", padding: "20px" }}>
      <p>
        <a href="/dashboard">← Back to Dashboard</a>
      </p>

      <h1>Employees Management</h1>
      <p>Add employees and view your organization's employee records.</p>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <h2>Add Employee</h2>

      <form onSubmit={handleSubmit}>
        <p>
          <label htmlFor="fullName">Full Name *</label><br />
          <input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            maxLength={200}
            required
            style={{ width: "100%", padding: "10px" }}
          />
        </p>

        <p>
          <label htmlFor="email">Email *</label><br />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={255}
            required
            style={{ width: "100%", padding: "10px" }}
          />
        </p>

        <p>
          <label htmlFor="employeeCode">Employee Code (optional)</label><br />
          <input
            id="employeeCode"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            maxLength={100}
            style={{ width: "100%", padding: "10px" }}
          />
        </p>

        <p>
          <label htmlFor="phone">Phone (optional)</label><br />
          <input
            id="phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={50}
            style={{ width: "100%", padding: "10px" }}
          />
        </p>

        <p>
          <label htmlFor="jobTitle">Job Title (optional)</label><br />
          <input
            id="jobTitle"
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            maxLength={150}
            style={{ width: "100%", padding: "10px" }}
          />
        </p>

        <button type="submit" disabled={saving} style={{ padding: "10px 18px" }}>
          {saving ? "Saving..." : "Add Employee"}
        </button>
      </form>

      <hr style={{ margin: "30px 0" }} />

      <h2>Employee List ({employees.length})</h2>

      {loading ? (
        <p>Loading employees...</p>
      ) : employees.length === 0 ? (
        <p>No employees found yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["ID", "Employee Code", "Full Name", "Email", "Phone", "Job Title"].map(
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
              {employees.map((employee) => (
                <tr key={employee.id}>
                  {[
                    employee.id,
                    employee.employee_code || "-",
                    employee.full_name,
                    employee.email,
                    employee.phone || "-",
                    employee.job_title || "-",
                  ].map((value, index) => (
                    <td
                      key={index}
                      style={{ border: "1px solid #ddd", padding: "10px" }}
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
