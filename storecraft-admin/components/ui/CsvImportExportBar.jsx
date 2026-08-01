"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";

/**
 * Shared Import / Export / Template controls for catalog CSV.
 * @param {{ endpoint: string, label?: string, onImported?: () => void }} props
 */
export function CsvImportExportBar({ endpoint, label = "CSV", onImported }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState("");

  const download = async (mode) => {
    const key = mode === "template" ? "template" : "export";
    setBusy(key);
    try {
      const url = mode === "template" ? `${endpoint}?template=1` : endpoint;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `${label} download failed`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="([^"]+)"/);
      const filename = match?.[1] || `${label.toLowerCase()}-${mode}.csv`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      toast.success(mode === "template" ? `${label} template downloaded` : `${label} exported`);
    } catch (e) {
      toast.error(e.message || "Download failed");
    } finally {
      setBusy("");
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("import");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(endpoint, { method: "POST", body: fd, credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Import failed");
      const errN = Array.isArray(json.errors) ? json.errors.length : 0;
      toast.success(
        `Imported ${label}: ${json.created || 0} created, ${json.updated || 0} updated` +
          (errN ? `, ${errN} row error(s)` : "")
      );
      if (errN && json.errors?.[0]) {
        toast.error(`First error (row ${json.errors[0].row}): ${json.errors[0].error}`, {
          duration: 6000,
        });
      }
      onImported?.();
    } catch (err) {
      toast.error(err.message || "Import failed");
    } finally {
      setBusy("");
    }
  };

  const btn = {
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 12px",
    background: "#fff",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  };

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        style={{ display: "none" }}
        onChange={onFile}
      />
      <button type="button" style={btn} disabled={!!busy} onClick={() => download("template")}>
        {busy === "template" ? "…" : "CSV Template"}
      </button>
      <button type="button" style={btn} disabled={!!busy} onClick={() => download("export")}>
        {busy === "export" ? "…" : "Export CSV"}
      </button>
      <button
        type="button"
        style={{ ...btn, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1d4ed8" }}
        disabled={!!busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy === "import" ? "Importing…" : "Import CSV"}
      </button>
    </div>
  );
}
