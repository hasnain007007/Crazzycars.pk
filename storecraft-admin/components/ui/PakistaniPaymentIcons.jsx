/** Official-style Pakistani payment method badges (admin settings cards). */

export function IconCod({ height = 40 }) {
  const w = Math.round((height * 60) / 36);
  return (
    <svg viewBox="0 0 60 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="60" height="36" rx="6" fill="#1F2937" />
      <text x="30" y="23" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="11" fill="#FFFFFF">
        COD
      </text>
    </svg>
  );
}

export function IconJazzCash({ height = 40 }) {
  const w = Math.round((height * 80) / 36);
  return (
    <svg viewBox="0 0 80 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="80" height="36" rx="6" fill="#E4002B" />
      <text x="40" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="9" fill="#FFD700" letterSpacing="0.5">
        Jazz
      </text>
      <text x="40" y="28" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11" fill="#FFFFFF" letterSpacing="1">
        Cash
      </text>
    </svg>
  );
}

export function IconEasypaisa({ height = 40 }) {
  const w = Math.round((height * 80) / 36);
  return (
    <svg viewBox="0 0 80 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="80" height="36" rx="6" fill="#3BB54A" />
      <text x="40" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="#FFFFFF" letterSpacing="0.5">
        easy
      </text>
      <text x="40" y="28" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="11" fill="#FFFFFF" letterSpacing="1">
        paisa
      </text>
    </svg>
  );
}

export function IconHbl({ height = 40 }) {
  const w = Math.round((height * 60) / 36);
  return (
    <svg viewBox="0 0 60 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="60" height="36" rx="6" fill="#006233" />
      <text x="30" y="23" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="14" fill="#FFFFFF" letterSpacing="2">
        HBL
      </text>
    </svg>
  );
}

export function IconMeezan({ height = 40 }) {
  const w = Math.round((height * 80) / 36);
  return (
    <svg viewBox="0 0 80 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="80" height="36" rx="6" fill="#00703C" />
      <text x="40" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="#FFFFFF" letterSpacing="0.5">
        MEEZAN
      </text>
      <text x="40" y="28" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="10" fill="#FFFFFF" letterSpacing="0.5">
        BANK
      </text>
    </svg>
  );
}

export function IconUbl({ height = 40 }) {
  const w = Math.round((height * 60) / 36);
  return (
    <svg viewBox="0 0 60 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="60" height="36" rx="6" fill="#BE0000" />
      <text x="30" y="23" textAnchor="middle" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="14" fill="#FFFFFF" letterSpacing="2">
        UBL
      </text>
    </svg>
  );
}

export function IconBankTransfer({ height = 40 }) {
  const w = Math.round((height * 80) / 36);
  return (
    <svg viewBox="0 0 80 36" width={w} height={height} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="80" height="36" rx="6" fill="#1E3A5F" />
      <text x="40" y="15" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="8" fill="#FFFFFF" letterSpacing="0.5">
        BANK
      </text>
      <text x="40" y="28" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="9" fill="#FFFFFF" letterSpacing="0.5">
        TRANSFER
      </text>
    </svg>
  );
}

const ICON_MAP = {
  cod: IconCod,
  jazzcash: IconJazzCash,
  easypaisa: IconEasypaisa,
  hbl: IconHbl,
  meezan: IconMeezan,
  ubl: IconUbl,
  bankTransfer: IconBankTransfer,
};

export function AdminPaymentMethodIcon({ methodKey, height = 40 }) {
  const Comp = ICON_MAP[methodKey] || IconCod;
  return <Comp height={height} />;
}
