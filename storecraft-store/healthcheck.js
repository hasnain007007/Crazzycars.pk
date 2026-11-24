/**
 * Coolify/Docker probe. Node 20 has fetch; no curl/wget in the slim image.
 *
 * Checks:
 *  1) /api/health (Mongo + catalog pulse)
 *  2) Local home HTML includes CSS-defer inject (patch-html-css-defer.cjs) + critical CSS
 *  3) When HEALTHCHECK_EDGE_URL or NEXT_PUBLIC_SITE_URL is set, public home must
 *     respond with Content-Encoding gzip|br (Traefik crazzycars-compress). Skip with
 *     HEALTHCHECK_SKIP_ENCODING=1 for offline/dev.
 */
const port = process.env.PORT || "3000";
const apiUrl = `http://127.0.0.1:${port}/api/health`;
const homeUrl = `http://127.0.0.1:${port}/`;

function edgeBase() {
  const raw =
    process.env.HEALTHCHECK_EDGE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "";
  return String(raw).trim().replace(/\/+$/, "");
}

async function fetchText(url, headers = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: { "User-Agent": "crazzycars-healthcheck", ...headers },
      redirect: "manual",
    });
    const text = await res.text();
    return { res, text };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  // 1) API health
  {
    const { res, text } = await fetchText(apiUrl);
    console.log(text);
    if (!res.ok) {
      console.error("FAIL api/health status", res.status);
      process.exit(1);
    }
  }

  // 2) Local HTML must include CSS defer + critical style (patch applied)
  {
    const { res, text } = await fetchText(homeUrl, { Accept: "text/html" });
    if (!res.ok) {
      console.error("FAIL local home status", res.status);
      process.exit(1);
    }
    if (!text.includes('id="cc-css-defer"') && !text.includes("id='cc-css-defer'")) {
      console.error("FAIL home HTML missing cc-css-defer (patch-html-css-defer.cjs not injecting)");
      process.exit(1);
    }
    if (!text.includes('id="cc-critical"') && !text.includes("id='cc-critical'")) {
      console.error("FAIL home HTML missing cc-critical inline CSS");
      process.exit(1);
    }
    console.log("OK css-defer+critical present in local home HTML");
  }

  // 3) Edge Content-Encoding (Traefik gzip/br) — optional but on for production
  if (process.env.HEALTHCHECK_SKIP_ENCODING === "1") {
    console.log("SKIP edge Content-Encoding check (HEALTHCHECK_SKIP_ENCODING=1)");
    process.exit(0);
  }
  const edge = edgeBase();
  const requireEncoding = process.env.HEALTHCHECK_REQUIRE_ENCODING !== "0";
  if (!edge) {
    if (requireEncoding) {
      console.error(
        "FAIL HEALTHCHECK_EDGE_URL or NEXT_PUBLIC_SITE_URL required for Content-Encoding check (or set HEALTHCHECK_SKIP_ENCODING=1)"
      );
      process.exit(1);
    }
    console.log("SKIP edge Content-Encoding (no site URL env)");
    process.exit(0);
  }
  {
    let finalRes;
    try {
      const first = await fetchText(
        `${edge}/`,
        { Accept: "text/html", "Accept-Encoding": "gzip, deflate, br" },
        12000
      );
      finalRes = first.res;
      const loc = first.res.headers.get("location");
      if ([301, 302, 307, 308].includes(first.res.status) && loc) {
        const nextUrl = loc.startsWith("http") ? loc : `${edge}${loc}`;
        finalRes = (
          await fetchText(
            nextUrl,
            { Accept: "text/html", "Accept-Encoding": "gzip, deflate, br" },
            12000
          )
        ).res;
      }
    } catch (err) {
      console.error("FAIL edge home fetch", String(err && err.message ? err.message : err));
      process.exit(1);
    }
    if (!finalRes.ok) {
      console.error("FAIL edge home status", finalRes.status, edge);
      process.exit(1);
    }
    const ce = String(finalRes.headers.get("content-encoding") || "").toLowerCase();
    if (!ce.includes("gzip") && !ce.includes("br") && !ce.includes("deflate")) {
      console.error(
        "FAIL edge home missing Content-Encoding (expected gzip|br). Traefik crazzycars-compress may be off. Got:",
        ce || "(none)"
      );
      process.exit(1);
    }
    console.log("OK edge Content-Encoding", ce);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
