
"use client";

import { useEffect, useState } from "react";

const emptyForm = {
  name: "",
  description: "",
  location: "",
  capacity: "",
};

export default function AmenitiesPage() {
  const [amenities, setAmenities] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("Loading amenities...");
  const [busy, setBusy] = useState(false);

  async function loadAmenities() {
    try {
      const response = await fetch("/api/amenities");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load amenities.");
      }

      setAmenities(Array.isArray(data.amenities) ? data.amenities : []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    loadAmenities();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function startEditing(amenity) {
    setEditingId(amenity.id);
    setForm({
      name: amenity.name || "",
      description: amenity.description || "",
      location: amenity.location || "",
      capacity: amenity.capacity == null ? "" : String(amenity.capacity),
    });
    setMessage("Editing amenity. Update the fields and save.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(editingId ? "Updating amenity..." : "Saving amenity...");

    try {
      const editing = editingId !== null;

      const response = await fetch(
        editing ? `/api/amenities/${editingId}` : "/api/amenities",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            location: form.location,
            capacity: Number(form.capacity),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save amenity.");
      }

      setForm(emptyForm);
      setEditingId(null);
      setMessage(data.message || "Amenity saved successfully.");
      await loadAmenities();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(amenity) {
    const action = amenity.is_published ? "unpublish" : "publish";

    if (!window.confirm(`Do you want to ${action} "${amenity.name}"?`)) {
      return;
    }

    setBusy(true);
    setMessage(`${action === "publish" ? "Publishing" : "Unpublishing"}...`);

    try {
      const response = await fetch(`/api/amenities/${amenity.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_published: !amenity.is_published,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Unable to ${action} amenity.`);
      }

      setMessage(data.message || `Amenity ${action}ed successfully.`);
      await loadAmenities();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAmenity(amenity) {
    if (
      !window.confirm(
        `Are you sure you want to delete "${amenity.name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("Deleting amenity...");

    try {
      const response = await fetch(`/api/amenities/${amenity.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to delete amenity.");
      }

      if (editingId === amenity.id) {
        cancelEditing();
      }

      setMessage(data.message || "Amenity deleted successfully.");
      await loadAmenities();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "40px auto",
        padding: 20,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <a href="/dashboard">← Back to Dashboard</a>

      <h1>Amenities Management</h1>
      <p>Add, view, edit, delete, and publish amenities for your organization.</p>

      <h2>{editingId !== null ? "Edit Amenity" : "Add Amenity"}</h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "grid", gap: 12, maxWidth: 500 }}
      >
        <input
          required
          name="name"
          placeholder="Amenity name"
          value={form.name}
          onChange={updateField}
        />

        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={updateField}
          rows={3}
        />

        <input
          name="location"
          placeholder="Location"
          value={form.location}
          onChange={updateField}
        />

        <input
          required
          name="capacity"
          type="number"
          min="1"
          step="1"
          placeholder="Capacity"
          value={form.capacity}
          onChange={updateField}
        />

        <button type="submit" disabled={busy}>
          {busy
            ? "Please wait..."
            : editingId !== null
              ? "Save Changes"
              : "Add Amenity"}
        </button>

        {editingId !== null && (
          <button type="button" onClick={cancelEditing} disabled={busy}>
            Cancel Edit
          </button>
        )}
      </form>

      {message && (
        <p role="status" style={{ marginTop: 16 }}>
          {message}
        </p>
      )}

      <hr style={{ margin: "28px 0" }} />

      <h2>Existing Amenities ({amenities.length})</h2>

      {amenities.length === 0 ? (
        <p>No amenities found yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {amenities.map((amenity) => (
            <article
              key={amenity.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h3 style={{ marginTop: 0 }}>{amenity.name}</h3>

              <p>
                <strong>Location:</strong> {amenity.location || "Not specified"}
              </p>

              <p>
                <strong>Capacity:</strong> {amenity.capacity ?? "Not specified"}
              </p>

              <p>
                <strong>Description:</strong>{" "}
                {amenity.description || "No description"}
              </p>

              <p>
                <strong>Publication status:</strong>{" "}
                {amenity.is_published ? "Published" : "Unpublished"}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEditing(amenity)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => togglePublish(amenity)}
                >
                  {amenity.is_published ? "Unpublish" : "Publish"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => deleteAmenity(amenity)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
