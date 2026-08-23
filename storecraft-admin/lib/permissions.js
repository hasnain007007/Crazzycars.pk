/**
 * Fixed-role capability map for admin authz.
 *
 * Roles (canonical): owner | manager | staff | viewer
 * Read aliases (one deploy cycle): superadmin→owner, admin→manager, editor→staff
 *
 * Prefer hasCapability over rank checks — Manager is above Staff on ops but must
 * NOT inherit canViewFinancials.
 */

/** @typedef {'owner'|'manager'|'staff'|'viewer'} CanonicalRole */

export const CANONICAL_ROLES = ["owner", "manager", "staff", "viewer"];

/** Legacy JWT / DB values accepted during the alias window. */
export const ROLE_ALIASES = {
  superadmin: "owner",
  admin: "manager",
  editor: "staff",
};

export const CAPABILITIES = [
  "canViewFinancials",
  "canViewProductCosts",
  "canViewOrders",
  "canManageOrders",
  "canRefundOrders",
  "canManageCatalog",
  "canEditPricing",
  "canManageInventory",
  "canManageCoupons",
  "canManageContent",
  "canManageCustomers",
  "canResetCustomerPasswords",
  "canManageUsers",
  "canManageSettings",
  "canExportOrders",
  "canExportFinancialReports",
];

const ALL = Object.fromEntries(CAPABILITIES.map((c) => [c, true]));

/** @type {Record<CanonicalRole, Record<string, boolean>>} */
export const ROLE_CAPS = {
  owner: { ...ALL },
  manager: {
    canViewFinancials: false,
    canViewProductCosts: false,
    canViewOrders: true,
    canManageOrders: true,
    canRefundOrders: false,
    canManageCatalog: true,
    canEditPricing: true,
    canManageInventory: true,
    canManageCoupons: true,
    canManageContent: true,
    canManageCustomers: true,
    canResetCustomerPasswords: false,
    canManageUsers: false,
    canManageSettings: false,
    canExportOrders: true,
    canExportFinancialReports: false,
  },
  staff: {
    canViewFinancials: false,
    canViewProductCosts: false,
    canViewOrders: true,
    canManageOrders: true,
    canRefundOrders: false,
    canManageCatalog: false,
    canEditPricing: false,
    canManageInventory: false,
    canManageCoupons: false,
    canManageContent: false,
    canManageCustomers: false,
    canResetCustomerPasswords: false,
    canManageUsers: false,
    canManageSettings: false,
    canExportOrders: true,
    canExportFinancialReports: false,
  },
  viewer: {
    canViewFinancials: false,
    canViewProductCosts: false,
    canViewOrders: true,
    canManageOrders: false,
    canRefundOrders: false,
    canManageCatalog: false,
    canEditPricing: false,
    canManageInventory: false,
    canManageCoupons: false,
    canManageContent: false,
    canManageCustomers: false,
    canResetCustomerPasswords: false,
    canManageUsers: false,
    canManageSettings: false,
    canExportOrders: false,
    canExportFinancialReports: false,
  },
};

/**
 * Map legacy role strings to canonical roles. Unknown → viewer (least privilege).
 * @param {string | null | undefined} role
 * @returns {CanonicalRole}
 */
export function normalizeRole(role) {
  const raw = String(role || "")
    .toLowerCase()
    .trim();
  if (ROLE_ALIASES[raw]) return ROLE_ALIASES[raw];
  if (CANONICAL_ROLES.includes(raw)) return /** @type {CanonicalRole} */ (raw);
  return "viewer";
}

export function capabilitiesForRole(role) {
  const canonical = normalizeRole(role);
  return { ...ROLE_CAPS[canonical] };
}

export function listCapabilities(role) {
  const caps = capabilitiesForRole(role);
  return CAPABILITIES.filter((c) => caps[c]);
}

/**
 * @param {{ role?: string } | null | undefined} user
 * @param {string} capability
 */
export function hasCapability(user, capability) {
  if (!user) return false;
  const caps = capabilitiesForRole(user.role);
  return Boolean(caps[capability]);
}

export function hasAnyCapability(user, capabilities) {
  return (capabilities || []).some((c) => hasCapability(user, c));
}

/** Roles accepted when creating/updating users (canonical only for new writes). */
export const ASSIGNABLE_ROLES = [...CANONICAL_ROLES];

/** Dashboard / orders aggregate keys that must not leave the server without canViewFinancials. */
export const FINANCIAL_DASHBOARD_KEYS = [
  "periodSales",
  "todaySales",
  "todayOrderValue",
  "todaySalesGrowth",
  "monthlyRevenue",
  "lastMonthRevenue",
  "monthlyGrowth",
  "totalRevenue",
  "totalSell",
  "totalSellOpen",
  "totalProfit",
  "totalCost",
  "profitMargin",
  "profitGrowth",
  "salesLast7Days",
  "salesTrend",
  "salesTrendTotal",
  "salesByCategory",
  "paymentMethods",
  "weekdayRevenueVsCost",
];

/**
 * Strip aggregate financial fields from a dashboard `data` object (mutates + returns).
 * Ops counts (orders, visitors, pending, low stock) remain.
 */
export function stripFinancialDashboardData(data) {
  if (!data || typeof data !== "object") return data;
  for (const key of FINANCIAL_DASHBOARD_KEYS) {
    delete data[key];
  }
  if (Array.isArray(data.insights)) {
    data.insights = data.insights.filter((row) => {
      const text = String(row?.text || "");
      return !/rs\.?\s|revenue|profit|margin|paid sales|strongest day/i.test(text);
    });
  }
  data.financialsHidden = true;
  return data;
}

/** Strip merchant cost from a product lean/JSON object. */
export function stripProductCostFields(product) {
  if (!product || typeof product !== "object") return product;
  if (product.pricing && typeof product.pricing === "object") {
    const { costPerItem, ...rest } = product.pricing;
    product.pricing = rest;
  }
  delete product.costPerItem;
  return product;
}
