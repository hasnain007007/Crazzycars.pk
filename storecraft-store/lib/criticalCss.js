/**
 * Above-the-fold critical CSS inlined in <head> so LCP can paint before the
 * full (cacheable) stylesheet arrives. Keep in sync with app/globals.css
 * brand-hero / adv-band / header shell rules.
 *
 * Full CSS stays external: App Router never runs Critters, and experimental
 * inlineCss duplicates the entire sheet into the RSC payload (~2× HTML cost).
 */
export const CRITICAL_CSS = [
  /* Shell: prevent header/announcement CLS before full CSS */
  ".store-announcement-bar{min-height:36px}",
  ".cc-seo-nav{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}",
  ".store-header-desktop-nav,.store-header-desktop-actions{display:none!important}",
  "@media(min-width:768px){.store-header-desktop-nav{display:block!important}.store-header-desktop-actions{display:flex!important}}",
  /* Brand hero (homepage LCP) */
  ".brand-hero{position:relative;overflow:hidden;color:#fff;background:#050505}",
  ".brand-hero__inner{position:relative;max-width:1280px;margin:0 auto;min-height:480px;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:center;padding:36px 24px 0}",
  ".brand-hero__copy{position:relative;z-index:2;padding-bottom:64px}",
  ".brand-hero__kicker{margin:0 0 14px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#ef4444}",
  ".brand-hero__title{margin:0;font-family:var(--font-heading),Rajdhani,sans-serif;font-weight:700;font-size:clamp(44px,6vw,82px);line-height:.98;letter-spacing:-.01em;color:#fff}",
  ".brand-hero__title span{color:#e11d2a}",
  ".brand-hero__sub{margin:18px 0 0;max-width:34ch;font-size:17px;line-height:1.5;color:rgba(255,255,255,.78)}",
  ".brand-hero__offers{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-top:22px}",
  ".brand-hero__coupon{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border:1.5px dashed rgba(255,255,255,.55);border-radius:8px;font-size:14px;color:rgba(255,255,255,.9)}",
  ".brand-hero__coupon strong{color:#fff;font-size:16px}",
  ".brand-hero__offer-link{font-size:14px;color:rgba(255,255,255,.8);text-decoration:underline;text-underline-offset:3px}",
  ".brand-hero__actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}",
  ".brand-hero__btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:50px;padding:0 26px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none}",
  ".brand-hero__btn--primary{background:#c41e1e;color:#fff}",
  ".brand-hero__btn--ghost{border:1.5px solid rgba(255,255,255,.5);color:#fff}",
  ".brand-hero__visual{position:absolute;z-index:1;right:0;bottom:46px;width:min(62%,860px)}",
  ".brand-hero__car{display:block;width:100%;height:auto}",
  ".brand-hero__road{position:relative;z-index:2;height:46px;background:linear-gradient(#1b1b1b,#111);border-top:2px solid #2a2a2a;overflow:hidden}",
  ".brand-hero__lane{position:absolute;left:-80px;right:-80px;top:50%;height:4px;margin-top:-2px;background:repeating-linear-gradient(90deg,#e5b100 0 44px,transparent 44px 80px)}",
  "@media(max-width:767px){.brand-hero__inner{display:flex;flex-direction:column;align-items:stretch;text-align:left;min-height:0;padding:20px 16px 0}.brand-hero__copy{display:contents}.brand-hero__kicker{order:1;font-size:11px;margin-bottom:8px}.brand-hero__title{order:2;font-size:clamp(38px,11vw,48px)}.brand-hero__visual{order:3;position:relative;right:auto;bottom:auto;width:auto;margin:0 -16px 10px}.brand-hero__offers{order:4;margin-top:0;gap:8px 12px}.brand-hero__coupon{font-size:12.5px;padding:6px 10px}.brand-hero__coupon strong{font-size:14px}.brand-hero__offer-link{font-size:12.5px}.brand-hero__actions{order:5;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0 18px}.brand-hero__btn{min-height:46px;padding:0 10px;font-size:14px}.brand-hero__sub{display:none}.brand-hero__road{height:30px}}",
  /* Advance band shell (reserved height via layout Suspense; paint color early) */
  ".adv-band{width:100%;color:#fff;background:linear-gradient(90deg,#8c0e13 0%,#c41e1e 50%,#8c0e13 100%)}",
  /* PDP gallery: hold aspect before full CSS (common LCP container) */
  "[data-pdp-gallery],[data-product-gallery]{aspect-ratio:1/1;max-width:100%}",
].join("");

/**
 * Sync head script: flip Next's render-blocking stylesheets to media=print
 * until load, so critical inline CSS can paint LCP without waiting on ~180KB.
 * Safe after the <link> tags — stylesheets block rendering, not parsing.
 */
export const DEFER_STYLESHEETS_SCRIPT = `(function(){function d(l){if(!l||l.tagName!=="LINK"||l.rel!=="stylesheet"||l.dataset.ccDefer==="1")return;var m=l.getAttribute("media");if(m&&m!=="all")return;l.dataset.ccDefer="1";l.media="print";var f=function(){l.media="all";l.onload=null};if(l.sheet){f();return}l.onload=f}function s(r){var n=(r||document).querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<n.length;i++)d(n[i])}s(document);var o=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var ns=ms[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(n.tagName==="LINK")d(n);else if(n.querySelectorAll)s(n)}}});o.observe(document.documentElement,{childList:true,subtree:true});addEventListener("load",function(){o.disconnect();s(document)})})();`;
