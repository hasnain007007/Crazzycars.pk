/**
 * Coolify/Docker probe. Node 20 has fetch; no curl/wget in the slim image.
 * Prints the /api/health body so deploy logs show a real response.
 */
const port = process.env.PORT || "3000";
const url = `http://127.0.0.1:${port}/api/health`;

async function main() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    const text = await res.text();
    console.log(text);
    if (!res.ok) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error(String(err && err.message ? err.message : err));
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }
}

main();
