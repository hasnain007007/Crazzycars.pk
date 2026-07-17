import { normalizeAppearance } from "@/lib/normalizeStoreSettings";

function darken(hex, pct = 12) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return hex || "#A01818";
  const n = (x) => Math.max(0, Math.min(255, Math.round(parseInt(x, 16) * (1 - pct / 100))));
  return `#${n(h.slice(0, 2)).toString(16).padStart(2, "0")}${n(h.slice(2, 4)).toString(16).padStart(2, "0")}${n(h.slice(4, 6)).toString(16).padStart(2, "0")}`;
}

export default function ThemeInjector({ settings, appearance: appearanceProp, seo: seoProp }) {
  const appearance = normalizeAppearance(
    appearanceProp || settings?.appearance,
    seoProp || settings?.seo
  );
  const primary = appearance.primaryColor;
  const primaryDark = darken(primary, 12);
  const primaryLight = appearance.accentColor || primary;
  const radius = appearance.borderRadius || "8px";

  const css = `
:root {
  --color-primary: ${primary};
  --color-primary-dark: ${primaryDark};
  --color-primary-light: ${primaryLight};
  --color-secondary: ${appearance.secondaryColor};
  --color-accent: ${appearance.accentColor};
  --primary: ${primary};
  --primary-dark: ${primaryDark};
  --red: ${primary};
  --red-dark: ${primaryDark};
  --border-radius: ${radius};
}
`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
