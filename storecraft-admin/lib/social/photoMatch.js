/**
 * Match uploaded photos to sheet post_code rows.
 * Rules:
 * 1. <post_code>-<n>.ext or <post_code>_<n>.ext
 * 2. folder <post_code>/anything.jpg (natural sort)
 * 3. else unmatched
 */

function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * @param {Array<{ name: string, tmpId: string, relPath?: string }>} files
 * @param {string[]} postCodes — uppercase
 */
export function matchPhotosToPosts(files, postCodes) {
  const codeSet = new Set(postCodes.map((c) => String(c).toUpperCase()));
  const byCode = Object.fromEntries([...codeSet].map((c) => [c, []]));
  const unmatched = [];

  for (const file of files) {
    const name = String(file.name || "").replace(/\\/g, "/");
    const base = name.split("/").pop() || name;
    const lower = base.toLowerCase();
    const stem = lower.replace(/\.[^.]+$/, "");

    let matched = false;

    // Rule 1: CODE-n or CODE_n
    for (const code of codeSet) {
      const re = new RegExp(`^${escapeRe(code.toLowerCase())}[-_](\\d+)$`, "i");
      const m = stem.match(re);
      if (m) {
        byCode[code].push({
          ...file,
          order: Number(m[1]) || 0,
          match: "filename",
        });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Rule 2: folder CODE/...
    const parts = name.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const folder = parts[parts.length - 2].toUpperCase();
      if (codeSet.has(folder)) {
        byCode[folder].push({
          ...file,
          order: 0,
          match: "folder",
          sortKey: base,
        });
        matched = true;
      }
    }
    if (matched) continue;

    unmatched.push(file);
  }

  // Sort each bucket
  for (const code of Object.keys(byCode)) {
    const list = byCode[code];
    list.sort((a, b) => {
      if (a.match === "filename" && b.match === "filename") return a.order - b.order;
      if (a.match === "folder" || b.match === "folder") {
        return naturalCompare(a.sortKey || a.name, b.sortKey || b.name);
      }
      return a.order - b.order;
    });
    list.forEach((img, i) => {
      img.order = i + 1;
    });
  }

  return { byCode, unmatched };
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
