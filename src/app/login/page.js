
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    organizationId: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setIsError(true);
        setMessage(data.message || "Login failed. Please try again.");
        return;
      }

      setMessage("Login successful! Redirecting...");
      router.push("/dashboard");
    } catch {
      setIsError(true);
      setMessage("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <Link href="/" className="login-brand">
          AmenityHub
        </Link>

        <h1>Welcome Back</h1>
        <p className="login-subtitle">
          Sign in to manage your organization and bookings.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="organizationId">Organization ID</label>
          <input
            id="organizationId"
            name="organizationId"
            type="text"
            placeholder="Enter your organization ID"
            value={form.organizationId}
            onChange={handleChange}
            required
          />

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email address"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {message && (
          <p
            className={
              isError
                ? "login-message login-error"
                : "login-message login-success"
            }
            role="status"
          >
            {message}
          </p>
        )}

        <p className="login-signup-link">
          Don't have an account? <Link href="/signup">Register your organization</Link>
        </p>
      </div>
    </main>
  );
}
