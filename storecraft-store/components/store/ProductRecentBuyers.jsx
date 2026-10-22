"use client";

import { useEffect, useMemo, useState } from "react";
import { PK_CITIES, PK_ISLAMIC_NAMES } from "@/lib/fakeSocialProof";

function hashSeed(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function buildBuyers(productKey) {
  const h = hashSeed(productKey);
  const count = 3 + (h % 2); // 3–4 rows
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const n = (h + i * 17) >>> 0;
    const mins = [4, 12, 28, 45, 90, 150][(n >> 4) % 6];
    const when =
      mins < 60 ? `${mins} minutes ago` : mins === 90 ? "1.5 hours ago" : "2 hours ago";
    rows.push({
      id: `${productKey}-${i}`,
      name: PK_ISLAMIC_NAMES[n % PK_ISLAMIC_NAMES.length],
      city: PK_CITIES[(n >> 8) % PK_CITIES.length],
      when,
    });
  }
  return rows;
}

/** Compact list of recent (simulated) buyers under the live-view strip. */
export function ProductRecentBuyers({ productKey = "" }) {
  const rows = useMemo(() => buildBuyers(productKey), [productKey]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready || !rows.length) return null;

  return (
    <div className="pdp-recent-buyers" aria-label="Recent buyers">
      <p className="pdp-recent-buyers__head">Recent orders</p>
      <ul className="pdp-recent-buyers__list">
        {rows.map((row) => (
          <li key={row.id}>
            <span className="pdp-recent-buyers__dot" aria-hidden />
            <span>
              <strong>{row.name}</strong> from {row.city}
              <span className="pdp-recent-buyers__when"> · {row.when}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
