/**
 * Above-the-fold critical CSS inlined in <head> so LCP can paint before the
 * full (cacheable) stylesheet arrives. Must be enough that, with stylesheets
 * deferred (media=print), the homepage hero IMAGE stays inside the mobile
 * viewport — otherwise PSI reports ~2s element-render delay after the image
 * has already downloaded (adv-band stacked to ~540px without these rules).
 *
 * Keep in sync with app/globals.css brand-hero / adv-band / header shells.
 */
export const CRITICAL_CSS = [
  /* Preflight scraps used above the fold (Tailwind not loaded yet while deferred) */
  "*,*:before,*:after{box-sizing:border-box}",
  "body{margin:0}",
  "img{max-width:100%;height:auto}",
  "a{color:inherit}",
  /* Announcement + header shell (compact mobile) */
  ".store-announcement-bar{min-height:36px;max-height:40px;overflow:hidden}",
  ".store-container{width:100%;max-width:1280px;margin:0 auto;padding:0 16px}",
  ".store-site-header .store-container{display:grid;height:56px;grid-template-columns:72px 1fr 72px;align-items:center}",
  ".cc-seo-nav{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}",
  ".store-header-desktop-nav,.store-header-desktop-actions{display:none!important}",
  "@media(min-width:768px){.store-header-desktop-nav{display:block!important}.store-header-desktop-actions{display:flex!important}.store-site-header .store-container{display:flex;height:72px}}",
  /* Advance band — WITHOUT flex/grid this stacks to ~540px and pushes hero LCP below the fold */
  /* contain:layout — hydration/font tweaks inside the band must not shift the gallery (CLS) */
  ".adv-band{width:100%;align-self:stretch;position:relative;overflow:hidden;color:#fff;background:linear-gradient(90deg,#8c0e13 0%,#c41e1e 50%,#8c0e13 100%);contain:layout style;min-height:48px}",
  ".adv-band__inner{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:10px 24px;display:flex;align-items:center;gap:18px}",
  ".adv-band__icon{flex:0 0 auto;display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);color:#fff}",
  ".adv-band__icon svg{width:22px;height:22px}",
  ".adv-band__text{flex:1 1 auto;min-width:0}",
  ".adv-band .adv-band__title{margin:0;color:#fff;font-size:16px;font-weight:800;letter-spacing:.01em;line-height:1.2}",
  ".adv-band .adv-band__sub{margin:2px 0 0;font-size:13px;line-height:1.35;color:rgba(255,255,255,.86)}",
  ".adv-band__tiers{flex:0 0 auto;display:flex;align-items:stretch;background:#fff;border-radius:10px;overflow:hidden}",
  ".adv-band__tier{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px 18px;line-height:1.15}",
  ".adv-band__tier+.adv-band__tier{border-left:1px solid #ececec}",
  ".adv-band__tier strong{font-size:17px;font-weight:800;color:#b0151a;white-space:nowrap}",
  ".adv-band__tier small{font-size:11px;font-weight:600;color:#4b5563;white-space:nowrap}",
  ".adv-band__cta{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;min-height:42px;padding:0 18px;border-radius:10px;background:#111;color:#fff;font-size:14px;font-weight:700;text-decoration:none}",
  "@media(max-width:1100px){.adv-band__inner{padding:10px 16px;gap:12px}.adv-band .adv-band__sub{display:none}.adv-band__tier{padding:6px 12px}}",
  "@media(max-width:767px){.adv-band__inner{display:grid;grid-template-columns:auto 1fr auto;grid-template-areas:\"icon title cta\" \"tiers tiers tiers\";gap:6px 10px;padding:6px 12px 8px}.adv-band__icon{grid-area:icon;width:30px;height:30px;border-radius:8px}.adv-band__icon svg{width:17px;height:17px}.adv-band__text{grid-area:title}.adv-band .adv-band__title{font-size:14.5px}.adv-band__tiers{grid-area:tiers;border-radius:8px}.adv-band__tier{flex:1 1 0;padding:4px}.adv-band__tier strong{font-size:14.5px}.adv-band__tier small{font-size:10.5px}.adv-band__cta{grid-area:cta;padding:0 14px;border-radius:999px;background:#fff;color:#b0151a;font-size:12.5px;min-height:34px}}",
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
  /* Mobile: car early in flex order so LCP image is in the first viewport */
  "@media(max-width:767px){.brand-hero__inner{display:flex;flex-direction:column;align-items:stretch;text-align:left;min-height:0;padding:16px 16px 0}.brand-hero__copy{display:contents}.brand-hero__visual{order:1;position:relative;right:auto;bottom:auto;width:auto;margin:0 -16px 8px}.brand-hero__kicker{order:2;font-size:11px;margin:0 0 6px}.brand-hero__title{order:3;font-size:clamp(36px,10vw,46px)}.brand-hero__offers{order:4;margin-top:0;gap:8px 12px}.brand-hero__coupon{font-size:12.5px;padding:6px 10px}.brand-hero__coupon strong{font-size:14px}.brand-hero__offer-link{font-size:12.5px}.brand-hero__actions{order:5;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0 16px}.brand-hero__btn{min-height:46px;padding:0 10px;font-size:14px}.brand-hero__sub{display:none}.brand-hero__seo-h1{order:0;margin:0 0 8px!important}.brand-hero__road{height:30px}}",
  /* PDP gallery — keep LCP in first viewport; sizes must match final CSS to avoid CLS */
  "[data-pdp-crumb]{min-height:40px;padding:12px 16px;font-size:14px;line-height:1.25;background:#f8f8f8;border-bottom:1px solid #e5e5e5;box-sizing:border-box}",
  ".product-detail-grid{display:block;width:100%;max-width:1280px;margin:0 auto}",
  /* Match Tailwind -mx-4 w-[calc(100%+2rem)] so full CSS does not widen the gallery (CLS) */
  ".product-images-col{width:100%;max-width:100%;min-width:0;box-sizing:border-box}",
  "@media(max-width:767px){.product-images-col{width:calc(100% + 2rem);max-width:none;margin-left:-1rem;margin-right:-1rem}}",
  "[data-pdp-gallery],.product-main-viewer{aspect-ratio:1/1;width:100%;max-width:100%;min-height:0;overflow:hidden;background:#f8f8f8;contain:layout style}",
  ".product-main-viewer img{width:100%;height:100%;max-width:none;object-fit:contain;object-position:center;display:block;background:#fff}",
  /* Reserve thumb rail height (final layout) so full CSS does not push price/badges */
  ".product-thumbs-rail{display:flex;gap:8px;padding:8px 16px 4px;min-height:72px;box-sizing:border-box;overflow-x:auto}",
  ".product-thumb-btn{width:56px;height:56px;flex:0 0 auto;border:2px solid #e5e5e5;border-radius:4px;padding:0;background:#f8f8f8;overflow:hidden}",
  /* Price row reserve — avoids font/badge CLS when full CSS arrives */
  ".pdp-price{font-size:26px;font-weight:700;line-height:1.2;min-height:1.2em}",
  ".pdp-price-was{font-size:18px;font-weight:700;line-height:1.2}",
  "@media(min-width:768px){.product-images-col{width:100%;margin-left:0;margin-right:0}.product-detail-grid{padding-top:2rem}}",
  "@media(min-width:1024px){.product-detail-grid{display:grid;grid-template-columns:minmax(280px,560px) minmax(0,1fr);gap:24px;padding:24px 16px 0;align-items:start}.product-images-col{max-width:560px}.product-main-viewer{max-width:560px}}",
].join("");

