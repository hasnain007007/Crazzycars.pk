/**
 * Temporary wordmark until the real logo file is added.
 * TODO: replace logo — drop the real Homefy.pk logo into /public (e.g. logo.svg)
 * and wire it through store settings / this component.
 */
export default function HomefyTextLogo({ compact = false, className = "" }) {
  if (compact) {
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white ${className}`}
        style={{ background: "var(--color-primary)" }}
        aria-label="Homefy.pk"
      >
        H
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-baseline font-semibold tracking-tight ${className}`}
      aria-label="Homefy.pk"
    >
      <span style={{ color: "var(--color-primary)" }}>Homefy</span>
      <span style={{ color: "var(--color-secondary)" }}>.pk</span>
    </span>
  );
}
