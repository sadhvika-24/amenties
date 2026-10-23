
"use client";

import { useEffect, useState } from "react";

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBookings() {
      try {
        const response = await fetch("/api/bookings");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load bookings.");
        }

        setBookings(data.bookings || []);
      } catch (err) {
        setError(err.message || "Unable to load booking history.");
      } finally {
        setLoading(false);
      }
    }

    loadBookings();
  }, []);

  return (
    <main style={{ padding: "24px", fontFamily: "Arial, sans-serif" }}>
      <p>
        <a href="/dashboard">← Back to Dashboard</a>
      </p>

      <h1>Booking History</h1>
      <p>View booking records for your organization.</p>

      {loading && <p>Loading booking history...</p>}

      {error && (
        <p style={{ color: "red" }}>
          {error}
        </p>
      )}

      {!loading && !error && bookings.length === 0 && (
        <p>No bookings found yet.</p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "20px",
            }}
          >
            <thead>
              <tr>
                {[
                  "Reference",
                  "Amenity",
                  "Booked By",
                  "Email",
                  "Start Time",
                  "End Time",
                  "Status",
                ].map((heading) => (
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
                ))}
              </tr>
            </thead>

            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.booking_reference}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.amenity_name || "Amenity unavailable"}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.booked_by_name}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.booked_by_email}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.start_time
                      ? new Date(booking.start_time).toLocaleString()
                      : "-"}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.end_time
                      ? new Date(booking.end_time).toLocaleString()
                      : "-"}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                    {booking.status || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
