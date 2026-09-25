"use client";

import { X, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PhotoDropzone } from "./PhotoDropzone";
import { PlatformToggles } from "./PlatformChips";
import { PostPreview } from "./PostPreview";
import { COLORS, FONT, cardClass } from "./socialTheme";

const TZ = "Asia/Karachi";

function toPktParts(iso) {
  if (!iso) {
    const now = new Date();
    return {
      date: now.toLocaleDateString("en-CA", { timeZone: TZ }),
      time: "10:00",
    };
  }
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { timeZone: TZ });
  const time = d.toLocaleTimeString("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { date, time };
}

function pktToIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, day] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const utcGuess = Date.UTC(y, m - 1, day, hh - 5, mm);
  return new Date(utcGuess).toISOString();
}

function buildFinalCaption(caption, hashtagList) {
  const body = String(caption || "").trim();
  const tags = (hashtagList || []).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
  return [body, tags].filter(Boolean).join("\n\n");
}

function slugFromProductUrl(url) {
  try {
    const u = new URL(url.trim());
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

export function PostDrawer({ open, postId, initialScheduledAt, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [id, setId] = useState(postId);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [captionTiktok, setCaptionTiktok] = useState("");
  const [hashtagInput, setHashtagInput] = useState("");
  const [hashtagList, setHashtagList] = useState([]);
  const [firstComment, setFirstComment] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [productInfo, setProductInfo] = useState(null);
  const [images, setImages] = useState([]);
  const [platforms, setPlatforms] = useState({
    facebook: true,
    instagram: true,
    tiktok: false,
  });
  const [pktDate, setPktDate] = useState("");
  const [pktTime, setPktTime] = useState("10:00");

  const resetBlank = useCallback(() => {
    setId(null);
    setTitle("New social post");
    setCaption("");
    setCaptionTiktok("");
    setHashtagList([]);
    setFirstComment("");
    setProductUrl("");
    setProductInfo(null);
    setImages([]);
    setPlatforms({ facebook: true, instagram: true, tiktok: false });
    const parts = toPktParts(initialScheduledAt);
    setPktDate(parts.date);
    setPktTime(parts.time);
  }, [initialScheduledAt]);

  const loadPost = useCallback(async (pid) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/social/posts/${pid}`, { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Load failed");
        return;
      }
      const p = json.post;
      setId(p.id);
      setTitle(p.title || p.headline || "");
      setCaption(p.caption || p.captions?.instagram || "");
      setCaptionTiktok(p.captionTiktok || p.captions?.tiktok || "");
      setHashtagList(Array.isArray(p.hashtagList) ? p.hashtagList : []);
      setFirstComment(p.firstComment || "");
      setProductUrl(p.productUrl || "");
      setImages(p.images || []);
      setPlatforms(p.platforms || { facebook: true, instagram: true, tiktok: false });
      const parts = toPktParts(p.scheduledAt || initialScheduledAt);
      setPktDate(parts.date);
      setPktTime(parts.time);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [initialScheduledAt]);

  useEffect(() => {
    if (!open) return;
    if (postId) loadPost(postId);
    else resetBlank();
  }, [open, postId, loadPost, resetBlank]);

  const finalCaption = useMemo(
    () => buildFinalCaption(caption, hashtagList),
    [caption, hashtagList]
  );

  function addHashtag() {
    const t = hashtagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (hashtagList.includes(t)) {
      setHashtagInput("");
      return;
    }
    setHashtagList((h) => [...h, t]);
    setHashtagInput("");
  }

  async function ensurePostId() {
    if (id) return id;
    const res = await fetch("/api/social/posts", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || "Social post" }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || "Create failed");
    setId(json.post.id);
    setTitle(json.post.title);
    return json.post.id;
  }

  async function savePatch(status = "draft") {
    setSaving(status);
    try {
      const pid = await ensurePostId();
      const scheduledAt = pktDate && pktTime ? pktToIso(pktDate, pktTime) : null;
      const body = {
        title: title.trim() || "Social post",
        caption,
        captionTiktok,
        hashtagList,
        firstComment,
        productUrl,
        platforms,
        images,
        scheduledAt,
        status: status === "scheduled" ? "scheduled" : "draft",
      };
      const res = await fetch(`/api/social/posts/${pid}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Save failed");
        return null;
      }
      setId(json.post.id);
      onSaved?.(json.post);
      return json.post;
    } catch (e) {
      toast.error(e.message || "Save failed");
      return null;
    } finally {
      setSaving("");
    }
  }

  async function handleSaveDraft() {
    const p = await savePatch("draft");
    if (p) toast.success("Draft save ho gaya");
  }

  async function handleSchedule() {
    if (!pktDate || !pktTime) {
      toast.error("Date aur time select karein (PKT)");
      return;
    }
    const p = await savePatch("scheduled");
    if (p) toast.success("Schedule ho gaya");
  }

  async function handlePostNow() {
    if (!window.confirm("Abhi post karein? Facebook / Instagram pe jayega.")) return;
    const p = await savePatch("draft");
    if (!p?.id && !id) return;
    const pid = p?.id || id;
    setSaving("publish");
    try {
      const res = await fetch(`/api/social/posts/${pid}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.halted) {
        toast.error("Meta token issue — Settings check karein");
        return;
      }
      if (!res.ok || !json.success) {
        toast.error(json.error || "Publish failed");
        return;
      }
      toast.success("Publish request bhej di");
      onSaved?.(json.post || p);
      onClose?.();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving("");
    }
  }

  async function checkProduct() {
    const slug = slugFromProductUrl(productUrl);
    if (!slug) {
      toast.error("Valid product URL daalein");
      return;
    }
    try {
      const res = await fetch(
        `/api/products?lite=1&search=${encodeURIComponent(slug)}&limit=5`,
        { credentials: "include" }
      );
      const json = await res.json();
      const list = json.products || json.data || [];
      const hit = list.find((p) => String(p.slug).toLowerCase() === slug.toLowerCase()) || list[0];
      if (hit) {
        setProductInfo({ name: hit.name || hit.title, slug: hit.slug, id: hit._id || hit.id });
        toast.success("Product mil gaya");
      } else {
        setProductInfo(null);
        toast.error("Product nahi mila — URL phir check karein");
      }
    } catch {
      toast.error("Product check fail");
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" style={{ fontFamily: FONT }}>
      <div
        className="flex h-full w-full max-w-4xl flex-col bg-[#F6F6F8] shadow-xl md:max-w-[min(960px,95vw)]"
        role="dialog"
        aria-modal
      >
        <header className="flex items-center justify-between border-b border-[#E8E8ED] bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-[#111114]">
            {id ? "Edit post" : "New post"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[#F6F6F8]">
            <X className="h-5 w-5" />
          </button>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-[#6B6B76]">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5">
              <section className={cardClass("p-4")}>
                <h3 className="text-sm font-semibold">Photos</h3>
                <p className="mt-0.5 text-xs text-[#6B6B76]">Drag, drop, ya paste — order change karein</p>
                <div className="mt-3">
                  <PhotoDropzone
                    postId={id}
                    images={images}
                    onChange={setImages}
                    disabled={Boolean(saving)}
                  />
                </div>
              </section>

              <section className={cardClass("p-4 space-y-3")}>
                <h3 className="text-sm font-semibold">Caption</h3>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Internal title"
                  className="w-full rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                />
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  placeholder="Main caption (English ya Roman Urdu)…"
                  className="w-full rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                />
                <div className="flex flex-wrap gap-1">
                  {hashtagList.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setHashtagList((h) => h.filter((x) => x !== tag))}
                      className="rounded-full bg-[#F6F6F8] px-2 py-0.5 text-xs font-medium"
                    >
                      #{tag} ×
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                    placeholder="#hashtag"
                    className="min-w-0 flex-1 rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addHashtag}
                    className="rounded-xl border border-[#E8E8ED] px-3 text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
                <label className="block text-xs font-medium text-[#6B6B76]">TikTok caption (optional)</label>
                <textarea
                  value={captionTiktok}
                  onChange={(e) => setCaptionTiktok(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                />
                <label className="block text-xs font-medium text-[#6B6B76]">First comment (IG)</label>
                <textarea
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={productUrl}
                    onChange={(e) => setProductUrl(e.target.value)}
                    placeholder="https://crazzycars.pk/product/…"
                    className="min-w-0 flex-1 rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={checkProduct}
                    className="rounded-xl border border-[#E8E8ED] px-4 py-2 text-sm font-semibold"
                  >
                    Check
                  </button>
                </div>
                {productInfo ? (
                  <p className="text-xs text-emerald-700">✓ {productInfo.name}</p>
                ) : null}
              </section>

              <section className={cardClass("p-4 space-y-3")}>
                <h3 className="text-sm font-semibold">When &amp; where</h3>
                <p className="text-xs text-[#6B6B76]">Time Pakistan (PKT) mein</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="date"
                    value={pktDate}
                    onChange={(e) => setPktDate(e.target.value)}
                    className="rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                  />
                  <input
                    type="time"
                    value={pktTime}
                    onChange={(e) => setPktTime(e.target.value)}
                    className="rounded-xl border border-[#E8E8ED] px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  {["10:00", "18:00"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setPktTime(t)}
                      className="rounded-xl bg-[#F6F6F8] px-3 py-1.5 text-xs font-semibold"
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <PlatformToggles value={platforms} onChange={setPlatforms} disabled={Boolean(saving)} />
              </section>
            </div>

            <aside className="hidden w-[320px] shrink-0 border-l border-[#E8E8ED] bg-white p-4 md:block">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6B6B76]">
                Live preview
              </p>
              <PostPreview finalCaption={finalCaption} images={images} platforms={platforms} />
            </aside>
          </div>
        )}

        <footer className="flex flex-wrap gap-2 border-t border-[#E8E8ED] bg-white p-3">
          <button
            type="button"
            disabled={Boolean(saving)}
            onClick={handleSaveDraft}
            className="rounded-xl border border-[#E8E8ED] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {saving === "draft" ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={Boolean(saving)}
            onClick={handleSchedule}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.brand }}
          >
            {saving === "scheduled" ? "Scheduling…" : "Schedule"}
          </button>
          <button
            type="button"
            disabled={Boolean(saving)}
            onClick={handlePostNow}
            className="ml-auto rounded-xl border-2 px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: COLORS.brand, color: COLORS.brand }}
          >
            {saving === "publish" ? "Posting…" : "Post now"}
          </button>
        </footer>
      </div>
    </div>
  );
}
