"use client";

function cssObjectPosition(pos) {
  if (!pos) return "center center";
  if (String(pos).includes(" ")) return pos;
  const map = {
    center: "center center",
    top: "top center",
    bottom: "bottom center",
    left: "center left",
    right: "center right",
  };
  return map[pos] || pos;
}

export function BannerPreviewPanel({
  background,
  content,
  imageDisplay,
  mobileCustomHtml,
  onMobileImagePositionChange,
}) {
  const badge = content?.badge?.text?.trim() || "";
  const heading = content?.heading?.text?.trim() || "";
  const subheadingLines = (() => {
    if (Array.isArray(content?.subheadings) && content.subheadings.length > 0) {
      return content.subheadings.map((s) => String(s ?? "").trim()).filter(Boolean);
    }
    const legacy = content?.subheading?.text?.trim();
    return legacy ? [legacy] : [];
  })();
  const textColor = content?.heading?.color || "#FFFFFF";
  const subheadingColor = content?.subheading?.color || textColor;
  const primaryButton = content?.buttons?.[0];
  const buttonText = primaryButton?.text?.trim() || "";
  const buttonColor = primaryButton?.bgColor || "#C9A84C";
  const buttonTextColor = primaryButton?.textColor || primaryButton?.color || "#FFFFFF";
  const overlay = imageDisplay?.overlay || { enabled: false, opacity: 40, color: "rgba(0,0,0,0.4)" };
  const bgColor = background?.color || "#111111";
  const desktopImageUrl = background?.image?.url || "";
  const mobileImageUrl = background?.mobileImage?.url || "";
  const desktopImagePosition = cssObjectPosition(imageDisplay?.objectPosition);
  const mobileImagePosition = background?.mobileImagePosition || "center center";
  const mobilePreviewSrc = mobileImageUrl || desktopImageUrl;
  const hasDesktopImage = Boolean(desktopImageUrl);
  const hasMobileImage = Boolean(mobilePreviewSrc);

  return (
    <>
      {/* DESKTOP PREVIEW */}
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#374151",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          🖥️ Desktop Preview
        </p>
        <div
          style={{
            width: "100%",
            height: 220,
            background: bgColor,
            borderRadius: 8,
            border: "2px solid #E5E7EB",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            padding: "0 60px",
          }}
        >
          {hasDesktopImage ? (
            <img
              src={desktopImageUrl}
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: imageDisplay?.objectFit || "cover",
                objectPosition: desktopImagePosition,
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
          <div style={{ position: "relative", zIndex: 2, maxWidth: "50%" }}>
            {badge ? (
              <span
                style={{
                  display: "inline-block",
                  background: content?.badge?.bgColor || "#C9A84C",
                  color: content?.badge?.color || "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 2,
                  letterSpacing: "0.1em",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                {badge}
              </span>
            ) : null}
            {heading ? (
              <h2
                style={{
                  color: textColor,
                  fontSize: 22,
                  fontWeight: 700,
                  margin: "0 0 6px",
                  lineHeight: 1.2,
                  textShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}
              >
                {heading}
              </h2>
            ) : null}
            {subheadingLines.map((sub, i) => (
              <p
                key={i}
                style={{
                  color: subheadingColor,
                  fontSize: 12,
                  margin: i === subheadingLines.length - 1 ? "0 0 10px" : "0 0 3px",
                  opacity: 0.9,
                  lineHeight: 1.4,
                }}
              >
                {sub}
              </p>
            ))}
            {buttonText ? (
              <div
                style={{
                  display: "inline-block",
                  padding: "6px 16px",
                  background: buttonColor,
                  color: buttonTextColor,
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 3,
                  letterSpacing: "0.06em",
                }}
              >
                {buttonText}
              </div>
            ) : null}
          </div>
          {!hasDesktopImage ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p style={{ fontSize: 13, color: "#9CA3AF" }}>Upload desktop image to preview</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* MOBILE PREVIEW */}
      <div style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#374151",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          📱 Mobile Preview
        </p>

        <div
          style={{
            width: 240,
            margin: "0 auto",
            background: "#1a1a1a",
            borderRadius: 32,
            padding: "12px 8px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ background: "#FFFFFF", borderRadius: 22, overflow: "hidden" }}>
            <div
              style={{
                background: "#111",
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 12px",
              }}
            >
              <span style={{ fontSize: 8, color: "#fff", fontWeight: 600 }}>9:41</span>
              <span style={{ fontSize: 8, color: "#fff" }}>●●●</span>
            </div>

            <div
              className="banner-mobile-preview-banner"
              style={{
                width: "100%",
                height: 140,
                background: bgColor,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {mobileCustomHtml ? (
                <div
                  className="banner-mobile-custom-html"
                  dangerouslySetInnerHTML={{ __html: mobileCustomHtml }}
                  style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 3 }}
                />
              ) : null}
              {hasMobileImage ? (
                <img
                  src={mobilePreviewSrc}
                  alt=""
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: mobileImagePosition,
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
                    zIndex: 1,
                  }}
                />
              ) : null}
              <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0 12px" }}>
                {heading ? (
                  <h3
                    style={{
                      color: textColor,
                      fontSize: 13,
                      fontWeight: 700,
                      margin: "0 0 4px",
                      lineHeight: 1.2,
                      textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                    }}
                  >
                    {heading}
                  </h3>
                ) : null}
                {subheadingLines.map((sub, i) => (
                  <p key={i} style={{ color: subheadingColor, fontSize: 9, margin: "0 0 3px", opacity: 0.9 }}>
                    {sub}
                  </p>
                ))}
                {buttonText ? (
                  <div
                    style={{
                      display: "inline-block",
                      padding: "3px 10px",
                      background: buttonColor,
                      color: buttonTextColor,
                      fontSize: 8,
                      fontWeight: 700,
                      borderRadius: 2,
                    }}
                  >
                    {buttonText}
                  </div>
                ) : null}
              </div>
              {!hasMobileImage ? (
                <p style={{ fontSize: 10, color: "#9CA3AF", position: "relative", zIndex: 2 }}>No image</p>
              ) : null}
            </div>

            <div style={{ padding: 10 }}>
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, marginBottom: 4 }} />
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, width: "70%", marginBottom: 4 }} />
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 3, width: "50%" }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#374151",
              marginBottom: 6,
            }}
          >
            Mobile Image Position
          </label>
          <select
            value={mobileImagePosition}
            onChange={(e) => onMobileImagePositionChange(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #E5E7EB",
              borderRadius: 6,
              fontSize: 13,
              color: "#111827",
              background: "#FFFFFF",
            }}
          >
            <option value="center center">Center</option>
            <option value="top center">Top</option>
            <option value="bottom center">Bottom</option>
            <option value="center left">Left</option>
            <option value="center right">Right</option>
            <option value="top left">Top Left</option>
            <option value="top right">Top Right</option>
            <option value="bottom left">Bottom Left</option>
            <option value="bottom right">Bottom Right</option>
          </select>
        </div>
      </div>
    </>
  );
}
