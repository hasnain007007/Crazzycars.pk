"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export function CouponForm({ couponId }) {
  const router = useRouter();
  const isEdit = Boolean(couponId);
  const [categories, setCategories] = useState([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("0");
  const [maxDiscount, setMaxDiscount] = useState("0");
  const [usageLimit, setUsageLimit] = useState("0");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("active");
  const [appliesTo, setAppliesTo] = useState("all");
  const [categoryIds, setCategoryIds] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadCats = useCallback(async () => {
    const res = await fetch("/api/categories?page=1&limit=200", { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data) setCategories(json.data);
  }, []);

  const load = useCallback(async () => {
    if (!couponId) return;
    const res = await fetch(`/api/coupons/${couponId}`, { credentials: "include" });
    const json = await res.json();
    if (!res.ok || !json.success) {
      toast.error("Not found");
      return;
    }
    const c = json.coupon;
    setCode(c.code || "");
    setDiscountType(c.discountType || "percentage");
    setDiscountValue(String(c.discountValue ?? ""));
    setMinOrderAmount(String(c.minOrderAmount ?? 0));
    setMaxDiscount(String(c.maxDiscount ?? 0));
    setUsageLimit(String(c.usageLimit ?? 0));
    setExpiryDate(c.expiryDate ? new Date(c.expiryDate).toISOString().slice(0, 10) : "");
    setStatus(c.status || "active");
    setAppliesTo(c.appliesTo || "all");
    setCategoryIds((c.categoryIds || []).map((x) => (typeof x === "object" && x._id ? x._id.toString() : String(x))));
  }, [couponId]);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  useEffect(() => {
    if (couponId) load();
  }, [couponId, load]);

  function generateCode() {
    setCode(Math.random().toString(36).slice(2, 10).toUpperCase());
  }

  function toggleCat(id) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        minOrderAmount: parseFloat(minOrderAmount) || 0,
        maxDiscount: parseFloat(maxDiscount) || 0,
        usageLimit: parseInt(usageLimit, 10) || 0,
        expiryDate: expiryDate || null,
        status,
        appliesTo,
        categoryIds: appliesTo === "categories" ? categoryIds : [],
      };
      const url = isEdit ? `/api/coupons/${couponId}` : "/api/coupons";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return;
      }
      toast.success("Saved");
      router.push("/coupons");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/coupons" className="text-sm text-[#1d6fb8] hover:underline">
        ← Coupons
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{isEdit ? "Edit coupon" : "New coupon"}</h1>
      <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div>
          <label className="text-xs font-medium text-slate-600">Coupon code</label>
          <div className="mt-1 flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 font-mono uppercase dark:border-slate-600 dark:bg-slate-800"
              required
            />
            <button type="button" onClick={generateCode} className="rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-600">
              Generate
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Discount type</label>
          <div className="mt-2 flex rounded-lg border border-slate-200 p-1 dark:border-slate-600">
            {[
              ["percentage", "% Percentage"],
              ["fixed", "Rs. Fixed"],
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setDiscountType(v)}
                className={[
                  "flex-1 rounded-md py-2 text-sm font-medium",
                  discountType === v ? "bg-[#1d6fb8] text-white" : "text-slate-600",
                ].join(" ")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Discount value</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Minimum order amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
        </div>
        {discountType === "percentage" ? (
          <div>
            <label className="text-xs font-medium text-slate-600">Maximum discount cap (Rs.)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
        ) : null}
        <div>
          <label className="text-xs font-medium text-slate-600">Usage limit (0 = unlimited)</label>
          <input
            type="number"
            min="0"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Expiry date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="act"
            type="checkbox"
            checked={status === "active"}
            onChange={(e) => setStatus(e.target.checked ? "active" : "inactive")}
          />
          <label htmlFor="act" className="text-sm">
            Active
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Applicable to</label>
          <div className="mt-2 flex gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="app" checked={appliesTo === "all"} onChange={() => setAppliesTo("all")} />
              All products
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="app"
                checked={appliesTo === "categories"}
                onChange={() => setAppliesTo("categories")}
              />
              Specific categories
            </label>
          </div>
          {appliesTo === "categories" ? (
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto rounded border border-slate-200 p-2 dark:border-slate-600">
              {categories.map((c) => {
                const cid = String(c._id);
                return (
                  <label key={cid} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={categoryIds.includes(cid)} onChange={() => toggleCat(cid)} />
                    {c.name}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-[#1d6fb8] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save coupon"}
        </button>
      </form>
    </div>
  );
}
