"use client";

import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PlatformChips } from "./PlatformChips";
import { StatusBadge } from "./StatusBadge";
import { COLORS, cardClass, softCardStyle } from "./socialTheme";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function postDayKey(iso, tz = "Asia/Karachi") {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
}

function pktTimeLabel(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function WeekCalendar({ posts = [], weekStart: weekStartProp, onOpenPost, onAddPost, onReschedule }) {
  const [anchor, setAnchor] = useState(() =>
    weekStartProp ? parseISO(weekStartProp) : startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekStart = useMemo(
    () => startOfWeek(anchor, { weekStartsOn: 1 }),
    [anchor]
  );

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      map.set(format(d, "yyyy-MM-dd"), []);
    }
    for (const p of posts) {
      const key = postDayKey(p.scheduledAt);
      if (key && map.has(key)) map.get(key).push(p);
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    }
    return map;
  }, [days, posts]);

  function PostCard({ post, draggable }) {
    return (
      <button
        type="button"
        draggable={draggable && Boolean(onReschedule)}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/post-id", post.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => onOpenPost?.(post.id)}
        className={`w-full rounded-xl border border-[#E8E8ED] bg-white p-2 text-left transition hover:border-[#ED1C24]/40 ${draggable ? "cursor-grab" : ""}`}
        style={softCardStyle()}
      >
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-bold tabular-nums">{pktTimeLabel(post.scheduledAt)}</span>
          <StatusBadge status={post.status} />
        </div>
        <p className="mt-1 line-clamp-2 text-xs font-medium text-[#111114]">
          {post.headline || post.title || "Untitled"}
        </p>
        <PlatformChips platforms={post.platforms} className="mt-1.5" />
      </button>
    );
  }

  function DayColumn({ day, mobile }) {
    const key = format(day, "yyyy-MM-dd");
    const items = byDay.get(key) || [];
    const isToday = isSameDay(day, new Date());

    return (
      <div
        className={`flex min-h-[120px] flex-col rounded-2xl border border-[#E8E8ED] bg-[#F6F6F8]/50 p-2 ${
          mobile ? "mb-3" : ""
        }`}
        onDragOver={(e) => onReschedule && e.preventDefault()}
        onDrop={(e) => {
          if (!onReschedule) return;
          e.preventDefault();
          const pid = e.dataTransfer.getData("text/post-id");
          if (!pid) return;
          const [y, m, d] = key.split("-").map(Number);
          const existing = posts.find((p) => p.id === pid);
          const t = existing?.scheduledAt
            ? pktTimeLabel(existing.scheduledAt)
            : "10:00";
          const [hh, mm] = t.split(":").map(Number);
          const iso = new Date(Date.UTC(y, m - 1, d, hh - 5, mm)).toISOString();
          onReschedule(pid, iso);
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div>
            <p className={`text-xs font-semibold ${isToday ? "text-[#ED1C24]" : "text-[#6B6B76]"}`}>
              {DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
            </p>
            <p className="text-sm font-bold text-[#111114]">{format(day, "d MMM")}</p>
          </div>
          <button
            type="button"
            onClick={() => onAddPost?.(key)}
            className="rounded-lg p-1 hover:bg-white"
            aria-label="Add post"
          >
            <Plus className="h-4 w-4" style={{ color: COLORS.brand }} />
          </button>
        </div>
        <div className="space-y-2">
          {items.length ? (
            items.map((p) => <PostCard key={p.id} post={p} draggable />)
          ) : (
            <button
              type="button"
              onClick={() => onAddPost?.(key)}
              className="flex w-full items-center justify-center rounded-xl border border-dashed border-[#D1D1DA] py-6 text-xs text-[#6B6B76] hover:bg-white"
            >
              Add post
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass("p-4")}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          Week of {format(weekStart, "d MMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAnchor(subWeeks(weekStart, 1))}
            className="rounded-lg border border-[#E8E8ED] p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchor(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="rounded-lg px-3 py-2 text-xs font-semibold"
          >
            This week
          </button>
          <button
            type="button"
            onClick={() => setAnchor(addWeeks(weekStart, 1))}
            className="rounded-lg border border-[#E8E8ED] p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {days.map((d) => (
          <DayColumn key={d.toISOString()} day={d} />
        ))}
      </div>
      <div className="md:hidden">
        {days.map((d) => (
          <DayColumn key={d.toISOString()} day={d} mobile />
        ))}
      </div>
    </div>
  );
}
