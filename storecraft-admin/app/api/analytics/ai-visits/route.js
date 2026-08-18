import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getRequestUser } from "@/lib/getRequestUser";
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
  bing: "Bing",
  apple: "Applebot",
  amazon: "Amazonbot",
  bytespider: "Bytespider",
  other_ai: "Other AI",
};

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
    if (!getRequestUser(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

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

    const [total, bySourceRows, recentQueries, attributedOrderRows] = await Promise.all([
      AiAgentVisit.countDocuments(visitMatch),
      AiAgentVisit.aggregate([
        { $match: visitMatch },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
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

    const sourceKeys = new Set([
      ...bySourceRows.map((r) => r._id),
      ...ordersBySource.keys(),
    ]);

    const bySource = [...sourceKeys]
      .map((source) => {
        const visitRow = bySourceRows.find((r) => r._id === source);
        const visits = visitRow?.count || 0;
        const attr = ordersBySource.get(source) || { orders: 0, revenue: 0 };
        return {
          source,
          label: SOURCE_LABELS[source] || source,
          count: visits,
          visits,
          percent: total > 0 ? Math.round((visits / total) * 1000) / 10 : 0,
          orders: attr.orders,
          revenue: attr.revenue,
        };
      })
      .sort((a, b) => b.visits - a.visits || b.revenue - a.revenue);

    return NextResponse.json({
      success: true,
      data: {
        days,
        mode,
        label,
        from: from.toISOString(),
        to: to.toISOString(),
        fromYmd: ymdUtc(from),
        toYmd: ymdUtc(to),
        total,
        attributedOrders,
        attributedRevenue,
        attributionWindowDays: 14,
        bySource,
        recentQueries: recentQueries.map((row) => ({
          query: row.referrerQuery,
          source: row.source,
          sourceLabel: SOURCE_LABELS[row.source] || row.source,
          path: row.path || "/",
          detection: row.detection,
          createdAt: row.createdAt,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || "Failed to load AI visit stats." },
      { status: 500 }
    );
  }
}
