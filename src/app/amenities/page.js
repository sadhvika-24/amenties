
"use client";

import { useEffect, useState } from "react";

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("10");
  const [message, setMessage] = useState("Loading amenities...");
  const [loading, setLoading] = useState(false);

  async function loadAmenities() {
    try {
      const response = await fetch("/api/amenities");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Please log in.");
        return;
      }

      setAmenities(data.amenities || []);
      setMessage("");
    } catch {
      setMessage("Could not connect to the server.");
    }
  }

  useEffect(() => {
    loadAmenities();
  }, []);

  async function createAmenity(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/amenities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          location,
          capacity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not create amenity.");
        return;
      }

      setName("");
      setDescription("");
      setLocation("");
      setCapacity("10");
      setMessage("Amenity created successfully.");
      await loadAmenities();
    } catch {
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      maxWidth: 850,
      margin: "40px auto",
      padding: 24,
      fontFamily: "Arial, sans-serif",
    }}>
      <h1>Amenity Management</h1>
      <p>Create and view your organization&apos;s amenities.</p>

      <form onSubmit={createAmenity} style={{
        display: "grid",
        gap: 12,
        maxWidth: 480,
        marginBottom: 32,
      }}>
        <input
          placeholder="Amenity name (e.g. Conference Room)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          required
        />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <input
          type="number"
          min="1"
          max="100000"
          placeholder="Capacity"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
        />
        <button disabled={loading} type="submit">
          {loading ? "Saving..." : "Create Amenity"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}

      <h2>Existing Amenities</h2>

      {amenities.map((amenity) => (
        <article key={amenity.id} style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
        }}>
          <h3>{amenity.name}</h3>
          <p>{amenity.description || "No description"}</p>
          <p>Location: {amenity.location || "Not specified"}</p>
          <p>Capacity: {amenity.capacity}</p>
          <p>Status: {amenity.is_published ? "Published" : "Draft"}</p>
        </article>
      ))}
    </main>
  );
}
