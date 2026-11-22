import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const { DEFER_SCRIPT, injectDefer } = require("../storecraft-store/patch-html-css-defer.cjs");
const { DEFER_STYLESHEETS_SCRIPT } = await import("../storecraft-store/lib/criticalCss.js");

/** Tiny fake page: stylesheet links + window load, enough to run the defer script. */
function fakePage() {
  const links = [];
  const winListeners = {};
  let observerCb = null;
  const makeLink = (href) => {
    const ls = {};
    const l = {
      tagName: "LINK",
      nodeType: 1,
      rel: "stylesheet",
      href,
      media: "",
      sheet: null,
      dataset: {},
      getAttribute(k) {
        return k === "rel" ? this.rel : k === "media" ? this.media || null : null;
      },
      addEventListener(ev, fn) {
        (ls[ev] ||= []).push(fn);
      },
      fire(ev) {
        if (ev === "load") this.sheet = {};
        (ls[ev] || []).forEach((fn) => fn());
      },
    };
    return l;
  };
  const critical = { disabled: false };
  const document = {
    readyState: "loading",
    documentElement: {},
    getElementById: (id) => (id === "cc-critical" ? critical : null),
    querySelectorAll(sel) {
      if (sel.includes("data-cc-defer")) return links.filter((l) => l.dataset.ccDefer === "1");
      return links.filter((l) => l.rel === "stylesheet");
    },
  };
  const ctx = {
    document,
    MutationObserver: class {
      constructor(cb) {
        observerCb = cb;
      }
      observe() {}
      disconnect() {}
    },
    requestAnimationFrame: (fn) => fn(),
    addEventListener: (ev, fn) => (winListeners[ev] ||= []).push(fn),
  };
  return {
    ctx,
    critical,
    run(script) {
      vm.runInNewContext(script, ctx);
    },
    /** Parser inserts a <link rel=stylesheet> after the defer script ran. */
    addLink(href) {
      const l = makeLink(href);
      links.push(l);
      observerCb([{ addedNodes: [l] }]);
      return l;
    },
    windowLoad() {
      (winListeners.load || []).forEach((fn) => fn());
    },
  };
}

for (const [name, script] of [
  ["server-injected script", DEFER_SCRIPT],
  ["criticalCss copy", DEFER_STYLESHEETS_SCRIPT],
]) {
  test(`${name}: stylesheet applies as soon as it loads, without waiting for every photo`, () => {
    const page = fakePage();
    page.run(script);
    const main = page.addLink("/_next/static/chunks/main.css");
    assert.equal(main.media, "print", "deferred while downloading (not render-blocking)");

    main.fire("load");
    assert.equal(main.media, "all", "must apply on its own load — window load may be seconds away on slow phones");
  });

  test(`${name}: a failed stylesheet is not left stuck on print; window load still a fallback`, () => {
    const page = fakePage();
    page.run(script);
    const a = page.addLink("/a.css");
    const b = page.addLink("/b.css");
    a.fire("error");
    assert.equal(a.media, "all");
    assert.equal(b.media, "print");
    page.windowLoad();
    assert.equal(b.media, "all");
  });
}

for (const [name, script] of [
  ["server-injected script", DEFER_SCRIPT],
  ["criticalCss copy", DEFER_STYLESHEETS_SCRIPT],
]) {
  test(`${name}: critical CSS switches off only after EVERY deferred sheet loaded`, () => {
    // Left on, critical CSS overrode the real stylesheet (mega menu squashed to 72px).
    const page = fakePage();
    page.run(script);
    const a = page.addLink("/a.css");
    const b = page.addLink("/b.css");
    a.fire("load");
    assert.equal(page.critical.disabled, false, "b.css still loading — keep critical CSS");
    b.fire("load");
    assert.equal(page.critical.disabled, true);
  });

  test(`${name}: critical CSS stays on when a stylesheet fails`, () => {
    const page = fakePage();
    page.run(script);
    const a = page.addLink("/a.css");
    a.fire("error");
    page.windowLoad();
    assert.equal(page.critical.disabled, false, "no real CSS — critical CSS is the only styling left");
  });
}

test("both copies of the defer script stay identical", () => {
  assert.equal(DEFER_SCRIPT, DEFER_STYLESHEETS_SCRIPT);
});

test("injectDefer puts the script first in <head> exactly once", () => {
  const html = '<!DOCTYPE html><html><head><link rel="stylesheet" href="/x.css"/></head><body></body></html>';
  const once = injectDefer(html);
  assert.ok(once.startsWith('<!DOCTYPE html><html><head><script id="cc-css-defer">'));
  assert.equal(injectDefer(once).split('id="cc-css-defer"').length - 1, 1);
});
