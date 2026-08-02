"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const TABS = [
  ["hero_slider", "Hero Slider"],
  ["promo_strip", "Promo Strip"],
  ["promo_card", "Promo Cards"],
  ["popup_banner", "Popup"],
  ["all", "All"],
];

function bannerId(b) {
  return b?.id || b?._id?.toString?.() || String(b?._id || "");
}

export function BannersPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hero_slider");
  const [sortBy, setSortBy] = useState("sortOrder");
  const [sortOrder, setSortOrder] = useState("asc");
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/banners", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error("Failed to load");
        return;
      }
      setBanners(json.banners || []);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mergeVisibleOrderIntoBanners = useCallback(
    (orderedVisible, allBanners) => {
      const orderMap = new Map(orderedVisible.map((b, i) => [bannerId(b), i]));
      if (tab === "all") {
        return allBanners.map((b) =>
          orderMap.has(bannerId(b)) ? { ...b, sortOrder: orderMap.get(bannerId(b)) } : b
        );
      }
      return allBanners.map((b) => {
        if (b.placement !== tab) return b;
        return orderMap.has(bannerId(b)) ? { ...b, sortOrder: orderMap.get(bannerId(b)) } : b;
      });
    },
    [tab]
  );

  const saveOrder = useCallback(async (orderedVisible) => {
    try {
      const res = await fetch("/api/banners/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          order: orderedVisible.map((b, i) => ({
            id: bannerId(b),
            sortOrder: i,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to save order");
      }
    } catch (e) {
      console.error("Failed to save order:", e);
      toast.error("Failed to save order");
    }
  }, []);

  const applyReorder = useCallback(
    (orderedVisible) => {
      setBanners((prev) => mergeVisibleOrderIntoBanners(orderedVisible, prev));
      saveOrder(orderedVisible);
    },
    [mergeVisibleOrderIntoBanners, saveOrder]
  );

  async function remove(id, name) {
    if (!window.confirm(`Delete banner "${name}"?`)) return;
    const res = await fetch(`/api/banners/${id}`, { method: "DELETE", credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) toast.error("Delete failed");
    else {
      toast.success("Deleted");
      load();
    }
  }

  async function duplicate(b) {
    const res = await fetch("/api/banners", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...b,
        name: `${b.name} (Copy)`,
        sortOrder: (Number(b.sortOrder) || 0) + 1,
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) toast.error(json.error || "Duplicate failed");
    else {
      toast.success("Duplicated");
      load();
    }
  }

  const visible = useMemo(
    () => (tab === "all" ? banners : banners.filter((b) => b.placement === tab)),
    [banners, tab]
  );

  const activeHeroCount = useMemo(
    () =>
      banners.filter(
        (b) => b.placement === "hero_slider" && String(b.status || "").toLowerCase() === "active"
      ).length,
    [banners]
  );

  async function toggleStatus(b) {
    const id = bannerId(b);
    const next = String(b.status || "").toLowerCase() === "active" ? "inactive" : "active";
    try {
      const res = await fetch(`/api/banners/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Could not update status");
        return;
      }
      setBanners((prev) => prev.map((x) => (bannerId(x) === id ? { ...x, status: next } : x)));
      toast.success(next === "active" ? "Banner is now active in the slider" : "Banner deactivated");
    } catch {
      toast.error("Network error");
    }
  }

  const sortedBanners = useMemo(() => {
    return [...visible].sort((a, b) => {
      if (sortBy === "sortOrder") {
        const orderA = Number(a.sortOrder) || 0;
        const orderB = Number(b.sortOrder) || 0;
        return sortOrder === "asc" ? orderA - orderB : orderB - orderA;
      }
      if (sortBy === "createdAt") {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      }
      if (sortBy === "name") {
        const nameA = (a.name || a.title || "").toLowerCase();
        const nameB = (b.name || b.title || "").toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (sortBy === "isActive") {
        const activeA = a.isActive === true || a.status === "active" ? 1 : 0;
        const activeB = b.isActive === true || b.status === "active" ? 1 : 0;
        return sortOrder === "desc" ? activeB - activeA : activeA - activeB;
      }
      return 0;
    });
  }, [visible, sortBy, sortOrder]);

  const moveUp = (index) => {
    if (index === 0) return;
    const list = [...sortedBanners];
    [list[index - 1], list[index]] = [list[index], list[index - 1]];
    applyReorder(list);
  };

  const moveDown = (index) => {
    if (index >= sortedBanners.length - 1) return;
    const list = [...sortedBanners];
    [list[index], list[index + 1]] = [list[index + 1], list[index]];
    applyReorder(list);
  };

  const handleDrop = (targetId) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const list = [...sortedBanners];
    const fromIndex = list.findIndex((b) => bannerId(b) === draggingId);
    const toIndex = list.findIndex((b) => bannerId(b) === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      setDraggingId(null);
      setDragOverId(null);
      return;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    applyReorder(list);
    setDraggingId(null);
    setDragOverId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Banners &amp; Sliders</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Drag cards or use arrows to set display order (1, 2, 3…). Homepage slider shows{" "}
            <strong>active</strong> Hero Slider banners only (needs 2+ for arrows/dots).
          </p>
          {tab === "hero_slider" ? (
            <p
              className={`mt-1 text-sm font-medium ${
                activeHeroCount >= 2 ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {activeHeroCount >= 2
                ? `${activeHeroCount} active — storefront will rotate as a slider.`
                : `${activeHeroCount} active — activate at least 2 hero banners to enable the slider.`}
            </p>
          ) : null}
        </div>
        <Link href="/banners/new" className="rounded-lg bg-[#1d6fb8] px-4 py-2 text-sm font-semibold text-white">
          Add banner
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${tab === id ? "bg-[#1d6fb8] text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>Sort by:</span>
        {[
          { label: "Display Order", value: "sortOrder", order: "asc" },
          { label: "Newest", value: "createdAt", order: "desc" },
          { label: "Oldest", value: "createdAt", order: "asc" },
          { label: "Name A-Z", value: "name", order: "asc" },
          { label: "Name Z-A", value: "name", order: "desc" },
          { label: "Active First", value: "isActive", order: "desc" },
        ].map((option) => {
          const active = sortBy === option.value && sortOrder === option.order;
          return (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                setSortBy(option.value);
                setSortOrder(option.order);
              }}
              style={{
                padding: "6px 14px",
                background: active ? "#111111" : "#FFFFFF",
                color: active ? "#FFFFFF" : "#374151",
                border: "1px solid",
                borderColor: active ? "#111111" : "#E5E7EB",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
      ) : sortedBanners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500 dark:border-slate-600">
          No banners yet. Create one to get started.
        </div>
      ) : (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {sortedBanners.map((b, index) => {
            const id = bannerId(b);
            const isDragging = draggingId === id;
            const isDragOver = dragOverId === id && draggingId && draggingId !== id;
            return (
              <li
                key={id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(id);
                }}
                onDragLeave={() => {
                  if (dragOverId === id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(id);
                }}
                className="min-w-[280px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
                style={{
                  opacity: isDragging ? 0.55 : 1,
                  boxShadow: isDragOver ? "0 0 0 2px #111111" : undefined,
                  transition: "opacity 0.15s, box-shadow 0.15s",
                }}
              >
                <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800">
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      width: 28,
                      height: 28,
                      background: "#111111",
                      color: "#FFFFFF",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      zIndex: 2,
                      boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      setDraggingId(id);
                    }}
                    onDragEnd={() => {
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      zIndex: 2,
                      cursor: "grab",
                      padding: "4px 8px",
                      background: "rgba(255,255,255,0.9)",
                      borderRadius: 6,
                      color: "#374151",
                      fontSize: 16,
                      userSelect: "none",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                    }}
                    title="Drag to reorder"
                  >
                    ⠿
                  </div>
                  {b.background?.image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.background.image.url} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">No image</div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white" title={b.name}>
                      {b.name}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                      <button
                        type="button"
                        title="Move Up"
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        style={{
                          width: 24,
                          height: 24,
                          background: index === 0 ? "#F3F4F6" : "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          borderRadius: 4,
                          cursor: index === 0 ? "default" : "pointer",
                          fontSize: 10,
                          color: index === 0 ? "#D1D5DB" : "#374151",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        title="Move Down"
                        onClick={() => moveDown(index)}
                        disabled={index === sortedBanners.length - 1}
                        style={{
                          width: 24,
                          height: 24,
                          background: index === sortedBanners.length - 1 ? "#F3F4F6" : "#FFFFFF",
                          border: "1px solid #E5E7EB",
                          borderRadius: 4,
                          cursor: index === sortedBanners.length - 1 ? "default" : "pointer",
                          fontSize: 10,
                          color: index === sortedBanners.length - 1 ? "#D1D5DB" : "#374151",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] text-blue-800">{b.placement}</span>
                    <button
                      type="button"
                      onClick={() => toggleStatus(b)}
                      title="Click to toggle active/inactive"
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                        b.status === "active"
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      }`}
                    >
                      {b.status || "inactive"}
                    </button>
                  </div>
                  <p className="truncate text-xs text-slate-500" title={b.size}>
                    {b.size}
                  </p>
                  <p className="text-xs text-slate-500">
                    Order #{index + 1} · sortOrder {b.sortOrder ?? 0}
                    {b.schedule?.enabled ? " · Scheduled" : ""}
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <Link href={`/banners/${b.id}`} className="text-[#1d6fb8]">
                      Edit
                    </Link>
                    <button type="button" className="text-[#1d6fb8]" onClick={() => toggleStatus(b)}>
                      {b.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button type="button" className="text-[#1d6fb8]" onClick={() => duplicate(b)}>
                      Duplicate
                    </button>
                    <button type="button" className="text-red-600" onClick={() => remove(b.id, b.name)}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
