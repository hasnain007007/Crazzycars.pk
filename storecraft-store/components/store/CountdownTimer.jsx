"use client";

import { useEffect, useMemo, useState } from "react";

function formatPart(value) {
  return String(Math.max(0, value)).padStart(2, "0");
}

export function CountdownTimer({ endDate }) {
  const target = useMemo(() => {
    const t = new Date(endDate).getTime();
    // Static fallback avoids Date.now() in render (SSR/client mismatch).
    return Number.isFinite(t) ? t : Date.UTC(2099, 11, 31);
  }, [endDate]);
  const [now, setNow] = useState(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  if (now == null) {
    return (
      <div className="flex items-center gap-2" suppressHydrationWarning>
        {["00", "00", "00", "00"].map((v, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className="w-14 rounded border border-[rgba(255,255,255,0.08)] bg-[#111111] px-2 py-1 text-center">
              <p className="text-sm font-bold text-[#E8E8E8]">{v}</p>
              <p className="text-[10px] text-[#707070]">{["Days", "Hour", "Min", "Sec"][idx]}</p>
            </div>
            {idx < 3 ? <span className="text-[#707070]">:</span> : null}
          </div>
        ))}
      </div>
    );
  }

  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const mins = Math.floor((remaining / (1000 * 60)) % 60);
  const secs = Math.floor((remaining / 1000) % 60);

  const units = [
    { value: formatPart(days), label: "Days" },
    { value: formatPart(hours), label: "Hour" },
    { value: formatPart(mins), label: "Min" },
    { value: formatPart(secs), label: "Sec" },
  ];

  return (
    <div className="flex items-center gap-2">
      {units.map((u, idx) => (
        <div key={u.label} className="flex items-center gap-2">
          <div className="w-14 rounded border border-[rgba(255,255,255,0.08)] bg-[#111111] px-2 py-1 text-center">
            <p className="text-sm font-bold text-[#E8E8E8]">{u.value}</p>
            <p className="text-[10px] text-[#707070]">{u.label}</p>
          </div>
          {idx < units.length - 1 ? <span className="text-sm font-semibold text-[#707070]">:</span> : null}
        </div>
      ))}
    </div>
  );
}
