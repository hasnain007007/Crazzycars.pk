/** Admin card icons (40×40) and storefront badges. */

export function AdminIconCod() {
  return (
    <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
      💰
    </span>
  );
}

export function AdminIconJazzCash() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#D5001F" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="white">
        JC
      </text>
    </svg>
  );
}

export function AdminIconEasypaisa() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#2ECC40" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="white">
        EP
      </text>
    </svg>
  );
}

export function AdminIconBank() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#374151" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="white">
        BNK
      </text>
    </svg>
  );
}

export function AdminIconHbl() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#006B3F" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="white">
        HBL
      </text>
    </svg>
  );
}

export function AdminIconMeezan() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#00703C" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12" fill="white">
        MBL
      </text>
    </svg>
  );
}

export function AdminIconUbl() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} aria-hidden>
      <rect width="40" height="40" rx="8" fill="#C41E1E" />
      <text x="20" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="14" fill="white">
        UBL
      </text>
    </svg>
  );
}

const ADMIN_ICONS = {
  cod: AdminIconCod,
  jazzcash: AdminIconJazzCash,
  easypaisa: AdminIconEasypaisa,
  bankTransfer: AdminIconBank,
  hbl: AdminIconHbl,
  meezan: AdminIconMeezan,
  ubl: AdminIconUbl,
};

export function AdminPaymentMethodIcon({ methodKey }) {
  const Comp = ADMIN_ICONS[methodKey] || AdminIconCod;
  return <Comp />;
}
