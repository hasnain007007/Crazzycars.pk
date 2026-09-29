import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
import { hasCapability } from "@/lib/permissions";
import AiAgentVisit from "@/lib/models/AiAgentVisit.model";
import Order from "@/lib/models/Order.model";

const SOURCE_LABELS = {
  chatgpt: "ChatGPT",
  copilot: "Copilot",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  meta: "Meta AI",
  deepseek: "DeepSeek",
  you: "You.com",
  google_extended: "Google Extended",
  bing: "Bingbot",
  apple: "Applebot",
  amazon: "Amazonbot",
  bytespider: "Bytespider",
  other_ai: "Other AI",
};

/** Sources that are crawler-UA-only (no human chat-UI referrer path). */
const CRAWLER_ONLY_SOURCES = new Set([
  "google_extended",
  "bing",
  "apple",
  "amazon",
  "bytespider",
  "other_ai",
]);

function isShopperDetection(detection) {
  return detection === "referrer" || detection === "utm";
}

const MAX_RANGE_DAYS = 366;
const EXCLUDED_ORDER_STATUSES = ["cancelled", "refunded"];

function parseDays(raw) {
  const n = Number(raw);
  if (n === 7 || n === 30) return n;
  return null;
}

/** YYYY-MM-DD → UTC Date, or null */
function parseYmd(s) {
  const m = String(s || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo || dt.getUTCDate() !== d) return null;
  return dt;
}

function utcStartOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function utcEndOfDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function ymdUtc(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resolve query → { from, to, days, mode, label }
 * Prefer explicit from/to when both valid; else days=7|30; else default 30.
 */
function resolveRange(searchParams) {
  const now = new Date();
  const todayEnd = utcEndOfDay(now);

  const fromRaw = searchParams.get("from");
  const toRaw = searchParams.get("to");
  const fromParsed = parseYmd(fromRaw);
  const toParsed = parseYmd(toRaw);

  if (fromParsed && toParsed) {
    let from = utcStartOfDay(fromParsed);
    let to = utcEndOfDay(toParsed);
    if (from > to) {
      from = utcStartOfDay(toParsed);
      to = utcEndOfDay(fromParsed);
    }
    const spanMs = to.getTime() - from.getTime();
    const spanDays = Math.floor(spanMs / 86_400_000) + 1;
    if (spanDays > MAX_RANGE_DAYS) {
      return { error: `Date range cannot exceed ${MAX_RANGE_DAYS} days.` };
    }
    return {
      from,
      to,
      days: spanDays,
      mode: "custom",
      label: `${ymdUtc(from)} → ${ymdUtc(to)}`,
    };
  }

  const days = parseDays(searchParams.get("days") || searchParams.get("range")) || 30;
  const from = new Date(utcStartOfDay(now));
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return {
    from,
    to: todayEnd,
    days,
    mode: "preset",
    label: `Last ${days} days`,
  };
}

export async function GET(request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const showFinancials = hasCapability(user, "canViewFinancials");

    const { searchParams } = new URL(request.url);
    const range = resolveRange(searchParams);
    if (range.error) {
      return NextResponse.json({ success: false, error: range.error }, { status: 400 });
    }

    const { from, to, days, mode, label } = range;

    await dbConnect();

    const visitMatch = { createdAt: { $gte: from, $lte: to } };
    const orderMatch = {
      createdAt: { $gte: from, $lte: to },
      aiAttributedSource: { $exists: true, $nin: [null, ""] },
      orderStatus: { $nin: EXCLUDED_ORDER_STATUSES },
    };

    const [byDetectionSourceRows, recentQueries, attributedOrderRows, attributedOrderDocs] =
      await Promise.all([
      AiAgentVisit.aggregate([
        { $match: visitMatch },
        {
          $group: {
            _id: { source: "$source", detection: "$detection" },
            count: { $sum: 1 },
          },
        },
      ]),
      AiAgentVisit.find({
        ...visitMatch,
        referrerQuery: { $exists: true, $nin: [null, ""] },
      })
        .select("referrerQuery source path createdAt detection")
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      Order.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: "$aiAttributedSource",
            orders: { $sum: 1 },
            revenue: { $sum: { $ifNull: ["$pricing.total", 0] } },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      Order.find(orderMatch)
        .select(
          "_id orderNumber aiAttributedSource aiAttributedAt pricing.total orderStatus paymentStatus customer.name customer.phone createdAt"
        )
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const ordersBySource = new Map(
      attributedOrderRows.map((row) => [
        row._id,
        {
          orders: row.orders || 0,
          revenue: Math.round((Number(row.revenue) || 0) * 100) / 100,
        },
      ])
    );

    let attributedOrders = 0;
    let attributedRevenue = 0;
    for (const row of ordersBySource.values()) {
      attributedOrders += row.orders;
      attributedRevenue += row.revenue;
    }
    attributedRevenue = Math.round(attributedRevenue * 100) / 100;

    /** @type {Map<string, { crawler: number, shopper: number }>} */
    const visitsBySource = new Map();
    let crawlerVisits = 0;
    let shopperVisits = 0;
    for (const row of byDetectionSourceRows) {
      const source = row._id?.source;
      const detection = row._id?.detection || "";
      if (!source) continue;
      const n = row.count || 0;
      const bucket = visitsBySource.get(source) || { crawler: 0, shopper: 0 };
      if (isShopperDetection(detection)) {
        bucket.shopper += n;
        shopperVisits += n;
      } else {
        bucket.crawler += n;
        crawlerVisits += n;
      }
      visitsBySource.set(source, bucket);
    }

    const total = crawlerVisits + shopperVisits;

    const sourceKeys = new Set([
      ...visitsBySource.keys(),
      ...ordersBySource.keys(),
    ]);

    const bySource = [...sourceKeys]
      .map((source) => {
        const bucket = visitsBySource.get(source) || { crawler: 0, shopper: 0 };
        const visits = bucket.crawler + bucket.shopper;
        const attr = ordersBySource.get(source) || { orders: 0, revenue: 0 };
        const shopperConv =
          bucket.shopper > 0
            ? Math.round((attr.orders / bucket.shopper) * 1000) / 10
            : 0;
        const row = {
          source,
          label: SOURCE_LABELS[source] || source,
          count: visits,
          visits,
          crawlerVisits: bucket.crawler,
          shopperVisits: bucket.shopper,
          crawlerOnly: CRAWLER_ONLY_SOURCES.has(source) || (bucket.shopper === 0 && bucket.crawler > 0),
          percent: total > 0 ? Math.round((visits / total) * 1000) / 10 : 0,
          shopperPercent:
            shopperVisits > 0 ? Math.round((bucket.shopper / shopperVisits) * 1000) / 10 : 0,
          shopperConversionRate: shopperConv,
          orders: attr.orders,
        };
        if (showFinancials) row.revenue = attr.revenue;
        return row;
      })
      .sort(
        (a, b) =>
          b.shopperVisits - a.shopperVisits ||
          b.visits - a.visits ||
          (showFinancials ? b.revenue - a.revenue : b.orders - a.orders)
      );

    const attributedOrdersList = (attributedOrderDocs || []).map((o) => ({
      id: String(o._id),
      orderNumber: o.orderNumber || "",
      source: o.aiAttributedSource || "",
      sourceLabel: SOURCE_LABELS[o.aiAttributedSource] || o.aiAttributedSource || "",
      total: Math.round((Number(o.pricing?.total) || 0) * 100) / 100,
      orderStatus: o.orderStatus || "",
      paymentStatus: o.paymentStatus || "",
      customerName: o.customer?.name || "Guest",
      customerPhone: o.customer?.phone || "",
      createdAt: o.createdAt || null,
      attributedAt: o.aiAttributedAt || null,
    }));

    const shopperConversionRate =
      shopperVisits > 0 ? Math.round((attributedOrders / shopperVisits) * 1000) / 10 : 0;

    const payload = {
      days,
      mode,
      label,
      from: from.toISOString(),
      to: to.toISOString(),
      fromYmd: ymdUtc(from),
      toYmd: ymdUtc(to),
      total,
      crawlerVisits,
      shopperVisits,
      shopperConversionRate,
      attributedOrders,
      attributionWindowDays: 30,
      bySource,
      attributedOrdersList,
      recentQueries: recentQueries.map((row) => ({
        query: row.referrerQuery,
        source: row.source,
        sourceLabel: SOURCE_LABELS[row.source] || row.source,
        path: row.path || "/",
        detection: row.detection,
        createdAt: row.createdAt,
      })),
    };
    if (showFinancials) {
      payload.attributedRevenue = attributedRevenue;
    } else {
      // Hide money on order rows for non-financial roles
      for (const row of attributedOrdersList) delete row.total;
    }

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load AI visit stats." },
      { status: 500 }
    );
  }
}
