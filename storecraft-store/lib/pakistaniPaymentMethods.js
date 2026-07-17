/** Default Pakistani payment method config (storefront). */
export const DEFAULT_PAKISTANI_PAYMENT_METHODS = {
  cod: {
    enabled: true,
    label: "Cash on Delivery",
    icon: "cod",
  },
  jazzcash: {
    enabled: false,
    label: "JazzCash",
    accountNumber: "",
    accountName: "",
    icon: "jazzcash",
  },
  easypaisa: {
    enabled: false,
    label: "Easypaisa",
    accountNumber: "",
    accountName: "",
    icon: "easypaisa",
  },
  bankTransfer: {
    enabled: false,
    label: "Bank Transfer",
    bankName: "",
    accountNumber: "",
    accountTitle: "",
    iban: "",
    icon: "bank",
  },
  hbl: {
    enabled: false,
    label: "HBL",
    accountNumber: "",
    accountTitle: "",
    icon: "hbl",
  },
  meezan: {
    enabled: false,
    label: "Meezan Bank",
    accountNumber: "",
    accountTitle: "",
    icon: "meezan",
  },
  ubl: {
    enabled: false,
    label: "UBL",
    accountNumber: "",
    accountTitle: "",
    icon: "ubl",
  },
};

export const PAKISTANI_PAYMENT_METHOD_KEYS = [
  "cod",
  "jazzcash",
  "easypaisa",
  "bankTransfer",
  "hbl",
  "meezan",
  "ubl",
];

export function normalizePakistaniPaymentMethods(raw) {
  const base = { ...DEFAULT_PAKISTANI_PAYMENT_METHODS };
  if (!raw || typeof raw !== "object") return base;
  const out = {};
  for (const key of PAKISTANI_PAYMENT_METHOD_KEYS) {
    const def = base[key] || {};
    const src = raw[key] && typeof raw[key] === "object" ? raw[key] : {};
    out[key] = { ...def, ...src };
    if (key === "cod" && src.enabled === undefined) {
      out.cod.enabled = def.enabled !== false;
    }
  }
  if (!out.cod.enabled && Object.values(out).every((m) => !m.enabled)) {
    out.cod.enabled = true;
  }
  return out;
}

export function getEnabledPakistaniMethods(methods) {
  const m = normalizePakistaniPaymentMethods(methods);
  return PAKISTANI_PAYMENT_METHOD_KEYS.filter((key) => m[key]?.enabled === true).map((key) => ({
    key,
    ...m[key],
  }));
}

export function isOfflinePakistaniPayment(method) {
  const id = String(method || "cod");
  if (id === "stripe" || id === "paypal") return false;
  return PAKISTANI_PAYMENT_METHOD_KEYS.includes(id);
}

/** JazzCash, Easypaisa, banks, etc. — advance payment qualifies for free delivery. */
export function isAdvancePaymentMethod(method) {
  const id = String(method || "cod").trim();
  if (!id || id.toLowerCase() === "cod") return false;
  if (id === "stripe" || id === "paypal") return false;
  return PAKISTANI_PAYMENT_METHOD_KEYS.includes(id);
}
