"use client";

import { useEffect, useState } from "react";
import "./globals.css";

export default function Home() {
  const [scripts, setScripts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);

  async function loadScripts() {
    try {
      const res = await fetch("/api/scripts");
      const data = await res.json();
      setScripts(data.scripts || []);
    } catch {
      // ignore, list just stays empty
    }
  }

  useEffect(() => {
    loadScripts();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    const form = e.target;
    const file = form.file.files[0];
    if (!file) return;

    setUploading(true);
    setStatus(null);

    const body = new FormData();
    body.append("file", file);
    body.append("uploader", form.uploader.value || "web");

    try {
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setStatus({ type: "ok", message: `Uploaded ${file.name}` });
      form.reset();
      loadScripts();
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main>
      <h1 className="title">Script Drop</h1>
      <p className="subtitle">
        Upload a script here, or from Discord with{" "}
        <code>/upload</code>. Everything lands in the same place.
      </p>

      <form onSubmit={handleUpload}>
        <div>
          <label htmlFor="uploader">Name (optional)</label>
          <input type="text" id="uploader" name="uploader" placeholder="anonymous" />
        </div>
        <div>
          <label htmlFor="file">Script file</label>
          <input type="file" id="file" name="file" accept=".lua,.txt,.luau" required />
        </div>
        <button type="submit" disabled={uploading}>
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </form>

      {status && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      <h2 className="list-heading">Uploaded scripts</h2>
      {scripts.length === 0 ? (
        <p className="empty">Nothing uploaded yet.</p>
      ) : (
        <ul className="scripts">
          {scripts.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
              <span className="meta">
                {s.uploader} · {new Date(s.uploadedAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
