
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch("/api/session", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          router.replace("/login");
          return;
        }

        setOrganization(data.organization);
      } catch {
        setError("Unable to verify your session. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError("Logout failed. Please try again.");
        setLoggingOut(false);
        return;
      }

      router.replace("/login");
    } catch {
      setError("Unable to log out. Please try again.");
      setLoggingOut(false);
    }
  }

  if (loading) {
    return <main style={{ padding: "40px" }}>Verifying your session...</main>;
  }

  if (!organization) {
    return (
      <main style={{ padding: "40px" }}>
        {error || "Redirecting to login..."}
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
        color: "#172033",
      }}
    >
      <h1>Welcome to AmenityHub</h1>
      <p>You are successfully logged in.</p>

      <section
        style={{
          marginTop: "24px",
          padding: "24px",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          maxWidth: "600px",
        }}
      >
        <h2>Organization Dashboard</h2>

<nav
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    margin: "24px 0",
  }}
>
  {[
    { label: "Amenities", href: "/dashboard/amenities" },
    { label: "Bookings", href: "/dashboard/bookings" },
    { label: "Employees", href: "/dashboard/employees" },
    { label: "Users & Roles", href: "/dashboard/users" },
  ].map((item) => (
    <Link
      key={item.href}
      href={item.href}
      style={{
        padding: "18px",
        border: "1px solid #dbeafe",
        borderRadius: "10px",
        background: "#eff6ff",
        color: "#1d4ed8",
        fontWeight: "bold",
        textDecoration: "none",
      }}
    >
      {item.label} →
    </Link>
  ))}
</nav>

        <p><strong>Organization:</strong> {organization.organizationName}</p>
        <p><strong>Organization ID:</strong> {organization.organizationId}</p>
        <p><strong>Email:</strong> {organization.email}</p>
        
<section
  style={{
    marginTop: "20px",
    padding: "18px",
    borderRadius: "10px",
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
  }}
>
  <h3>Subscription & Free Trial</h3>

  <p>
    <strong>Status:</strong>{" "}
    {organization.subscriptionStatus === "trial"
      ? "Free Trial"
      : organization.subscriptionStatus === "active"
        ? "Active Subscription"
        : "Trial Expired"}
  </p>

  {organization.trialEnd && (
    <p>
      <strong>Trial expiry date:</strong>{" "}
      {new Date(organization.trialEnd).toLocaleDateString()}
    </p>
  )}

  {organization.subscriptionStatus === "trial" && (
    <p>
      <strong>Days remaining:</strong>{" "}
      {organization.daysRemaining}
    </p>
  )}

  {organization.subscriptionStatus === "expired" && (
    <p>
      Your free trial has ended. Contact your administrator
      to activate a subscription.
    </p>
  )}
</section>


        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            marginTop: "20px",
            padding: "12px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#dc2626",
            color: "#fff",
            cursor: loggingOut ? "not-allowed" : "pointer",
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>

        {error && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}
      </section>

      <p style={{ marginTop: "24px" }}>
        <Link href="/">Back to Home</Link>
      </p>
    </main>
  );
}
