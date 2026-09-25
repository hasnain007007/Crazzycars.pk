"use client";

import { useCallback, useEffect, useState } from "react";
import { PlatformChips } from "./PlatformChips";
import { StatusBadge } from "./StatusBadge";
import { cardClass, COLORS, pageStyle } from "./socialTheme";

const STATUSES = ["", "draft", "scheduled", "published", "failed", "partial"];

function pktWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function SocialHistoryPage({ onOpenPost }) {
  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/social/posts?${params}`, { credentials: "include" });
      const json = await res.json();
      if (json.success) {
        let list = json.posts || [];
        if (q.trim()) {
          const rx = new RegExp(q.trim(), "i");
          list = list.filter((p) => rx.test(p.title || "") || rx.test(p.headline || ""));
        }
        setPosts(list);
      }
    } finally {
      setLoading(false);
    }
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-5" style={pageStyle()}>
      <h1 className="text-xl font-bold">History</h1>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title…"
          className="min-w-[12rem] flex-1 rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s || "all"} value={s}>
              {s || "All statuses"}
            </option>
          ))}
        </select>
      </div>

      <div className={cardClass("overflow-hidden")}>
        {loading ? (
          <p className="p-4 text-sm text-[#6B6B76]">Loading…</p>
        ) : (
          <ul className="divide-y divide-[#E8E8ED]">
            {posts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpenPost?.(p.id)}
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-[#F6F6F8] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-sm">{p.title || "Untitled"}</p>
                    <p className="text-xs text-[#6B6B76]">
                      Scheduled: {pktWhen(p.scheduledAt)} · {p.images?.length || 0} photos
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlatformChips platforms={p.platforms} />
                    <StatusBadge status={p.status} />
                  </div>
                </button>
              </li>
            ))}
            {!posts.length ? (
              <li className="p-6 text-center text-sm text-[#6B6B76]">Koi post nahi mili</li>
            ) : null}
          </ul>
        )}
      </div>
      <p className="text-xs text-[#6B6B76]">
        Tip: failed posts dubara edit kar ke schedule karein —{" "}
        <span style={{ color: COLORS.brand }}>Settings</span> se health check karein.
      </p>
    </div>
  );
}
