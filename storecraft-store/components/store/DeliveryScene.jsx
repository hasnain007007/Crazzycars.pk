"use client";

import { useEffect, useState } from "react";
import { isLahoreCity, lahoreEtaRange } from "@/lib/storePolicyCopy";

/**
 * Order-placed "parcel journey" card — styled like a real delivery app, not a cartoon:
 *   1. a soft map tile (blocks, river, park, main roads) with the route from our shop in
 *      Gujranwala to the customer's city; the route draws in while a top-down CrazzyCars
 *      van drives along the road (SVG <animateMotion>, works in Safari too) and parks at
 *      the customer's pin, which then pulses with a green tick;
 *   2. an honest tracker underneath: Order placed ✓ → (booking advance, when due) →
 *      Packed & dispatched → Delivered, with the CONFIRMED Lahore ETA only
 *      (store-policy), neutral copy for other cities.
 * Reduced motion: the van is shown parked and the route fully drawn (no movement).
 * Styles: `.pj-*` in globals.css.
 */
const ROUTE = "M40 138 C 88 138, 104 104, 146 104 S 206 124, 242 98 S 284 52, 314 50";
const EASE = ".45 0 .25 1";

function Van() {
  return (
    <g>
      <ellipse cx="0" cy="3.2" rx="14" ry="7.4" fill="#0b1220" opacity=".18" />
      <rect x="-13" y="-7" width="26" height="14" rx="3.2" fill="#b91c1c" />
      <rect x="-12" y="-6" width="15.5" height="12" rx="2" fill="#dc2626" />
      <path d="M-10 -3.2h11.5M-10 0h11.5M-10 3.2h11.5" stroke="#fca5a5" strokeWidth=".7" opacity=".8" />
      <rect x="4.6" y="-6" width="3.6" height="12" rx="1" fill="#991b1b" />
      <rect x="8.6" y="-5.6" width="3.2" height="11.2" rx="1.2" fill="#1f2937" />
      <rect x="9.1" y="-4.8" width="1.1" height="4" rx=".5" fill="#94a3b8" opacity=".7" />
      <rect x="6.5" y="-8.6" width="2.4" height="1.8" rx=".6" fill="#7f1d1d" />
      <rect x="6.5" y="6.8" width="2.4" height="1.8" rx=".6" fill="#7f1d1d" />
      <rect x="12.4" y="-5.4" width="1.2" height="2.6" rx=".6" fill="#fde68a" />
      <rect x="12.4" y="2.8" width="1.2" height="2.6" rx=".6" fill="#fde68a" />
    </g>
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return reduced;
}

function Step({ state, title, note, icon }) {
  return (
    <li className={`pj-step pj-step--${state}`}>
      <span className="pj-step__dot" aria-hidden="true">
        {state === "done" ? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          icon
        )}
      </span>
      <span className="pj-step__title">{title}</span>
      {note ? <span className="pj-step__note">{note}</span> : null}
    </li>
  );
}

const ICON = {
  wallet: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M16 12.5h2M3 9.5h18" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
      <path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11l8-6.5 8 6.5v8.5a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
    </svg>
  ),
};

