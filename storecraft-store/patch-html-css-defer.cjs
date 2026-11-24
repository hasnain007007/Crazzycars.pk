/**
 * NODE_OPTIONS='--require ./patch-html-css-defer.cjs' node server.js
 *
 * Next App Router hoists <link rel=stylesheet> before any layout <script>, so a
 * classic defer script in React never runs until those sheets load — PSI then
 * reports ~770ms render-blocking CSS. This patch rewrites text/html responses
 * to put the defer snippet immediately after <head>.
 *
 * Each deferred sheet switches back to media=all as soon as THAT sheet has
 * loaded (its own load/error event). Waiting for window "load" instead left
 * phones on slow signal looking unstyled (grey buttons, serif text, squashed
 * prices) until every product photo had downloaded. Window load stays only as
 * a fallback.
 *
 * Once EVERY deferred sheet has loaded, the inline critical CSS (<style id="cc-critical">)
 * is disabled. It exists only for first paint; left on, its approximations override
 * the real stylesheet (it squashed the Shop-by-category mega menu to 72px and made the
 * header 28px taller). If a sheet fails to load, critical CSS stays as the fallback.
 *
 * Deploy guard: healthcheck.js fails the container if local home HTML lacks
 * id="cc-css-defer" / id="cc-critical", and (via NEXT_PUBLIC_SITE_URL) if the
 * Traefik edge response has no Content-Encoding gzip|br.
 */
"use strict";

const http = require("http");

const DEFER_SCRIPT = `(function(){function d(l){if(!l||l.tagName!=="LINK")return;var rel=l.rel||l.getAttribute("rel")||"";if(rel.indexOf("stylesheet")===-1||l.dataset.ccDefer==="1")return;var m=l.getAttribute("media");if(m&&m!=="all"&&m!=="screen")return;l.dataset.ccDefer="1";l.media="print";var on=function(){l.media="all";c();};l.addEventListener("load",on);l.addEventListener("error",on);if(l.sheet)on();}function c(){var n=document.querySelectorAll('link[data-cc-defer="1"]');for(var i=0;i<n.length;i++){if(!n[i].sheet||n[i].media!=="all")return;}var k=document.getElementById("cc-critical");if(k)k.disabled=true;}function s(r){var n=(r||document).querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<n.length;i++)d(n[i]);}function apply(){var n=document.querySelectorAll('link[data-cc-defer="1"]');for(var i=0;i<n.length;i++){var l=n[i];if((l.rel||"").indexOf("stylesheet")!==-1)l.media="all";}c();}s(document);var o=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var ns=ms[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(!n||n.nodeType!==1)continue;if(n.tagName==="LINK")d(n);else if(n.querySelectorAll)s(n);}}});try{o.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}function afterPaint(){requestAnimationFrame(function(){requestAnimationFrame(function(){o.disconnect();apply();});});}if(document.readyState==="complete")afterPaint();else addEventListener("load",afterPaint);})();`;

const INJECT = `<script id="cc-css-defer">${DEFER_SCRIPT}</script>`;

/** Strip prior inject / layout copies so we only keep the early one. */
function stripOldDefer(html) {
  return html
    .replace(/<script id="cc-css-defer">[\s\S]*?<\/script>/g, "")
    .replace(
      /<script>\(function\(\)\{function d\(l\)\{if\(!l\|\|l\.tagName!=="LINK"[\s\S]*?<\/script>/g,
      ""
    );
}

function injectDefer(html) {
  const cleaned = stripOldDefer(html);
  if (cleaned.includes('id="cc-css-defer"')) return cleaned;
  if (/<head[\s>]/i.test(cleaned)) {
    return cleaned.replace(/<head([^>]*)>/i, `<head$1>${INJECT}`);
  }
  return cleaned;
}

function patchResponse(res) {
  if (res.__ccCssDeferPatched) return;
  res.__ccCssDeferPatched = true;

  const chunks = [];
  let ended = false;
  const origWrite = res.write;
  const origEnd = res.end;

  res.write = function (chunk, encoding, cb) {
    if (ended) return true;
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || "utf8"));
    if (typeof encoding === "function") encoding();
    else if (typeof cb === "function") cb();
    return true;
  };

  res.end = function (chunk, encoding, cb) {
    if (ended) return res;
    ended = true;
    if (typeof chunk === "function") {
      cb = chunk;
      chunk = null;
    } else if (typeof encoding === "function") {
      cb = encoding;
      encoding = "utf8";
    }
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding || "utf8"));

    const ct = String(res.getHeader("content-type") || "");
    const ce = String(res.getHeader("content-encoding") || "");
    // Plain HTML only (Next compress:false). Traefik `crazzycars-compress` gzips to clients.
    if (ct.includes("text/html") && !ce) {
      try {
        const html = Buffer.concat(chunks).toString("utf8");
        const out = Buffer.from(injectDefer(html), "utf8");
        if (!res.headersSent) {
          res.setHeader("content-length", out.length);
          res.removeHeader("etag"); // length changed
        }
        return origEnd.call(res, out, () => {
          if (typeof cb === "function") cb();
        });
      } catch {
        // fall through to raw
      }
    }

    for (let i = 0; i < chunks.length; i++) {
      origWrite.call(res, chunks[i]);
    }
    return origEnd.call(res, () => {
      if (typeof cb === "function") cb();
    });
  };
}

const origEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event === "request" && args[1]) {
    patchResponse(args[1]);
  }
  return origEmit.call(this, event, ...args);
};

module.exports = { DEFER_SCRIPT, injectDefer };
