
"use client";

import { useEffect, useState } from "react";

export default function BookAmenityPage() {
  const [amenities, setAmenities] = useState([]);
  const [amenityId, setAmenityId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAmenities() {
      try {
        const response = await fetch("/api/amenities");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load amenities.");
        }

        const published = (data.amenities || []).filter(
          (amenity) => amenity.is_published === true
        );

        setAmenities(published);

        if (published.length > 0) {
          setAmenityId(String(published[0].id));
        }
      } catch (err) {
        setError(err.message || "Unable to load amenities.");
      }
    }

    loadAmenities();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amenityId,
          name,
          email,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create booking.");
      }

      setMessage(
        "Booking created successfully! Reference: " +
          data.booking.booking_reference
      );

      setName("");
      setEmail("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(err.message || "Unable to create booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: "650px", margin: "30px auto", padding: "20px" }}>
      <p><a href="/dashboard">← Back to Dashboard</a></p>

      <h1>Book an Amenity</h1>
      <p>Choose an available published amenity and enter your booking details.</p>

      {message && <p style={{ color: "green" }}>{message}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {amenities.length === 0 ? (
        <p>No published amenities are available for booking.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <p>
            <label htmlFor="amenity">Amenity</label><br />
            <select
              id="amenity"
              value={amenityId}
              onChange={(event) => setAmenityId(event.target.value)}
              required
              style={{ width: "100%", padding: "10px" }}
            >
              {amenities.map((amenity) => (
                <option key={amenity.id} value={amenity.id}>
                  {amenity.name}
                </option>
              ))}
            </select>
          </p>

          <p>
            <label htmlFor="name">Your Name</label><br />
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={200}
              style={{ width: "100%", padding: "10px" }}
            />
          </p>

          <p>
            <label htmlFor="email">Email (optional)</label><br />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={255}
              style={{ width: "100%", padding: "10px" }}
            />
          </p>

          <p>
            <label htmlFor="start">Start Date and Time</label><br />
            <input
              id="start"
              type="datetime-local"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              required
              style={{ width: "100%", padding: "10px" }}
            />
          </p>

          <p>
            <label htmlFor="end">End Date and Time</label><br />
            <input
              id="end"
              type="datetime-local"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              required
              style={{ width: "100%", padding: "10px" }}
            />
          </p>

          <button type="submit" disabled={saving} style={{ padding: "10px 18px" }}>
            {saving ? "Creating Booking..." : "Create Booking"}
          </button>
        </form>
      )}

      <p style={{ marginTop: "20px" }}>
        <a href="/dashboard/bookings">View Booking History →</a>
      </p>
    </main>
  );
}
