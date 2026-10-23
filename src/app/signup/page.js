"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    organizationName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (form.password !== form.confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "Registration failed.");
        return;
      }

      setMessage(
        `Organization registered successfully! Your Organization ID is ${data.organization.organizationId}`
      );

      setForm({
        organizationName: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch {
      setIsError(true);
      setMessage("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="signup-page">
      <div className="signup-card">
        <Link href="/" className="brand">
          AmenityHub
        </Link>

        <h1>Create Your Organization</h1>
        <p className="subtitle">
          Register your organization to get started.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="organizationName">Organization Name</label>
          <input
            id="organizationName"
            name="organizationName"
            type="text"
            placeholder="Enter organization name"
            value={form.organizationName}
            onChange={handleChange}
            maxLength={150}
            required
          />

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter email address"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={handleChange}
            minLength={8}
            autoComplete="new-password"
            required
          />

          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={handleChange}
            minLength={8}
            autoComplete="new-password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register Organization"}
          </button>
        </form>

        {message && (
          <p
            className={isError ? "message error" : "message success"}
            role="status"
          >
            {message}
          </p>
        )}

        <p className="signin-link">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>

      <style jsx>{`
        .signup-page {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 32px 16px;
          background: #f5f7fb;
          font-family: Arial, sans-serif;
          color: #172033;
        }

        .signup-card {
          width: 100%;
          max-width: 460px;
          padding: 36px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 12px 35px rgba(15, 23, 42, 0.06);
        }

        .brand {
          display: block;
          margin-bottom: 28px;
          color: #2563eb;
          font-size: 23px;
          font-weight: bold;
          text-decoration: none;
        }

        h1 {
          margin: 0 0 10px;
          font-size: 27px;
        }

        .subtitle {
          margin-bottom: 28px;
          color: #64748b;
          line-height: 1.6;
        }

        label {
          display: block;
          margin: 17px 0 8px;
          font-size: 14px;
          font-weight: bold;
        }

        input {
          box-sizing: border-box;
          width: 100%;
          padding: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 15px;
        }

        input:focus {
          outline: 2px solid #93c5fd;
          border-color: #2563eb;
        }

        button {
          width: 100%;
          margin-top: 24px;
          padding: 14px;
          border: none;
          border-radius: 8px;
          background: #2563eb;
          color: white;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .message {
          margin-top: 20px;
          padding: 12px;
          border-radius: 8px;
          overflow-wrap: anywhere;
          line-height: 1.6;
          font-size: 14px;
        }

        .success {
          background: #ecfdf5;
          color: #065f46;
        }

        .error {
          background: #fef2f2;
          color: #991b1b;
        }

        .signin-link {
          margin-top: 24px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }

        .signin-link a {
          color: #2563eb;
          font-weight: bold;
        }

        @media (max-width: 480px) {
          .signup-card {
            padding: 24px;
          }
        }
      `}</style>
    </main>
  );
}
