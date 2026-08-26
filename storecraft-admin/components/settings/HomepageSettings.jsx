"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { clearStorefrontBrowserCache } from "@/lib/clearStorefrontBrowserCache";
import { clearAdminSettingsCache } from "@/lib/adminSettingsCache";

function underFilterFromMax(maxPrice) {
  const n = Math.round(Number(maxPrice) || 0);
  return n > 0 ? `under${n}` : "all";
}

function BestSellerPicker({ productIds = [], onChange }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState([]);
  const [selected, setSelected] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ids = (productIds || []).map(String).filter(Boolean);
    if (!ids.length) {
      setSelected([]);
      return undefined;
    }
    (async () => {
      try {
        const res = await fetch(`/api/products?lite=1&limit=200&status=active`, {
          credentials: "include",
        });
        const data = await res.json();
        if (cancelled || !res.ok) return;
        const list = data?.products || data?.data || [];
        const byId = new Map(list.map((p) => [String(p._id || p.id), p]));
        setSelected(ids.map((id) => byId.get(id) || { _id: id, name: id }).filter(Boolean));
      } catch {
        if (!cancelled) setSelected(ids.map((id) => ({ _id: id, name: id })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productIds]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return undefined;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/products?lite=1&limit=12&search=${encodeURIComponent(term)}&status=active`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (cancelled) return;
        setHits(Array.isArray(data?.products) ? data.products : data?.data || []);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  function addProduct(p) {
    const id = String(p._id || p.id);
    if (!id || productIds.includes(id)) return;
    onChange([...productIds, id]);
    setQ("");
    setHits([]);
  }

  function removeAt(idx) {
    onChange(productIds.filter((_, i) => i !== idx));
  }

  function move(idx, dir) {
    const next = [...productIds];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-100">
        Selected products (homepage order)
      </p>
      <p className="mb-3 text-xs text-slate-500">
        Leave empty to auto-pick popular/featured products. Drag order with ↑ ↓.
      </p>
      <ul className="mb-3 space-y-1">
        {selected.map((p, i) => (
          <li
            key={String(p._id || p.id || i)}
            className="flex items-center gap-2 rounded border border-slate-100 px-2 py-1.5 text-sm dark:border-slate-700"
          >
            <span className="min-w-0 flex-1 truncate">{p.name || String(p._id)}</span>
            <button type="button" className="px-1 text-slate-500" onClick={() => move(i, -1)} aria-label="Move up">
              ↑
            </button>
            <button type="button" className="px-1 text-slate-500" onClick={() => move(i, 1)} aria-label="Move down">
              ↓
            </button>
            <button type="button" className="px-1 text-red-600" onClick={() => removeAt(i)} aria-label="Remove">
              ×
            </button>
          </li>
        ))}
        {!selected.length ? (
          <li className="text-xs text-slate-400">No curated products yet.</li>
        ) : null}
      </ul>
      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Search products to add…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {searching ? <p className="mt-1 text-xs text-slate-400">Searching…</p> : null}
      {hits.length ? (
        <ul className="mt-1 max-h-40 overflow-y-auto rounded border border-slate-200 dark:border-slate-700">
          {hits.map((p) => {
            const id = String(p._id || p.id);
            const already = productIds.includes(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => addProduct(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-40 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{already ? "Added" : "+ Add"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const DEFAULT_FORM = {
  announcementMessages: [
    { text: "Nationwide delivery — flat Rs. 250 delivery charges", isActive: true },
    { text: "Cash on delivery available at checkout", isActive: true },
    
  ],
  announcementBgColor: "#111111",
  whyChooseUs: [
    { icon: "🚚", title: "We Deliver Everywhere", description: "From Karachi to Khyber — COD nationwide", isActive: true },
    { icon: "💰", title: "Pay When It Arrives", description: "Cash on delivery — no card needed", isActive: true },
    { icon: "🔄", title: "No Hassle Returns", description: "Changed your mind? 7 days, no questions asked", isActive: true },
    { icon: "✅", title: "Real Products, Real Quality", description: "Every item tested before it reaches you", isActive: true },
  ],
  brands: [],
  flashSaleEnabled: false,
  flashSaleTitle: "Up to 50% Off",
  flashSaleEndTime: "",
  sections: {
    showShopByCar: false,
    showFlashSale: false,
    showBrands: false,
    showWhyChooseUs: true,
    showCategories: true,
    showBestSellers: true,
    showHotDeals: true,
  },
  categories: {
    title: "Shop by Category",
    viewAllText: "View all →",
  },
  bestSellers: {
    enabled: true,
    title: "Best Sellers",
    productIds: [],
    tabs: [
      { label: "All", categorySlug: "all", enabled: true, order: 1 },
      { label: "Kitchen", categorySlug: "kitchen-accessories", enabled: true, order: 2 },
      { label: "Beauty", categorySlug: "beauty-bags", enabled: true, order: 3 },
      { label: "Ladies", categorySlug: "ladies-bags", enabled: true, order: 4 },
    ],
  },
  hotDeals: {
    enabled: true,
    title: "On Sale",
    subtitle: "Seasonal prices on kitchen, beauty bags and ladies bags",
    tabs: [
      { label: "All Deals", filter: "all", maxPrice: null, enabled: true, order: 1 },
      { label: "Under Rs.1,000", filter: "under1000", maxPrice: 1000, enabled: true, order: 2 },
      { label: "Under Rs.700", filter: "under700", maxPrice: 700, enabled: true, order: 3 },
    ],
  },
  sectionOrder: [
    { id: "hero", label: "Hero Banner", enabled: true, order: 1 },
    { id: "shopByCar", label: "Shop by Car", enabled: false, order: 2 },
    { id: "categories", label: "Categories", enabled: true, order: 3 },
    { id: "bestSellers", label: "Best Sellers", enabled: true, order: 4 },
    { id: "hotDeals", label: "Hot Deals", enabled: true, order: 5 },
    { id: "flashSale", label: "Flash Sale", enabled: false, order: 6 },
    { id: "brands", label: "Brand Carousel", enabled: false, order: 7 },
    { id: "whyChooseUs", label: "Why Choose Us", enabled: true, order: 8 },
  ],
  sectionTitles: {
    categories: "Shop by Category",
    bestSellers: "Best Sellers",
    hotDeals: "🔥 Hot Deals",
    flashSale: "Flash Sale",
    brands: "Trusted Brands",
    whyChooseUs: "Why Choose Us",
    shopByCar: "",
  },
};

function Section({ title, children }) {
  return (
    <section className="mb-8 rounded-lg border border-slate-200 p-5 dark:border-slate-700">
      <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
      {children}
    </section>
  );
}

export default function HomepageSettings() {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settings", { credentials: "include" });
        const data = await res.json();
        if (cancelled || !res.ok || !data.success) return;
        const hp = data?.settings?.homepageSettings || data?.data?.homepageSettings;
        if (hp && typeof hp === "object") {
          setForm((prev) => ({
            ...prev,
            announcementMessages: hp.announcementMessages?.length
              ? hp.announcementMessages
              : prev.announcementMessages,
            announcementBgColor: hp.announcementBgColor ?? prev.announcementBgColor,
            whyChooseUs: hp.whyChooseUs?.length ? hp.whyChooseUs : prev.whyChooseUs,
            brands: hp.brands?.length ? hp.brands : prev.brands,
            flashSaleEnabled: hp.flashSaleEnabled ?? prev.flashSaleEnabled,
            flashSaleTitle: hp.flashSaleTitle ?? prev.flashSaleTitle,
            flashSaleEndTime: hp.flashSaleEndTime
              ? new Date(hp.flashSaleEndTime).toISOString().slice(0, 16)
              : "",
            sections: { ...prev.sections, ...(hp.sections || {}) },
            categories: { ...prev.categories, ...(hp.categories || {}) },
            bestSellers: { ...prev.bestSellers, ...(hp.bestSellers || {}) },
            hotDeals: { ...prev.hotDeals, ...(hp.hotDeals || {}) },
            sectionOrder: hp.sectionOrder?.length
              ? hp.sectionOrder.filter((s) => s?.id !== "trust")
              : prev.sectionOrder,
            sectionTitles: { ...prev.sectionTitles, ...(hp.sectionTitles || {}) },
          }));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        announcementMessages: form.announcementMessages,
        announcementBgColor: form.announcementBgColor,
        whyChooseUs: form.whyChooseUs,
        brands: form.brands,
        flashSaleEnabled: form.flashSaleEnabled,
        flashSaleTitle: form.flashSaleTitle,
        flashSaleEndTime: form.flashSaleEndTime ? new Date(form.flashSaleEndTime).toISOString() : null,
        sections: form.sections,
        categories: form.categories,
        bestSellers: form.bestSellers,
        hotDeals: form.hotDeals,
        sectionOrder: form.sectionOrder,
        sectionTitles: form.sectionTitles,
      };
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homepageSettings: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success("Homepage settings saved");
      clearStorefrontBrowserCache();
      clearAdminSettingsCache();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Section title="Announcement Bar">
        {form.announcementMessages.map((msg, i) => (
          <div key={i} className="mb-3 flex flex-wrap items-center gap-2">
            <input
              className="min-w-[200px] flex-1 rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              maxLength={100}
              value={msg.text}
              onChange={(e) => {
                const announcementMessages = [...form.announcementMessages];
                announcementMessages[i] = { ...msg, text: e.target.value };
                setForm((f) => ({ ...f, announcementMessages }));
              }}
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={msg.isActive !== false}
                onChange={(e) => {
                  const announcementMessages = [...form.announcementMessages];
                  announcementMessages[i] = { ...msg, isActive: e.target.checked };
                  setForm((f) => ({ ...f, announcementMessages }));
                }}
              />
              Active
            </label>
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  announcementMessages: f.announcementMessages.filter((_, j) => j !== i),
                }))
              }
            >
              Delete
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-[#1d6fb8]"
          onClick={() =>
            setForm((f) => ({
              ...f,
              announcementMessages: [...f.announcementMessages, { text: "", isActive: true }],
            }))
          }
        >
          + Add Message
        </button>
        <label className="mt-4 block text-sm">
          Background color
          <input
            type="text"
            className="mt-1 w-32 rounded border px-2 py-1 font-mono text-sm"
            value={form.announcementBgColor}
            onChange={(e) => setForm((f) => ({ ...f, announcementBgColor: e.target.value }))}
          />
        </label>
        <div
          className="mt-3 flex h-9 items-center justify-center rounded text-sm text-white"
          style={{ background: form.announcementBgColor || "#111111" }}
        >
          Preview — announcement bar
        </div>
      </Section>

      <Section title="Why Choose Us">
        {form.whyChooseUs.map((item, i) => (
          <div key={i} className="mb-4 rounded border border-slate-100 p-3 dark:border-slate-700">
            <div className="grid gap-2 sm:grid-cols-4">
              <input
                className="rounded border px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                placeholder="Icon"
                value={item.icon}
                onChange={(e) => {
                  const whyChooseUs = [...form.whyChooseUs];
                  whyChooseUs[i] = { ...item, icon: e.target.value };
                  setForm((f) => ({ ...f, whyChooseUs }));
                }}
              />
              <input
                className="rounded border px-2 py-1 text-sm sm:col-span-1 dark:border-slate-600 dark:bg-slate-800"
                placeholder="Title"
                value={item.title}
                onChange={(e) => {
                  const whyChooseUs = [...form.whyChooseUs];
                  whyChooseUs[i] = { ...item, title: e.target.value };
                  setForm((f) => ({ ...f, whyChooseUs }));
                }}
              />
              <input
                className="rounded border px-2 py-1 text-sm sm:col-span-2 dark:border-slate-600 dark:bg-slate-800"
                placeholder="Description"
                maxLength={80}
                value={item.description}
                onChange={(e) => {
                  const whyChooseUs = [...form.whyChooseUs];
                  whyChooseUs[i] = { ...item, description: e.target.value };
                  setForm((f) => ({ ...f, whyChooseUs }));
                }}
              />
              <label className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={item.isActive !== false}
                  onChange={(e) => {
                    const whyChooseUs = [...form.whyChooseUs];
                    whyChooseUs[i] = { ...item, isActive: e.target.checked };
                    setForm((f) => ({ ...f, whyChooseUs }));
                  }}
                />
                Active
              </label>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-[#1d6fb8]"
          onClick={() =>
            setForm((f) => ({
              ...f,
              whyChooseUs: [...f.whyChooseUs, { icon: "✓", title: "", description: "", isActive: true }],
            }))
          }
        >
          + Add item
        </button>
      </Section>

      <Section title="Brands Carousel">
        <p className="mb-3 text-xs text-slate-500">Brand logos are generated from brand names automatically.</p>
        {form.brands.map((b, i) => (
          <div key={i} className="mb-2 flex items-center gap-2">
            <input
              className="flex-1 rounded border px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={b.name}
              onChange={(e) => {
                const brands = [...form.brands];
                brands[i] = { ...b, name: e.target.value, order: i };
                setForm((f) => ({ ...f, brands }));
              }}
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={b.isActive !== false}
                onChange={(e) => {
                  const brands = [...form.brands];
                  brands[i] = { ...b, isActive: e.target.checked };
                  setForm((f) => ({ ...f, brands }));
                }}
              />
              Active
            </label>
            <button
              type="button"
              className="text-sm text-red-600"
              onClick={() => setForm((f) => ({ ...f, brands: f.brands.filter((_, j) => j !== i) }))}
            >
              Delete
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-[#1d6fb8]"
          onClick={() =>
            setForm((f) => ({
              ...f,
              brands: [...f.brands, { name: "", isActive: true, order: f.brands.length }],
            }))
          }
        >
          + Add brand
        </button>
      </Section>

      <Section title="Flash Sale">
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.flashSaleEnabled !== false}
            onChange={(e) => setForm((f) => ({ ...f, flashSaleEnabled: e.target.checked }))}
          />
          Enable flash sale section
        </label>
        <label className="mb-3 block text-sm">
          Sale title
          <input
            className="mt-1 w-full rounded border px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            value={form.flashSaleTitle}
            onChange={(e) => setForm((f) => ({ ...f, flashSaleTitle: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          End date & time
          <input
            type="datetime-local"
            className="mt-1 rounded border px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            value={form.flashSaleEndTime}
            onChange={(e) => setForm((f) => ({ ...f, flashSaleEndTime: e.target.value }))}
          />
        </label>
      </Section>

      <Section title="Section Visibility">
        {Object.entries(form.sections).map(([key, value]) => (
          <label key={key} className="mb-2 flex items-center gap-2 text-sm capitalize">
            <input
              type="checkbox"
              checked={value !== false}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sections: { ...f.sections, [key]: e.target.checked },
                }))
              }
            />
            {key.replace(/show/, "Show ").replace(/([A-Z])/g, " $1")}
          </label>
        ))}
      </Section>

      <Section title="Categories Section">
        <label className="mb-3 block text-sm">
          Section title
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.categories.title} onChange={(e) => setForm((f) => ({ ...f, categories: { ...f.categories, title: e.target.value } }))} />
        </label>
        <label className="block text-sm">
          View all text
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.categories.viewAllText} onChange={(e) => setForm((f) => ({ ...f, categories: { ...f.categories, viewAllText: e.target.value } }))} />
        </label>
      </Section>

      <Section title="Best Sellers">
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.bestSellers.enabled !== false} onChange={(e) => setForm((f) => ({ ...f, bestSellers: { ...f.bestSellers, enabled: e.target.checked } }))} />
          Enabled
        </label>
        <label className="mb-3 block text-sm">
          Title
          <input className="mt-1 w-full rounded border px-3 py-2" value={form.bestSellers.title} onChange={(e) => setForm((f) => ({ ...f, bestSellers: { ...f.bestSellers, title: e.target.value } }))} />
        </label>
        <BestSellerPicker
          productIds={form.bestSellers.productIds || []}
          onChange={(productIds) =>
            setForm((f) => ({ ...f, bestSellers: { ...f.bestSellers, productIds } }))
          }
        />
        <p className="mb-2 mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">Category tabs (optional)</p>
        {(form.bestSellers.tabs || []).map((tab, i) => (
          <div key={i} className="mb-2 grid gap-2 rounded border p-2 sm:grid-cols-5">
            <input className="rounded border px-2 py-1 text-sm" placeholder="Label" value={tab.label} onChange={(e) => setForm((f) => { const tabs=[...(f.bestSellers.tabs||[])]; tabs[i]={...tab,label:e.target.value}; return { ...f, bestSellers: { ...f.bestSellers, tabs } }; })} />
            <input className="rounded border px-2 py-1 text-sm" placeholder="Category slug" value={tab.categorySlug} onChange={(e) => setForm((f) => { const tabs=[...(f.bestSellers.tabs||[])]; tabs[i]={...tab,categorySlug:e.target.value}; return { ...f, bestSellers: { ...f.bestSellers, tabs } }; })} />
            <input className="rounded border px-2 py-1 text-sm" type="number" placeholder="Order" value={tab.order} onChange={(e) => setForm((f) => { const tabs=[...(f.bestSellers.tabs||[])]; tabs[i]={...tab,order:Number(e.target.value)||0}; return { ...f, bestSellers: { ...f.bestSellers, tabs } }; })} />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={tab.enabled !== false} onChange={(e) => setForm((f) => { const tabs=[...(f.bestSellers.tabs||[])]; tabs[i]={...tab,enabled:e.target.checked}; return { ...f, bestSellers: { ...f.bestSellers, tabs } }; })} />Enabled</label>
          </div>
        ))}
      </Section>

      <Section title="Hot Deals Section">
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.hotDeals.enabled !== false} onChange={(e) => setForm((f) => ({ ...f, hotDeals: { ...f.hotDeals, enabled: e.target.checked } }))} />
          Enabled
        </label>
        <label className="mb-3 block text-sm">Title<input className="mt-1 w-full rounded border px-3 py-2" value={form.hotDeals.title} onChange={(e) => setForm((f) => ({ ...f, hotDeals: { ...f.hotDeals, title: e.target.value } }))} /></label>
        <label className="mb-3 block text-sm">Subtitle<input className="mt-1 w-full rounded border px-3 py-2" value={form.hotDeals.subtitle} onChange={(e) => setForm((f) => ({ ...f, hotDeals: { ...f.hotDeals, subtitle: e.target.value } }))} /></label>
        <p className="mb-2 text-xs text-slate-500">
          Price filters auto-fetch sale products under that max price. Use filter <code>all</code>, <code>fiftyoff</code>, <code>flash</code>, or set a Max price.
        </p>
        {(form.hotDeals.tabs || []).map((tab, i) => (
          <div key={i} className="mb-2 grid gap-2 rounded border p-2 sm:grid-cols-6">
            <input
              className="rounded border px-2 py-1 text-sm sm:col-span-2"
              placeholder="Label (e.g. Under Rs.1,500)"
              value={tab.label}
              onChange={(e) =>
                setForm((f) => {
                  const tabs = [...(f.hotDeals.tabs || [])];
                  tabs[i] = { ...tab, label: e.target.value };
                  return { ...f, hotDeals: { ...f.hotDeals, tabs } };
                })
              }
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              type="number"
              placeholder="Max price"
              value={tab.maxPrice ?? ""}
              onChange={(e) => {
                const maxPrice = e.target.value === "" ? null : Number(e.target.value);
                setForm((f) => {
                  const tabs = [...(f.hotDeals.tabs || [])];
                  const filter =
                    maxPrice != null && Number.isFinite(maxPrice) && maxPrice > 0
                      ? underFilterFromMax(maxPrice)
                      : tab.filter === "fiftyoff" || tab.filter === "flash" || tab.filter === "all"
                        ? tab.filter
                        : "all";
                  tabs[i] = {
                    ...tab,
                    maxPrice: maxPrice != null && Number.isFinite(maxPrice) ? maxPrice : null,
                    filter,
                    label:
                      tab.label ||
                      (maxPrice > 0 ? `Under Rs.${Math.round(maxPrice).toLocaleString("en-PK")}` : tab.label),
                  };
                  return { ...f, hotDeals: { ...f.hotDeals, tabs } };
                });
              }}
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              placeholder="filter key"
              value={tab.filter}
              onChange={(e) =>
                setForm((f) => {
                  const tabs = [...(f.hotDeals.tabs || [])];
                  tabs[i] = { ...tab, filter: e.target.value };
                  return { ...f, hotDeals: { ...f.hotDeals, tabs } };
                })
              }
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              type="number"
              value={tab.order}
              onChange={(e) =>
                setForm((f) => {
                  const tabs = [...(f.hotDeals.tabs || [])];
                  tabs[i] = { ...tab, order: Number(e.target.value) || 0 };
                  return { ...f, hotDeals: { ...f.hotDeals, tabs } };
                })
              }
            />
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={tab.enabled !== false}
                onChange={(e) =>
                  setForm((f) => {
                    const tabs = [...(f.hotDeals.tabs || [])];
                    tabs[i] = { ...tab, enabled: e.target.checked };
                    return { ...f, hotDeals: { ...f.hotDeals, tabs } };
                  })
                }
              />
              On
            </label>
            <button
              type="button"
              className="text-left text-xs text-red-600"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  hotDeals: {
                    ...f.hotDeals,
                    tabs: (f.hotDeals.tabs || []).filter((_, idx) => idx !== i),
                  },
                }))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-[#1d6fb8]"
          onClick={() =>
            setForm((f) => ({
              ...f,
              hotDeals: {
                ...f.hotDeals,
                tabs: [
                  ...(f.hotDeals.tabs || []),
                  {
                    label: "Under Rs.1,500",
                    filter: "under1500",
                    maxPrice: 1500,
                    enabled: true,
                    order: (f.hotDeals.tabs || []).length + 1,
                  },
                ],
              },
            }))
          }
        >
          + Add price filter tab
        </button>
      </Section>

      <Section title="Section Order">
        {(form.sectionOrder || []).map((s, i) => (
          <div key={s.id || i} className="mb-2 grid grid-cols-3 gap-2 rounded border p-2">
            <input className="rounded border px-2 py-1 text-sm" value={s.label} onChange={(e) => setForm((f) => { const sectionOrder=[...(f.sectionOrder||[])]; sectionOrder[i]={...s,label:e.target.value}; return { ...f, sectionOrder }; })} />
            <input className="rounded border px-2 py-1 text-sm" type="number" value={s.order} onChange={(e) => setForm((f) => { const sectionOrder=[...(f.sectionOrder||[])]; sectionOrder[i]={...s,order:Number(e.target.value)||0}; return { ...f, sectionOrder }; })} />
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={s.enabled !== false} onChange={(e) => setForm((f) => { const sectionOrder=[...(f.sectionOrder||[])]; sectionOrder[i]={...s,enabled:e.target.checked}; return { ...f, sectionOrder }; })} />Enabled</label>
          </div>
        ))}
      </Section>

      <Section title="Section Titles">
        {Object.entries(form.sectionTitles || {}).map(([k, v]) => (
          <label key={k} className="mb-2 block text-sm">{k}<input className="mt-1 w-full rounded border px-3 py-2" value={v} onChange={(e) => setForm((f) => ({ ...f, sectionTitles: { ...f.sectionTitles, [k]: e.target.value } }))} /></label>
        ))}
      </Section>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Homepage Settings"}
      </button>
    </div>
  );
}
