/**
 * Unit tests for social sheet parser, photo match, buildCaption.
 * Run: node --test __tests__/social/*.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseWeekSheet } from "../../lib/social/sheetParser.js";
import { matchPhotosToPosts } from "../../lib/social/photoMatch.js";
import { buildCaption, normalizeHashtagList } from "../../lib/social/captions.js";

describe("normalizeHashtagList", () => {
  it("dedupes and adds #", () => {
    assert.deepEqual(normalizeHashtagList("foo #Bar foo"), ["#foo", "#Bar"]);
  });
});

describe("buildCaption", () => {
  const settings = {
    footerText: `📲 WhatsApp: 0328 4010007
🚚 Cash on Delivery all over Pakistan
🛒 Order: {productUrl}
🌐 crazzycars.pk | FB / IG / TikTok: @crazzycars.pk`,
    alwaysHashtag: "#crazzycarspk",
    hashtagLimits: { ig: 30, fb: 5, tiktok: 5 },
  };

  it("adds footer and trims FB hashtags", () => {
    const post = {
      caption: "Hello car parts",
      productUrl: "https://crazzycars.pk/p/test",
      addFooter: true,
      hashtagList: ["#a", "#b", "#c", "#d", "#e", "#f", "#g"],
    };
    const fb = buildCaption(post, "facebook", settings);
    assert.match(fb.message, /Hello car parts/);
    assert.match(fb.message, /0328 4010007/);
    assert.match(fb.message, /crazzycars\.pk\/p\/test/);
    assert.match(fb.message, /#crazzycarspk/);
    const tags = fb.hashtags.split(/\s+/);
    assert.equal(tags.length, 5);
  });

  it("skips WhatsApp line if already in caption", () => {
    const post = {
      caption: "Call 0328 4010007 now",
      addFooter: true,
      hashtagList: [],
    };
    const ig = buildCaption(post, "instagram", settings);
    const waLines = ig.message.split("\n").filter((l) => /0328/.test(l));
    assert.equal(waLines.length, 1);
  });

  it("omits footer when addFooter false", () => {
    const post = { caption: "Only body", addFooter: false, hashtagList: ["#x"] };
    const msg = buildCaption(post, "ig", settings).message;
    assert.equal(msg.includes("Cash on Delivery"), false);
  });
});

describe("photo matching", () => {
  it("matches CODE-n and folder rules", () => {
    const { byCode, unmatched } = matchPhotosToPosts(
      [
        { name: "MON-AM-1.jpg", tmpId: "a" },
        { name: "MON-AM_2.jpg", tmpId: "b" },
        { name: "MON-PM/photo.jpg", tmpId: "c" },
        { name: "orphan.jpg", tmpId: "d" },
      ],
      ["MON-AM", "MON-PM"]
    );
    assert.equal(byCode["MON-AM"].length, 2);
    assert.equal(byCode["MON-AM"][0].tmpId, "a");
    assert.equal(byCode["MON-PM"].length, 1);
    assert.equal(unmatched.length, 1);
  });
});

describe("sheet parser", () => {
  it("parses CSV with BOM, emojis, multi-line caption", () => {
    const csv = `\uFEFFpost_code,date,time,platforms,headline,caption,hashtags
MON-AM,2030-01-06,10:00,"fb, ig",Test 🚗,"Line1
Line2",tag1 #tag2`;
    const buf = Buffer.from(csv, "utf8");
    const { rows } = parseWeekSheet(buf, "week.csv");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].data.postCode, "MON-AM");
    assert.match(rows[0].data.caption, /Line1/);
    assert.match(rows[0].data.caption, /Line2/);
    assert.match(rows[0].data.headline, /🚗/);
    assert.ok(rows[0].data.hashtags.includes("#tag1"));
  });

  it("parses xlsx buffer", () => {
    const aoa = [
      ["post_code", "date", "time", "platforms", "headline", "caption"],
      ["TUE-PM", "2030-01-07", "18:00", "facebook,instagram", "Brake pads", "Fresh stock"],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Week");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const { rows } = parseWeekSheet(buf, "w.xlsx");
    assert.equal(rows[0].data.postCode, "TUE-PM");
    assert.deepEqual(rows[0].data.platforms, ["fb", "ig"]);
    assert.ok(rows[0].data.scheduledAt);
  });
});
