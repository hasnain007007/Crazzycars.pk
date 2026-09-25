/**
 * Temporary admin UI to verify Social Auto-Poster step 1 (create draft + upload + probe URLs).
 * Remove or replace with full Social Posts UI in step 4.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export function SocialTestPage() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState("Social test post");
  const [busy, setBusy] = useState("");
  const [files, setFiles] = useState([]);
  const [probes, setProbes] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);

  const loadHealth = useCallback(async () => {
    setLoadingHealth(true);
    try {
      const res = await fetch("/api/social/health", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Health check failed");
        setHealth(null);
        return;
      }
      setHealth(json);
    } catch {
      toast.error("Network error loading health");
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  async function createTestPost() {
    setBusy("create");
    try {
      const res = await fetch("/api/social/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Social test post" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Create failed");
        return;
      }
      setPost(json.post);
      setUploadResult(null);
      setProbes([]);
      toast.success(`Draft created: ${json.post.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy("");
    }
  }

  async function uploadImages() {
    if (!post?.id) {
      toast.error("Create a test post first");
      return;
    }
    if (!files.length) {
      toast.error("Choose at least one image");
      return;
    }
    setBusy("upload");
    try {
      const fd = new FormData();
      for (const f of files) fd.append("files", f);
      const res = await fetch(`/api/social/posts/${post.id}/images`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Upload failed");
        return;
      }
      setPost((p) => ({ ...p, images: json.images || [] }));
      setUploadResult(json);
      setProbes(json.probes || []);
      setFiles([]);
      toast.success(`Uploaded ${json.uploaded?.length || 0} image(s)`);
    } catch {
      toast.error("Network error");
    } finally {
      setBusy("");
    }
  }

  async function checkUrls() {
    const urls = (post?.images || []).map((i) => i.url).filter(Boolean);
    if (!urls.length) {
      toast.error("No image URLs on this post — upload first");
      return;
    }
    setBusy("probe");
    try {
      const res = await fetch("/api/social/health", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Probe failed");
        return;
      }
      setProbes(json.results || []);
      if (json.allOk) toast.success("All URLs OK (200 + image/jpeg)");
      else toast.error("Some URLs failed — see results below");
    } catch {
      toast.error("Network error");
    } finally {
      setBusy("");
    }
  }

  const images = post?.images || [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Temporary · Step 1 verification
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Social media test</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Create a draft, upload posters, then confirm each public URL opens on{" "}
          <strong>crazzycars.pk</strong> without login (must be{" "}
          <code className="text-xs">image/jpeg</code>). After that we continue with Facebook /
          Instagram publish (step 2).
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Config / media</h2>
          <button
            type="button"
            onClick={loadHealth}
            disabled={loadingHealth}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600"
          >
            {loadingHealth ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {health ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Public base</dt>
              <dd className="font-mono text-xs break-all">{health.config?.publicBaseUrl}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Media folder</dt>
              <dd className="font-mono text-xs">{health.config?.mediaFolder}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Media writable</dt>
              <dd>
                {health.media?.writable ? (
                  <span className="text-emerald-700">Yes</span>
                ) : (
                  <span className="text-red-600">No — {health.media?.error}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Scheduler</dt>
              <dd>
                {health.config?.schedulerDisabled ? (
                  <span className="text-amber-700">Disabled (expected until Meta env set)</span>
                ) : (
                  <span className="text-emerald-700">Ready</span>
                )}
              </dd>
            </div>
            {health.config?.warnings?.length ? (
              <div className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {health.config.warnings.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No health data yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">1. Create test post</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title"
            className="min-w-[16rem] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
          />
          <button
            type="button"
            disabled={busy === "create"}
            onClick={createTestPost}
            className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "create" ? "Creating…" : "Create test post"}
          </button>
        </div>
        {post ? (
          <p className="mt-2 font-mono text-xs text-slate-600 dark:text-slate-300">
            Post id: {post.id} · status: {post.status} · images: {images.length}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">2. Upload images</h2>
        <p className="mt-1 text-xs text-slate-500">JPG / PNG / WEBP · max 15 MB each · up to 10</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          multiple
          disabled={!post?.id || busy === "upload"}
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="mt-3 block w-full text-sm"
        />
        {files.length ? (
          <p className="mt-1 text-xs text-slate-500">{files.length} file(s) selected</p>
        ) : null}
        <button
          type="button"
          disabled={!post?.id || !files.length || busy === "upload"}
          onClick={uploadImages}
          className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          {busy === "upload" ? "Uploading…" : "Upload & process"}
        </button>
        {uploadResult?.uploaded?.length ? (
          <ul className="mt-3 space-y-2">
            {uploadResult.uploaded.map((img) => (
              <li
                key={img.path}
                className="flex flex-wrap items-start gap-3 rounded-lg border border-slate-100 p-2 dark:border-slate-800"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="h-16 w-16 rounded object-cover bg-slate-100"
                />
                <div className="min-w-0 flex-1">
                  <a
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-xs font-medium text-[#1d6fb8] underline"
                  >
                    {img.url}
                  </a>
                  <p className="text-[11px] text-slate-500">
                    {img.width}×{img.height} · order {img.order}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">3. Check URLs</h2>
          <button
            type="button"
            disabled={!images.length || busy === "probe"}
            onClick={checkUrls}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy === "probe" ? "Checking…" : "Check URLs"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Calls <code>POST /api/social/health</code> — expects HTTP 200 and{" "}
          <code>Content-Type: image/jpeg</code>.
        </p>
        {probes.length ? (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-[10px] uppercase text-slate-500 dark:border-slate-700">
                <tr>
                  <th className="py-2 pr-2">URL</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Content-Type</th>
                  <th className="py-2">OK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {probes.map((r) => (
                  <tr key={r.url}>
                    <td className="max-w-xs break-all py-2 pr-2">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1d6fb8] underline"
                      >
                        {r.url}
                      </a>
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{r.status || "—"}</td>
                    <td className="py-2 pr-2 font-mono">{r.contentType || "—"}</td>
                    <td className="py-2">
                      {r.ok ? (
                        <span className="font-semibold text-emerald-700">Yes</span>
                      ) : (
                        <span className="font-semibold text-red-600" title={r.error}>
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No probe results yet.</p>
        )}
      </section>
    </div>
  );
}
