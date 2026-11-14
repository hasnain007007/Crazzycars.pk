import { test } from "node:test";
import assert from "node:assert/strict";

const { visitSource, isBotUserAgent } = await import("../storecraft-store/lib/visitSource.js");
const { pageLabel, slugsFromPaths, placeLabel, countByPlace } = await import(
  "../storecraft-admin/lib/livePresence.js"
);

test("visit source from referrer and ad click ids", () => {
  const own = "crazzycars.pk";
  assert.equal(visitSource({ search: "?fbclid=abc", ownHost: own }).source, "Facebook / Instagram");
  assert.equal(visitSource({ search: "?utm_source=facebook&utm_medium=paid", ownHost: own }).source, "Facebook ad");
  assert.equal(visitSource({ search: "?utm_source=ig", ownHost: own }).source, "Instagram");
  assert.equal(visitSource({ search: "?gclid=x", ownHost: own }).source, "Google ad");
  assert.equal(visitSource({ referrer: "https://www.google.com.pk/", ownHost: own }).source, "Google search");
  assert.equal(visitSource({ referrer: "https://l.facebook.com/l.php?u=x", ownHost: own }).source, "Facebook");
  assert.equal(visitSource({ referrer: "https://crazzycars.pk/shop", ownHost: own }).source, "Direct");
  assert.equal(visitSource({ referrer: "https://pakwheels.com/forums/x", ownHost: own }).source, "pakwheels.com");
  assert.equal(visitSource({}).source, "Direct");
  // Live site: middleware strips fbclid/utm before the page loads, leaving the cc_paid cookie.
  assert.equal(visitSource({ paidCookie: "meta", ownHost: own }).source, "Facebook / Instagram");
  assert.equal(visitSource({ paidCookie: "google", referrer: "https://www.google.com/" }).source, "Google ad");
});

test("bots are skipped, phones are not", () => {
  assert.ok(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"));
  assert.ok(isBotUserAgent("Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) Chrome/120 Mobile Safari/537.36 (compatible; Googlebot/2.1)"));
  assert.ok(isBotUserAgent("Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0 Safari/537.36"));
  assert.ok(isBotUserAgent("facebookexternalhit/1.1"));
  assert.ok(!isBotUserAgent("Mozilla/5.0 (Linux; Android 10; CUBOT X30) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36"));
  assert.ok(!isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"));
  assert.ok(!isBotUserAgent("Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0]"));
});

test("page labels name products, categories and fixed pages", () => {
  const names = { products: { "civic-x-floor-mats": "Civic X Floor Mats" }, categories: { "seat-covers": "Seat Covers" } };
  assert.equal(pageLabel("/", names).label, "Home page");
  assert.equal(pageLabel("/civic-x-floor-mats", names).label, "Civic X Floor Mats");
  assert.equal(pageLabel("/civic-x-floor-mats", names).kind, "product");
  assert.equal(pageLabel("/products/civic-x-floor-mats", names).label, "Civic X Floor Mats");
  assert.equal(pageLabel("/collections/seat-covers", names).label, "Category: Seat Covers");
  assert.equal(pageLabel("/checkout", names).kind, "checkout");
  assert.equal(pageLabel("/checkout/success", names).label, "Order placed (thank-you page)");
  assert.equal(pageLabel("/cars/honda/civic", names).label, "Car: honda civic");
  assert.equal(pageLabel("/unknown-thing", names).label, "/unknown-thing");
  assert.deepEqual(slugsFromPaths(["/", "/a", "/products/b", "/collections/c", "/cars/x/y", "/shop"]), {
    products: ["a", "b"],
    categories: ["c"],
  });
});

test("place labels and city counts", () => {
  assert.equal(placeLabel({ city: "Lahore", region: "Punjab", countryCode: "PK", country: "Pakistan" }), "Lahore, Punjab");
  assert.equal(placeLabel({ city: "Dubai", region: "Dubai", countryCode: "AE", country: "United Arab Emirates" }), "Dubai, United Arab Emirates");
  assert.equal(placeLabel({ countryCode: "PK", country: "Pakistan" }), "Pakistan");
  assert.equal(placeLabel({}), "");
  assert.deepEqual(countByPlace([{ city: "Lahore" }, { city: "Karachi" }, { city: "Lahore" }, {}]), [
    { place: "Lahore", count: 2 },
    { place: "Karachi", count: 1 },
    { place: "Unknown", count: 1 },
  ]);
});

test("network names", async () => {
  const { networkLabel } = await import("../storecraft-admin/lib/livePresence.js");
  assert.equal(networkLabel("PMCL /LDI IP TRANSIT"), "Jazz");
  assert.equal(networkLabel("Pakistan Telecommunication Company Limited"), "PTCL");
  assert.equal(networkLabel("CMPak Limited"), "Zong");
  assert.equal(networkLabel("Some Broadband Pvt Ltd"), "Some Broadband");
  assert.equal(networkLabel(""), "");
});
