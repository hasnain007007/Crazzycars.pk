/**
 * Plain-text length / preview helpers for stored HTML strings.
 */
export function richTextPlainLength(html) {
  if (typeof html !== "string" || !html.trim()) return 0;
  if (typeof document === "undefined") {
    return html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim().length;
  }
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || "").length;
}

export function richTextPlainPreview(html, max = 160) {
  if (typeof html !== "string" || !html.trim()) return "";
  let text = "";
  if (typeof document === "undefined") {
    text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  } else {
    const d = document.createElement("div");
    d.innerHTML = html;
    text = (d.textContent || "").replace(/\s+/g, " ").trim();
  }
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}
