/**
 * Prominent WhatsApp CTA — send payment screenshot.
 */
"use client";

export function WhatsAppPaymentButton({
  href,
  displayNumber,
  label = "Send payment screenshot on WhatsApp",
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        marginTop: 12,
        padding: "12px 18px",
        background: "#25D366",
        border: "1px solid #128C7E",
        borderRadius: 10,
        color: "#fff",
        textDecoration: "none",
        fontWeight: 700,
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        maxWidth: "100%",
      }}
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <path
          fill="#fff"
          d="M16.004 3C9.38 3 4 8.38 4 15.004c0 2.24.63 4.32 1.72 6.1L4 29l8.1-1.7a11.9 11.9 0 0 0 3.9.66C22.62 28 28 22.62 28 15.996 28 9.38 22.62 3 16.004 3Zm0 21.8c-1.22 0-2.4-.24-3.48-.7l-.25-.12-4.8 1 1.02-4.68-.16-.26a9.7 9.7 0 0 1-1.5-5.22c0-5.36 4.36-9.72 9.73-9.72 5.36 0 9.72 4.36 9.72 9.72 0 5.37-4.36 9.73-9.72 9.73Zm5.34-7.28c-.29-.15-1.72-.85-1.99-.94-.27-.1-.46-.15-.66.15-.2.29-.76.94-.93 1.13-.17.2-.34.22-.63.07-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.51.15-.17.2-.29.29-.49.1-.2.05-.37-.02-.52-.07-.15-.66-1.59-.9-2.18-.24-.57-.48-.49-.66-.5h-.56c-.2 0-.52.07-.79.37-.27.29-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.72-.7 1.96-1.38.24-.68.24-1.26.17-1.38-.07-.12-.26-.2-.55-.34Z"
        />
      </svg>
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, textAlign: "left" }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        {displayNumber ? (
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.2 }}>{displayNumber}</span>
        ) : null}
      </span>
    </a>
  );
}
