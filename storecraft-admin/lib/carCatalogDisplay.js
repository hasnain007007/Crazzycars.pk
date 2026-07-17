/** UI helpers for car catalog entries (admin). */

export function formatModelOptionLabel(entry) {
  if (!entry) return "";
  const nick = String(entry.nickname || "").trim();
  const name = String(entry.name || entry.model || "").trim();
  const yf = entry.yearFrom;
  const yt = entry.yearTo;
  const years =
    yf != null && yt != null ? ` (${yf}–${yt})` : yf != null ? ` (${yf}+)` : "";
  if (nick) return `${nick}${years}`;
  return `${name}${years}`;
}

export function formatModelCardSubtitle(entry) {
  const nick = String(entry.nickname || "").trim();
  const gen = String(entry.generation || "").trim();
  if (nick && gen) return `${nick} • ${gen}`;
  if (nick) return nick;
  if (gen) return gen;
  return "";
}
