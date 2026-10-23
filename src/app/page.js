
import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        fontFamily: "Arial, sans-serif",
        color: "#172033",
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "22px 8%",
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <h2 style={{ margin: 0, color: "#2563eb" }}>
          AmenityHub
        </h2>

        <div style={{ display: "flex", gap: "20px" }}>
          <Link
            href="/login"
            style={{ color: "#172033", textDecoration: "none" }}
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            style={{
              color: "#ffffff",
              background: "#2563eb",
              padding: "10px 18px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      <section
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "100px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "#2563eb",
            fontWeight: "bold",
            letterSpacing: "2px",
          }}
        >
          AMENITY BOOKING MANAGEMENT
        </p>

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 58px)",
            lineHeight: 1.15,
            margin: "20px 0",
          }}
        >
          Manage Your Amenities.
          <br />
          Simplify Every Booking.
        </h1>

        <p
          style={{
            fontSize: "18px",
            lineHeight: 1.8,
            color: "#64748b",
            maxWidth: "650px",
            margin: "0 auto 32px",
          }}
        >
          A simple platform for organizations to manage amenities,
          coordinate bookings, and keep track of reservation history
          from one place.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/signup"
            style={{
              background: "#2563eb",
              color: "#ffffff",
              padding: "14px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Register Organization
          </Link>

          <Link
            href="/login"
            style={{
              background: "#ffffff",
              color: "#172033",
              padding: "14px 24px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            Sign In
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginTop: "80px",
            textAlign: "left",
          }}
        >
          {[
            {
              title: "Amenity Management",
              description:
                "Organize facilities, locations, and booking capacities.",
            },
            {
              title: "Easy Reservations",
              description:
                "Make it easier to manage and track amenity bookings.",
            },
            {
              title: "Booking History",
              description:
                "Keep reservation information organized in one place.",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "#ffffff",
                padding: "28px",
                borderRadius: "14px",
                border: "1px solid #e5e7eb",
              }}
            >
              <h3 style={{ marginTop: 0 }}>{item.title}</h3>
              <p style={{ color: "#64748b", lineHeight: 1.7 }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "24px",
          color: "#64748b",
          borderTop: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
         © AmenityHub. All rights reserved.
      </footer>
    </main>
  );
}
