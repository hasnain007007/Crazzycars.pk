import { normalizeProductBadgeUi } from "@/lib/normalizeStoreSettings";

export function mapProductBadgeSettings(productBadges) {
  const ui = normalizeProductBadgeUi(productBadges);
  const { raw, ...config } = ui;
  return config;
}
