"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const WAREHOUSE_LABEL = "Homefy.pk Warehouse";

const PIPELINE = [
  { id: "warehouse", label: "Warehouse", match: (s) => /warehouse|unbook|booked|created|pickup/i.test(s) },
  { id: "transit", label: "Transit", match: (s) => /transit|hub|depart|arriv|dispatch|received|departed/i.test(s) },
  { id: "out", label: "Out", match: (s) => /out for|enroute|waiting for delivery|attempt/i.test(s) },
  { id: "delivered", label: "Delivered", match: (s) => /deliver/i.test(s) && !/out for|attempt|waiting/i.test(s) },
];

function statusTone(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("deliver") && !s.includes("out for") && !s.includes("attempt")) return "ok";
  if (s.includes("out for") || s.includes("enroute") || s.includes("waiting for delivery")) return "warn";
  if (s.includes("transit") || s.includes("hub") || s.includes("depart") || s.includes("arriv")) return "info";
  if (s.includes("return") || s.includes("cancel") || s.includes("fail")) return "bad";
  return "muted";
}

function eventGlyph(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("deliver") && !s.includes("out for")) return "✓";
  if (s.includes("out for") || s.includes("enroute")) return "→";
  if (s.includes("transit") || s.includes("depart") || s.includes("arriv") || s.includes("hub")) return "◎";
  if (s.includes("warehouse") || s.includes("unbook")) return "⌂";
  if (s.includes("return")) return "↩";
  return "•";
}

function friendlyCity(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s.length > 40 || /road|street|gali|muhalla|near|house|chowk|bank/i.test(s)) return "";
  return s.replace(/\s+/g, " ");
}

function pipelineStep(status, events = []) {
  const texts = [String(status || ""), ...events.map((e) => `${e.status || ""} ${e.description || ""}`)];
  let active = 0;
  for (const text of texts) {
    PIPELINE.forEach((step, i) => {
      if (step.match(text)) active = Math.max(active, i);
    });
  }
  if (/unbook/i.test(String(status || ""))) return Math.min(active, 0);
  return active;
}

export default function OrderTrackingView() {
  const searchParams = useSearchParams();
  const initial = String(searchParams.get("tracking") || "").trim();
  const [input, setInput] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [appeared, setAppeared] = useState(false);

  const track = useCallback(async (num) => {
    const id = String(num || "").trim();
    if (!id) {
      setError("Please enter a tracking number.");
      setData(null);
      setAppeared(false);
      return;
    }
    setLoading(true);
    setError("");
    setData(null);
    setAppeared(false);
    try {
      const res = await fetch(`/api/tracking?trackingNumber=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.success) {
        setError(
          json.error === "Invalid tracking number"
            ? "Tracking number not found. Please check and try again."
            : json.error || "Could not load tracking."
        );
        return;
      }
      setData(json);
      requestAnimationFrame(() => setAppeared(true));
    } catch {
      setError("Could not connect to courier. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) track(initial);
  }, [initial, track]);

  const tone = useMemo(() => (data ? statusTone(data.status) : "muted"), [data]);
  const dest = useMemo(() => friendlyCity(data?.destination), [data]);
  const events = data?.events || [];
  const step = useMemo(() => (data ? pipelineStep(data.status, events) : 0), [data, events]);
  const nowAt = data?.currentLocation || events[0]?.status || data?.status || "";
  const destLabel = data?.destinationReceivedLabel || (dest ? `Heading to ${dest}` : "");
  const destOk = Boolean(data?.destinationReceived);

  return (
    <>
      <header className="cc-track__top">
        <form
          className="cc-track__form"
          onSubmit={(e) => {
            e.preventDefault();
            track(input);
          }}
        >
          <input
            className="cc-track__input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Postex tracking number"
            aria-label="Postex tracking number"
            autoComplete="off"
          />
          <button className="cc-track__submit" type="submit" disabled={loading}>
            {loading ? "…" : "Track"}
          </button>
        </form>
      </header>

        {error ? <div className="cc-track__error" role="alert">{error}</div> : null}

        {!data && !loading && !error ? (
          <p className="cc-track__hint">Enter a tracking number to see live parcel location.</p>
        ) : null}

        {data ? (
          <div className={`cc-track__card ${appeared ? "is-in" : ""} tone-${tone}`}>
            <div className="cc-track__card-head">
              <div>
                <p className="cc-track__kicker">Status</p>
                <h2 className="cc-track__status">{data.status}</h2>
              </div>
              <div className="cc-track__ids">
                <span>{data.courier || "Postex"}</span>
                <span className="cc-track__mono">{data.trackingNumber}</span>
              </div>
            </div>

            <div className="cc-track__pipeline" aria-label="Delivery progress">
              {PIPELINE.map((p, i) => {
                const done = i <= step;
                const current = i === step;
                return (
                  <div
                    key={p.id}
                    className={`cc-track__pipe ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}
                  >
                    <span className="cc-track__pipe-dot">{done ? (current && step < 3 ? "" : "✓") : ""}</span>
                    <small>{p.label}</small>
                    {i < PIPELINE.length - 1 ? <i className="cc-track__pipe-line" aria-hidden /> : null}
                  </div>
                );
              })}
            </div>

            <div className="cc-track__facts">
              <div>
                <p className="cc-track__kicker">Now at</p>
                <strong>{nowAt}</strong>
                {data.lastScanAt ? <span>{data.lastScanAt}</span> : null}
              </div>
              <div>
                <p className="cc-track__kicker">Route</p>
                <strong>
                  {WAREHOUSE_LABEL} → {dest || "City"}
                </strong>
                <span className={destOk ? "ok" : "pending"}>{destLabel}</span>
              </div>
            </div>

            <div className="cc-track__timeline-wrap">
              <div className="cc-track__timeline-head">
                <p className="cc-track__kicker">Postex scans</p>
                <span>{events.length}</span>
              </div>
              {events.length ? (
                <ol className="cc-track__timeline">
                  {events.map((ev, i) => (
                    <li key={`${ev.date}-${ev.time}-${ev.status}-${i}`} className={i === 0 ? "is-latest" : ""}>
                      <span className="cc-track__event-dot" aria-hidden>
                        {eventGlyph(ev.status)}
                      </span>
                      <div>
                        <strong>{ev.status}</strong>
                        <time>{[ev.date, ev.time].filter(Boolean).join(" · ")}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="cc-track__hint">No scans yet.</p>
              )}
            </div>
          </div>
        ) : null}
    </>
  );
}
