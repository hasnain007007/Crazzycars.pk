"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { CheckCircle2, AlertTriangle, XCircle, Download, Loader2 } from "lucide-react";
import { COLORS, cardClass, pageStyle } from "./socialTheme";

const STAGES = ["Upload", "Check", "Schedule"];

function ResultCard({ level, title, detail }) {
  const styles = {
    ok: { icon: CheckCircle2, bg: "bg-emerald-50", text: "text-emerald-800" },
    warn: { icon: AlertTriangle, bg: "bg-amber-50", text: "text-amber-900" },
    error: { icon: XCircle, bg: "bg-red-50", text: "text-red-800" },
  };
  const s = styles[level] || styles.warn;
  const Icon = s.icon;
  return (
    <div className={`rounded-xl ${s.bg} p-3 ${s.text}`}>
      <div className="flex gap-2">
        <Icon className="h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {detail ? <p className="mt-0.5 text-xs opacity-90">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ImportWeekPage() {
  const [stage, setStage] = useState(0);
  const [busy, setBusy] = useState("");
  const [importId, setImportId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [files, setFiles] = useState([]);

  const onDrop = useCallback((accepted) => {
    setFiles((f) => [...f, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  async function runPreview() {
    if (!files.length) {
      toast.error("Sheet, photos, ya zip add karein");
      return;
    }
    setBusy("preview");
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch("/api/social/import/preview", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Preview failed");
        return;
      }
      setImportId(json.importId || json.id);
      setPreview(json);
      setStage(1);
      toast.success("Check step — rows review karein");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy("");
    }
  }

  async function patchImport(body) {
    if (!importId) return;
    setBusy("patch");
    try {
      const res = await fetch(`/api/social/import/${importId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Update failed");
        return;
      }
      setPreview((p) => ({ ...p, ...json }));
      toast.success("Saved");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy("");
    }
  }

  async function commitWeek() {
    if (!importId) return;
    setBusy("commit");
    try {
      const res = await fetch(`/api/social/import/${importId}/commit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Schedule failed");
        return;
      }
      setStage(2);
      toast.success("Week schedule ho gayi!");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy("");
    }
  }

  const rows = preview?.rows || preview?.items || [];
  const unmatched = preview?.unmatched || [];

  function renderPreviewCards() {
    if (preview?.cards?.length) {
      return preview.cards.map((c, i) => (
        <ResultCard key={i} level={c.level || "ok"} title={c.title} detail={c.detail || c.message} />
      ));
    }
    if (preview?.errors?.length) {
      return preview.errors.map((e, i) => (
        <ResultCard key={i} level="error" title="Error" detail={String(e)} />
      ));
    }
    if (preview?.warnings?.length) {
      return preview.warnings.map((w, i) => (
        <ResultCard key={i} level="warn" title="Warning" detail={String(w)} />
      ));
    }
    if (rows.length) {
      return (
        <ResultCard
          level="ok"
          title={`${rows.length} rows ready`}
          detail="Review unmatched photos below"
        />
      );
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-5" style={pageStyle()}>
      <div>
        <h1 className="text-xl font-bold">Import week</h1>
        <p className="text-xs text-[#6B6B76]">Excel/CSV + photos folder ya zip — 3 steps</p>
      </div>

      <div className="flex gap-2">
        {STAGES.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-xl py-2 text-center text-xs font-semibold ${
              i <= stage ? "bg-[#111114] text-white" : "bg-[#E8E8ED] text-[#6B6B76]"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {stage === 0 ? (
        <section className={cardClass("space-y-4 p-4")}>
          <div className="flex flex-wrap gap-2">
            <a
              href="/templates/crazzycars_week_template.xlsx"
              className="inline-flex items-center gap-1 rounded-xl border border-[#E8E8ED] px-3 py-2 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> Excel template
            </a>
            <a
              href="/templates/crazzycars_week_template.csv"
              className="inline-flex items-center gap-1 rounded-xl border border-[#E8E8ED] px-3 py-2 text-xs font-semibold"
            >
              <Download className="h-3.5 w-3.5" /> CSV template
            </a>
          </div>
          <div
            {...getRootProps()}
            className={`rounded-2xl border-2 border-dashed px-4 py-10 text-center ${
              isDragActive ? "border-[#ED1C24] bg-red-50/30" : "border-[#D1D1DA] bg-[#F6F6F8]"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-sm font-medium">Yahan sheet + photos drop karein</p>
            <p className="mt-1 text-xs text-[#6B6B76]">.xlsx · .csv · .zip · images</p>
          </div>
          {files.length ? (
            <ul className="text-xs text-[#6B6B76]">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`}>{f.name}</li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            disabled={busy === "preview"}
            onClick={runPreview}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.brand }}
          >
            {busy === "preview" ? "Uploading…" : "Upload & check"}
          </button>
        </section>
      ) : null}

      {stage >= 1 ? (
        <section className="space-y-3">
          {renderPreviewCards()}

          {rows.length ? (
            <div className={cardClass("max-h-64 overflow-auto p-3 text-xs")}>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-[#6B6B76]">
                    <th className="py-1">Code</th>
                    <th className="py-1">Day</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-[#E8E8ED]">
                      <td className="py-1">{r.postCode || r.code || "—"}</td>
                      <td className="py-1">{r.day || r.scheduledAt || "—"}</td>
                      <td className="py-1">{r.status || "pending"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {unmatched.length ? (
            <div className={cardClass("p-4")}>
              <h3 className="text-sm font-semibold">Unmatched photos</h3>
              <ul className="mt-2 max-h-40 overflow-auto text-xs text-[#6B6B76]">
                {unmatched.map((u, i) => (
                  <li key={i}>{typeof u === "string" ? u : u.name || u.file}</li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-2 text-xs font-semibold"
                style={{ color: COLORS.brand }}
                onClick={() => patchImport({ ignoreUnmatched: true })}
              >
                Ignore & continue
              </button>
            </div>
          ) : null}

          {stage === 1 ? (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={commitWeek}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: COLORS.brand }}
            >
              {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Schedule week
            </button>
          ) : null}

          {stage === 2 ? (
            <ResultCard level="ok" title="Week imported" detail="Calendar pe posts dikhengi" />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