export default function DeliveryScene({ city = "", advanceDue = false, cod = true }) {
  const reduced = useReducedMotion();
  const [run, setRun] = useState(0);
  const cityName = String(city || "").trim();
  const lahore = isLahoreCity(cityName);
  const destination = cityName ? `Your door · ${cityName}` : "Your door";
  const begin = reduced ? "0s" : "0.6s";
  const dur = reduced ? "0.01s" : "3.2s";

  return (
    <figure className={`pj${reduced ? " pj--still" : ""}`} aria-label={`Your parcel's journey from CrazzyCars, Gujranwala to ${cityName || "your door"}`}>
      <div className="pj-map" key={run}>
        <svg className="pj-map__svg" viewBox="0 0 360 180" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="pj-blocks" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
              <rect width="22" height="22" fill="#eef0ea" />
              <rect x="2" y="2" width="18" height="18" rx="2.5" fill="#e6e9e1" />
            </pattern>
          </defs>

          {/* map tile */}
          <rect width="360" height="180" fill="url(#pj-blocks)" />
          <path d="M-10 26 C 50 44, 92 8, 158 22 S 276 2, 372 14" fill="none" stroke="#c9e2f2" strokeWidth="13" strokeLinecap="round" />
          <path d="M196 140c14-12 40-14 56-4 12 8 8 26-8 30-20 6-58-8-48-26z" fill="#d6ead0" />
          <path d="M60 60c10-9 32-8 38 2 6 10-6 20-20 19-15-1-26-12-18-21z" fill="#d6ead0" />
          <path d="M-5 90 L 370 66" stroke="#fff" strokeWidth="5" />
          <path d="M120 -5 L 92 190" stroke="#fff" strokeWidth="5" />
          <path d="M262 -5 L 286 190" stroke="#fff" strokeWidth="4" />
          <path d="M-5 160 L 370 150" stroke="#fff" strokeWidth="3.5" />

          {/* the route on its own road */}
          <path d={ROUTE} fill="none" stroke="#d7dbe2" strokeWidth="11" strokeLinecap="round" />
          <path d={ROUTE} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
          <path d={ROUTE} fill="none" stroke="#9ca3af" strokeWidth="2.2" strokeDasharray="1 5.5" strokeLinecap="round" />
          <path className="pj-progress" d={ROUTE} pathLength="100" fill="none" stroke="#C41E1E" strokeWidth="3.6" strokeLinecap="round" />

          {/* shop marker */}
          <g transform="translate(40 138)">
            <ellipse cx="0" cy="13" rx="9" ry="3" fill="#0b1220" opacity=".15" />
            <circle r="12.5" fill="#fff" />
            <circle r="10.5" fill="#C41E1E" />
            <path d="M-5.5 -2h11l-1.2-3.8h-8.6zM-4.5 -2v6.5h9V-2M-1.3 4.5v-3.2h2.6v3.2" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </g>

          {/* customer pin */}
          <g className="pj-pin" transform="translate(314 50)">
            <circle className="pj-pulse" r="9" fill="#16a34a" opacity="0" />
            <ellipse cx="0" cy="1.5" rx="6" ry="2" fill="#0b1220" opacity=".2" />
            <path d="M0 0c-7-8.5-12-13.5-12-20a12 12 0 0 1 24 0c0 6.5-5 11.5-12 20z" fill="#111827" />
            <path d="M-5 -19.5l5-4.2 5 4.2v5.6h-10z" fill="#fff" />
            <g className="pj-tick">
              <circle cx="10" cy="-27" r="6.2" fill="#16a34a" stroke="#fff" strokeWidth="1.6" />
              <path d="M7.4 -27l1.8 1.8 3.6-3.8" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>

          {/* van follows the route (rotate=auto), parks just before the pin */}
          <g>
            <Van />
            <animateMotion
              dur={dur}
              begin={begin}
              fill="freeze"
              rotate="auto"
              calcMode="spline"
              keyTimes="0;1"
              keyPoints={reduced ? "0.94;0.94" : "0;0.94"}
              keySplines={EASE}
              path={ROUTE}
            />
          </g>
        </svg>

        <span className="pj-label pj-label--from">
          <b>CrazzyCars</b> · Gujranwala
        </span>
        <span className="pj-label pj-label--to">{destination}</span>
        {!reduced ? (
          <button type="button" className="pj-replay" onClick={() => setRun((n) => n + 1)} aria-label="Replay the parcel journey">
            ↻ Replay
          </button>
        ) : null}
      </div>

      <ol className="pj-steps" aria-label="Order progress">
        <Step state="done" title="Order placed" note="Just now" />
        {advanceDue ? (
          <Step state="now" title="Booking advance" note="Send screenshot on WhatsApp" icon={ICON.wallet} />
        ) : (
          <Step state="now" title="Confirming" note="We’ll call / WhatsApp you" icon={ICON.wallet} />
        )}
        <Step state="next" title="Packed & sent" note="Tracking no. on WhatsApp" icon={ICON.box} />
        <Step
          state="next"
          title="At your door"
          note={lahore ? `Lahore: ${lahoreEtaRange()} days` : cod ? "Pay the rest on delivery" : "Delivered to you"}
          icon={ICON.home}
        />
      </ol>
    </figure>
  );
}
