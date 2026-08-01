"use client";

import { useState } from "react";

const MUTED = "#9CA3AF";
const BRAND_RED = "#C41E1E";
const BRAND_DARK = "#111111";

function previewBackground(form) {
  const bg = form.background || {};
  if (bg.type === "gradient" && bg.gradientFrom && bg.gradientTo) {
    const dir = bg.gradientDirection || "to right";
    return `linear-gradient(${dir}, ${bg.gradientFrom}, ${bg.gradientTo})`;
  }
  return bg.color || BRAND_DARK;
}

export function BannerFormLivePreview({ form }) {
  const [previewMode, setPreviewMode] = useState("desktop");
  const desktopImageUrl = form.background?.image?.url || "";
  const mobileImageUrl = form.background?.mobileImage?.url || "";
  const overlay = form.imageDisplay?.overlay || {
    enabled: false,
    opacity: 40,
    color: "rgba(0,0,0,0.4)",
  };
  const buttons = (form.content?.buttons || []).filter((b) => b?.text?.trim());
  const badge = form.content?.badge;
  const headingText = (form.content?.heading?.text || "").trim();
  const subheadingText = (form.content?.subheading?.text || "").trim();
  const descriptionText = (form.content?.description?.text || "").trim();
  const subheadingLines = [
    ...(form.subheadings || []).filter((s) => String(s).trim()),
    ...(subheadingText ? [subheadingText] : []),
  ];
  const previewSrc =
    previewMode === "mobile" && mobileImageUrl ? mobileImageUrl : desktopImageUrl;
  const hasImage = Boolean(desktopImageUrl || mobileImageUrl);
  const isMobile = previewMode === "mobile";
  // Designed banners leave heading empty — don't stack placeholder text over artwork.
  const designedArtwork =
    hasImage && !headingText && !subheadingText && !descriptionText && !badge?.text?.trim();
  const showPlaceholders = !designedArtwork;

  return (
    <div style={{ marginBottom: 24 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#374151",
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        Live Preview
      </p>

      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 12,
          border: "1px solid #E5E7EB",
          borderRadius: 8,
          overflow: "hidden",
          width: "fit-content",
        }}
      >
        <button
          type="button"
          onClick={() => setPreviewMode("desktop")}
          style={{
            padding: "8px 20px",
            background: previewMode === "desktop" ? BRAND_DARK : "#FFFFFF",
            color: previewMode === "desktop" ? "#FFFFFF" : "#6B7280",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🖥️ Desktop
        </button>
        <button
          type="button"
          onClick={() => setPreviewMode("mobile")}
          style={{
            padding: "8px 20px",
            background: previewMode === "mobile" ? BRAND_DARK : "#FFFFFF",
            color: previewMode === "mobile" ? "#FFFFFF" : "#6B7280",
            border: "none",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          📱 Mobile
        </button>
      </div>

      <div
        style={{
          border: "1px solid #E5E7EB",
          borderRadius: 10,
          overflow: "hidden",
          background: "#F9FAFB",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            background: "#F3F4F6",
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderBottom: "1px solid #E5E7EB",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#28C840" }} />
          </div>
          <div
            style={{
              flex: 1,
              background: "#FFFFFF",
              borderRadius: 4,
              padding: "3px 10px",
              fontSize: 10,
              color: MUTED,
              border: "1px solid #E5E7EB",
            }}
          >
            yourstore.com
          </div>
          <span style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>
            {previewMode === "desktop" ? "1440px" : "390px"}
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: isMobile ? 160 : 200,
            background: previewBackground(form),
            position: "relative",
            overflow: "hidden",
            transition: "height 0.3s ease",
          }}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center center",
              }}
            />
          ) : null}
          {overlay?.enabled ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: overlay.color || "rgba(0,0,0,0.4)",
                opacity: (overlay.opacity || 40) / 100,
              }}
            />
          ) : null}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: designedArtwork ? "flex-end" : "center",
              justifyContent: isMobile ? "center" : "flex-start",
              padding: isMobile ? "16px" : designedArtwork ? "24px 40px" : "0 40px",
              textAlign: isMobile ? "center" : "left",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                maxWidth: isMobile ? "100%" : designedArtwork ? "100%" : "50%",
                position: "relative",
                zIndex: 2,
                alignSelf: designedArtwork ? "flex-end" : undefined,
              }}
            >
              {badge?.text?.trim() ? (
                <div
                  style={{
                    display: "inline-block",
                    background: badge.bgColor || "rgba(255,255,255,0.2)",
                    color: badge.color || "#fff",
                    fontSize: isMobile ? 7 : 9,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 2,
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  {badge.text}
                </div>
              ) : null}
              {headingText || showPlaceholders ? (
                <h3
                  style={{
                    color: headingText ? form.content?.heading?.color || "#FFFFFF" : MUTED,
                    fontSize: isMobile ? 14 : 20,
                    fontWeight: headingText ? 700 : 500,
                    margin: "0 0 6px",
                    lineHeight: 1.2,
                    textShadow: headingText ? "0 1px 4px rgba(0,0,0,0.5)" : "none",
                    fontStyle: headingText ? "normal" : "italic",
                  }}
                >
                  {headingText || "Your headline here"}
                </h3>
              ) : null}
              {subheadingLines.length > 0
                ? subheadingLines.map((s, i) => (
                    <p
                      key={i}
                      style={{
                        color: form.content?.subheading?.color || "#FFFFFF",
                        fontSize: isMobile ? 9 : 11,
                        margin: "0 0 3px",
                        opacity: 0.9,
                        textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                      }}
                    >
                      {s}
                    </p>
                  ))
                : showPlaceholders ? (
                    <p
                      style={{
                        color: MUTED,
                        fontSize: isMobile ? 9 : 11,
                        margin: "0 0 3px",
                        fontStyle: "italic",
                      }}
                    >
                      Your subheading here
                    </p>
                  ) : null}
              {descriptionText ? (
                <p
                  style={{
                    color: form.content?.description?.color || MUTED,
                    fontSize: isMobile ? 8 : 10,
                    margin: "4px 0 0",
                    opacity: 0.85,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {descriptionText}
                </p>
              ) : showPlaceholders ? (
                <p
                  style={{
                    color: MUTED,
                    fontSize: isMobile ? 8 : 10,
                    margin: "4px 0 0",
                    fontStyle: "italic",
                  }}
                >
                  Your description here
                </p>
              ) : null}
              {buttons.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginTop: designedArtwork ? 0 : 8,
                    justifyContent: isMobile ? "center" : "flex-start",
                  }}
                >
                  {buttons.map((btn, i) => {
                    const styleName = String(btn.style || "primary").toLowerCase();
                    const isOutline = styleName === "outline" || styleName === "secondary";
                    return (
                      <div
                        key={i}
                        style={{
                          display: "inline-block",
                          padding: isMobile ? "4px 12px" : "6px 16px",
                          background: isOutline
                            ? "transparent"
                            : btn.bgColor || BRAND_RED,
                          color: isOutline
                            ? "#FFFFFF"
                            : btn.textColor || btn.color || "#FFFFFF",
                          fontSize: isMobile ? 8 : 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          border: isOutline ? `1px solid ${btn.bgColor || "#FFFFFF"}` : "none",
                        }}
                      >
                        {btn.text}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          {!hasImage ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 8,
                pointerEvents: "none",
              }}
            >
              <span style={{ fontSize: 32, opacity: 0.5 }}>🖼️</span>
              <p style={{ fontSize: 12, color: MUTED, margin: 0 }}>Upload an image to see preview</p>
            </div>
          ) : null}
        </div>

        <div style={{ background: "#FFFFFF", padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {[1, 2, 3, 4].slice(0, isMobile ? 2 : 4).map((i) => (
              <div
                key={i}
                style={{
                  height: isMobile ? 50 : 60,
                  background: "#F3F4F6",
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
          <div
            style={{
              height: 6,
              background: "#F3F4F6",
              borderRadius: 3,
              marginBottom: 6,
              width: "60%",
            }}
          />
          <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, width: "40%" }} />
        </div>
      </div>
    </div>
  );
}
