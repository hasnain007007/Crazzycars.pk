"use client";

import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, ThumbsUp, Share2 } from "lucide-react";
import { COLORS, cardClass } from "./socialTheme";

export function PostPreview({ finalCaption = "", images = [], platforms = {} }) {
  const [tab, setTab] = useState(platforms.instagram !== false ? "ig" : "fb");
  const sorted = [...images].sort((a, b) => (a.order || 0) - (b.order || 0));
  const thumbs = sorted.map((i) => i.url).filter(Boolean);

  return (
    <div className={cardClass("overflow-hidden p-0")}>
      <div className="flex border-b border-[#E8E8ED]">
        {platforms.instagram !== false ? (
          <button
            type="button"
            onClick={() => setTab("ig")}
            className={`flex-1 py-2.5 text-xs font-semibold ${
              tab === "ig" ? "border-b-2 text-[#111114]" : "text-[#6B6B76]"
            }`}
            style={tab === "ig" ? { borderColor: COLORS.brand } : undefined}
          >
            Instagram
          </button>
        ) : null}
        {platforms.facebook !== false ? (
          <button
            type="button"
            onClick={() => setTab("fb")}
            className={`flex-1 py-2.5 text-xs font-semibold ${
              tab === "fb" ? "border-b-2 text-[#111114]" : "text-[#6B6B76]"
            }`}
            style={tab === "fb" ? { borderColor: COLORS.brand } : undefined}
          >
            Facebook
          </button>
        ) : null}
      </div>

      <div className="p-3">
        {tab === "ig" ? (
          <div className="mx-auto max-w-[280px] rounded-xl border border-[#E8E8ED] bg-white">
            <div className="flex items-center gap-2 border-b border-[#E8E8ED] px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-orange-400" />
              <span className="text-xs font-semibold">crazzycars.pk</span>
            </div>
            <div className="relative aspect-square bg-[#F6F6F8]">
              {thumbs[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbs[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#9CA3AF]">
                  Carousel preview
                </div>
              )}
              {thumbs.length > 1 ? (
                <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  1/{thumbs.length}
                </span>
              ) : null}
            </div>
            <div className="flex gap-3 px-3 py-2 text-[#111114]">
              <Heart className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
              <Send className="h-5 w-5" />
              <Bookmark className="ml-auto h-5 w-5" />
            </div>
            <p className="whitespace-pre-wrap px-3 pb-3 text-xs leading-relaxed text-[#111114]">
              <span className="font-semibold">crazzycars.pk </span>
              {finalCaption || "Caption yahan dikhega…"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-[#E8E8ED] bg-white p-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-[#1877F2]" />
              <div>
                <p className="text-xs font-semibold">CrazzyCars</p>
                <p className="text-[10px] text-[#6B6B76]">Just now · 🌐</p>
              </div>
            </div>
            <p className="mb-2 whitespace-pre-wrap text-xs text-[#111114]">
              {finalCaption || "Caption…"}
            </p>
            {thumbs.length ? (
              <div
                className={`grid gap-0.5 overflow-hidden rounded-lg ${
                  thumbs.length === 1 ? "grid-cols-1" : "grid-cols-2"
                }`}
              >
                {thumbs.slice(0, 4).map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="aspect-square w-full object-cover" />
                ))}
              </div>
            ) : (
              <div className="flex h-24 items-center justify-center rounded-lg bg-[#F6F6F8] text-xs text-[#9CA3AF]">
                Grid preview
              </div>
            )}
            <div className="mt-2 flex justify-around border-t border-[#E8E8ED] pt-2 text-[#6B6B76]">
              <ThumbsUp className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <Share2 className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
