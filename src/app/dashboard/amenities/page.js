"use client";

import { useEffect, useState } from "react";

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [message, setMessage] = useState("Loading amenities...");

  async function loadAmenities() {
    try {
      const response = await fetch("/api/amenities");
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Unable to load amenities");

      setAmenities(Array.isArray(data.amenities) ? data.amenities : []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadAmenities();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("Saving...");

    try {
      const response = await fetch("/api/amenities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          location,
          capacity: Number(capacity),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save amenity");

      setName("");
      setDescription("");
      setLocation("");
      setCapacity("");
      setMessage("Amenity saved successfully.");
      await loadAmenities();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 20 }}>
      <a href="/dashboard">← Back to Dashboard</a>
      <h1>Amenities Management</h1>
      <p>Add and view amenities for your organization.</p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 500 }}>
        <input required placeholder="Amenity name" value={name} onChange={e => setName(e.target.value)} />
        <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        <input placeholder="Location" value={location} onChange={e => setLocation(e.target.value)} />
        <input required type="number" min="1" placeholder="Capacity" value={capacity} onChange={e => setCapacity(e.target.value)} />
        <button type="submit">Add Amenity</button>
      </form>

      {message && <p>{message}</p>}

      <h2>Existing Amenities</h2>
      {amenities.length === 0 ? (
        <p>No amenities found yet.</p>
      ) : (
        <ul>
          {amenities.map((amenity, index) => (
            <li key={amenity.id ?? index}>
              <strong>{amenity.name}</strong>
              {amenity.location ? ` — ${amenity.location}` : ""}
              {amenity.capacity != null ? ` (Capacity: ${amenity.capacity})` : ""}
              {amenity.description ? <p>{amenity.description}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}