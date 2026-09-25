"use client";

import Link from "next/link";
import { format, startOfWeek, addDays } from "date-fns";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { HealthStrip } from "./HealthStrip";
import { PostDrawer } from "./PostDrawer";
import { StatusBadge } from "./StatusBadge";
import { WeekCalendar } from "./WeekCalendar";
import { COLORS, FONT, cardClass, pageStyle } from "./socialTheme";

function pktIsoFromDateKey(dateKey, time = "10:00") {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 5, mm)).toISOString();
}

export function SocialDashboard() {
  const [settings, setSettings] = useState(null);
  const [posts, setPosts] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [initialSchedule, setInitialSchedule] = useState(null);
  const [loading, setLoading] = useState(true);

  const weekRange = useMemo(() => {
    const ws = startOfWeek(new Date(), { weekStartsOn: 1 });
    return { weekStart: ws, from: ws.toISOString(), to: addDays(ws, 7).toISOString() };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = weekRange;
      const [sRes, pRes, hRes] = await Promise.all([
        fetch("/api/social/settings", { credentials: "include" }).catch(() => null),
        fetch(
          `/api/social/posts?limit=200&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { credentials: "include" }
        ),
        fetch("/api/social/posts?limit=30", { credentials: "include" }),
      ]);
      if (sRes?.ok) {
        const sj = await sRes.json();
        if (sj.success) setSettings(sj.settings || sj);
      } else {
        const h = await fetch("/api/social/health", { credentials: "include" }).then((r) => r.json());
        if (h.success) setSettings({ dryRun: h.config?.dryRun, mode: h.config?.dryRun ? "test" : "live" });
      }
      const pj = await pRes.json();
      if (pj.success) setPosts(pj.posts || []);
      const hist = await hRes.json();
      if (hist.success) setRecent(hist.posts || []);
    } catch {
      toast.error("Dashboard load fail");
    } finally {
      setLoading(false);
    }
  }, [weekRange]);

  const [recent, setRecent] = useState([]);

  useEffect(() => {
    load();
  }, [load]);

  const needsAttention = useMemo(
    () =>
      posts.filter((p) =>
        ["failed", "partial", "draft"].includes(String(p.status)) && (!p.images?.length || !p.scheduledAt)
      ),
    [posts]
  );

  const nextScheduled = useMemo(() => {
    const future = posts
      .filter((p) => p.scheduledAt && new Date(p.scheduledAt) > new Date() && p.status === "scheduled")
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    return future[0]?.scheduledAt || null;
  }, [posts]);

  function openNew(dateKey) {
    setEditId(null);
    setInitialSchedule(dateKey ? pktIsoFromDateKey(dateKey) : null);
    setDrawerOpen(true);
  }

  function openEdit(id) {
    setEditId(id);
    setInitialSchedule(null);
    setDrawerOpen(true);
  }

  async function handleReschedule(id, iso) {
    try {
      const res = await fetch(`/api/social/posts/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: iso, status: "scheduled" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Reschedule failed");
        return;
      }
      toast.success("Time update ho gaya");
      load();
    } catch {
      toast.error("Network error");
    }
  }

  const isTest = settings?.dryRun !== false && settings?.mode !== "live";

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5" style={pageStyle()}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#111114]">Social Posts</h1>
          <p className="text-xs text-[#6B6B76]">Calendar · schedule · CrazzyCars brand</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              isTest ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {isTest ? "Test" : "Live"}
          </span>
          <Link
            href="/social/import"
            className="rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm font-semibold"
          >
            Import week
          </Link>
          <button
            type="button"
            onClick={() => openNew(null)}
            className="inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: COLORS.brand, fontFamily: FONT }}
          >
            <Plus className="h-4 w-4" /> New post
          </button>
        </div>
      </header>

      <HealthStrip nextScheduledAt={nextScheduled} />

      {needsAttention.length ? (
        <section className={cardClass("p-4")}>
          <h2 className="text-sm font-semibold text-amber-800">Needs attention</h2>
          <ul className="mt-2 space-y-2">
            {needsAttention.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => openEdit(p.id)}
                  className="flex w-full items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-left text-sm"
                >
                  <span>{p.title || "Draft"}</span>
                  <StatusBadge status={p.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#6B6B76]">Loading calendar…</p>
      ) : (
        <WeekCalendar
          posts={posts}
          weekStart={format(weekRange.weekStart, "yyyy-MM-dd")}
          onOpenPost={openEdit}
          onAddPost={openNew}
          onReschedule={handleReschedule}
        />
      )}

      <section className={cardClass("p-4")}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent history</h2>
          <Link href="/social/history" className="text-xs font-semibold" style={{ color: COLORS.brand }}>
            View all →
          </Link>
        </div>
        <ul className="divide-y divide-[#E8E8ED]">
          {recent.slice(0, 8).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2 text-sm">
              <button type="button" onClick={() => openEdit(p.id)} className="text-left font-medium hover:underline">
                {p.title}
              </button>
              <StatusBadge status={p.status} />
            </li>
          ))}
          {!recent.length ? <li className="py-4 text-xs text-[#6B6B76]">No posts yet</li> : null}
        </ul>
      </section>

      <PostDrawer
        open={drawerOpen}
        postId={editId}
        initialScheduledAt={initialSchedule}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          load();
        }}
      />
    </div>
  );
}
