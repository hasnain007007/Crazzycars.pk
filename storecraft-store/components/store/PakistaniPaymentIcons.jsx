/** Official-style Pakistani payment logos (transparent background — no text stickers). */

function LogoBox({ height, viewBox, children, title }) {
  const [, , vbW, vbH] = viewBox.split(" ").map(Number);
  const w = Math.round((height * vbW) / vbH);
  return (
    <svg
      viewBox={viewBox}
      width={w}
      height={height}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      style={{ flexShrink: 0, display: "block" }}
    >
      <title>{title}</title>
      {children}
    </svg>
  );
}

/** Shared styles for logo images — fit inside a fixed checkout slot. */
const logoImgStyle = (height) => ({
  width: height,
  height: height,
  maxWidth: height,
  maxHeight: height,
  objectFit: "contain",
  objectPosition: "center",
  flexShrink: 0,
  display: "block",
  borderRadius: 6,
  background: "#FFFFFF",
});

/** Cash on Delivery — delivery + cash illustration */
export function IconCod({ height = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/payment-logos/cod.jpg" alt="Cash on Delivery" width={height} height={height} style={logoImgStyle(height)} />
  );
}

/** JazzCash — official logo */
export function IconJazzCash({ height = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/payment-logos/jazzcash.jpg" alt="JazzCash" width={height} height={height} style={logoImgStyle(height)} />
  );
}

/** Easypaisa — green e mark */
export function IconEasypaisa({ height = 36 }) {
  return (
    <LogoBox height={height} viewBox="0 0 36 36" title="Easypaisa">
      <circle cx="18" cy="18" r="18" fill="#00A651" />
      <path
        d="M10 18c0-5 3.4-8.4 8.4-8.4 2.9 0 5.3 1.2 6.6 3.1l-3.3 2.2c-.7-1.1-1.8-1.7-3.3-1.7-2.5 0-4.2 1.9-4.2 4.8s1.7 4.8 4.2 4.8c1.5 0 2.6-.6 3.3-1.7l3.3 2.2c-1.3 1.9-3.7 3.1-6.6 3.1C13.4 26.4 10 23 10 18z"
        fill="#FFFFFF"
      />
      <rect x="9" y="16.2" width="14" height="3.6" rx="1.2" fill="#FFFFFF" />
    </LogoBox>
  );
}

/** HBL — green square with red diamond */
export function IconHbl({ height = 36 }) {
  return (
    <LogoBox height={height} viewBox="0 0 36 36" title="HBL">
      <rect width="36" height="36" rx="8" fill="#006233" />
      <path d="M18 7l7 6.5L18 20l-7-6.5L18 7z" fill="#E31C23" />
      <path d="M18 10l3.8 3.5L18 17l-3.8-3.5L18 10z" fill="#FFFFFF" />
      <text
        x="18"
        y="30"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="8"
        letterSpacing="1"
      >
        HBL
      </text>
    </LogoBox>
  );
}

/** Meezan Bank — official logo */
export function IconMeezan({ height = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/payment-logos/meezan.jpg" alt="Meezan Bank" width={height} height={height} style={logoImgStyle(height)} />
  );
}

/** UBL — red seal */
export function IconUbl({ height = 36 }) {
  return (
    <LogoBox height={height} viewBox="0 0 36 36" title="UBL">
      <rect width="36" height="36" rx="8" fill="#BE0000" />
      <path
        d="M18 7l2.5 5.8 6.2.5-4.7 4 1.3 6L18 20.2 12.7 23.3l1.3-6-4.7-4 6.2-.5L18 7z"
        fill="#FFFFFF"
      />
      <text
        x="18"
        y="31"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="7"
        letterSpacing="0.5"
      >
        UBL
      </text>
    </LogoBox>
  );
}

/** Bank Alfalah — official logo (bank transfer) */
export function IconBankTransfer({ height = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/payment-logos/alfalah.jpg" alt="Bank Alfalah" width={height} height={height} style={logoImgStyle(height)} />
  );
}

const ICON_MAP = {
  cod: IconCod,
  jazzcash: IconJazzCash,
  easypaisa: IconEasypaisa,
  hbl: IconHbl,
  meezan: IconMeezan,
  ubl: IconUbl,
  bank: IconBankTransfer,
  banktransfer: IconBankTransfer,
  bankTransfer: IconBankTransfer,
};

export function PakistaniPaymentIcon({ methodKey, height = 36 }) {
  const key = String(methodKey || "cod");
  const Comp = ICON_MAP[key] || ICON_MAP[key.toLowerCase()] || IconCod;
  return <Comp height={height} />;
}

/** Footer row: default + optional enabled methods from settings */
export function FooterPaymentIcons({ pakistaniPaymentMethods }) {
  const pm = pakistaniPaymentMethods || {};
  const items = [
    { key: "cod", Comp: IconCod },
    { key: "jazzcash", Comp: IconJazzCash },
    { key: "easypaisa", Comp: IconEasypaisa },
  ];
  if (pm.hbl?.enabled) items.push({ key: "hbl", Comp: IconHbl });
  if (pm.meezan?.enabled) items.push({ key: "meezan", Comp: IconMeezan });
  if (pm.ubl?.enabled) items.push({ key: "ubl", Comp: IconUbl });
  if (pm.bankTransfer?.enabled) items.push({ key: "bankTransfer", Comp: IconBankTransfer });

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {items.map(({ key, Comp }) => (
        <span key={key} title={key} style={{ display: "inline-flex", alignItems: "center" }}>
          <Comp height={28} />
        </span>
      ))}
    </div>
  );
}
