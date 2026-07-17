/** Inline SVG payment badges for footer & checkout (height ~28px). */

export function PaymentIconCod({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#111111" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="9" fill="white">
        COD
      </text>
    </svg>
  );
}

export function PaymentIconJazzCash({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#D5001F" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="8" fill="white">
        JazzCash
      </text>
    </svg>
  );
}

export function PaymentIconEasypaisa({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#2ECC40" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="8" fill="white">
        Easypaisa
      </text>
    </svg>
  );
}

export function PaymentIconHbl({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#006B3F" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="white">
        HBL
      </text>
    </svg>
  );
}

export function PaymentIconMeezan({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#00703C" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="8" fill="white">
        Meezan
      </text>
    </svg>
  );
}

export function PaymentIconUbl({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#C41E1E" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="10" fill="white">
        UBL
      </text>
    </svg>
  );
}

export function PaymentIconBankTransfer({ height = 28 }) {
  const w = Math.round((height * 50) / 30);
  return (
    <svg viewBox="0 0 50 30" width={w} height={height} aria-hidden>
      <rect width="50" height="30" rx="4" fill="#374151" />
      <text x="25" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="7" fill="white">
        Bank TT
      </text>
    </svg>
  );
}

const ICON_MAP = {
  cod: PaymentIconCod,
  jazzcash: PaymentIconJazzCash,
  easypaisa: PaymentIconEasypaisa,
  bank: PaymentIconBankTransfer,
  banktransfer: PaymentIconBankTransfer,
  bankTransfer: PaymentIconBankTransfer,
  hbl: PaymentIconHbl,
  meezan: PaymentIconMeezan,
  ubl: PaymentIconUbl,
};

export function PakistaniPaymentIcon({ methodKey, height = 28 }) {
  const key = String(methodKey || "cod").toLowerCase();
  const Comp = ICON_MAP[key] || PaymentIconCod;
  return <Comp height={height} />;
}