/**
 * MUST run before any <link rel=stylesheet> in the HTML.
 * Classic scripts after stylesheets wait for those sheets — so a late defer
 * script never unblocks first paint (PSI "Render-blocking requests" ~770ms).
 * Place as the first child of <html> (before <head>).
 *
 * Flip sheets to media=print immediately; apply media=all only after first paint
 * (do NOT apply early when l.sheet is already set — that re-blocks LCP).
 */
export const DEFER_STYLESHEETS_SCRIPT = `(function(){function d(l){if(!l||l.tagName!=="LINK")return;var rel=l.rel||l.getAttribute("rel")||"";if(rel.indexOf("stylesheet")===-1||l.dataset.ccDefer==="1")return;var m=l.getAttribute("media");if(m&&m!=="all"&&m!=="screen")return;l.dataset.ccDefer="1";l.media="print";var on=function(){l.media="all";};l.addEventListener("load",on);l.addEventListener("error",on);if(l.sheet)on();}function s(r){var n=(r||document).querySelectorAll('link[rel="stylesheet"]');for(var i=0;i<n.length;i++)d(n[i]);}function apply(){var n=document.querySelectorAll('link[data-cc-defer="1"]');for(var i=0;i<n.length;i++){var l=n[i];if((l.rel||"").indexOf("stylesheet")!==-1)l.media="all";}}s(document);var o=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var ns=ms[i].addedNodes;for(var j=0;j<ns.length;j++){var n=ns[j];if(!n||n.nodeType!==1)continue;if(n.tagName==="LINK")d(n);else if(n.querySelectorAll)s(n);}}});try{o.observe(document.documentElement,{childList:true,subtree:true});}catch(e){}function afterPaint(){requestAnimationFrame(function(){requestAnimationFrame(function(){o.disconnect();apply();});});}if(document.readyState==="complete")afterPaint();else addEventListener("load",afterPaint);})();`;
