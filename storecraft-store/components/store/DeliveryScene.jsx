/**
 * Order-placed celebration: the CrazzyCars van drives from our store to the customer's
 * house, drops the parcel at the door, the door lights up and a green tick pops.
 * Plays once (~4.5s). Pure SVG + CSS (`.ds-*` in globals.css). Base styles are the
 * FINAL frame and the keyframes animate *from* the start, so with reduced motion
 * (animation: none) the customer simply sees the delivered state.
 */
export default function DeliveryScene({ caption = "From our store to your door" }) {
  return (
    <figure className="ds" aria-label="Your order is on its way from our store to your door">
      <svg className="ds__svg" viewBox="0 0 360 160" role="img" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ds-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff1f1" />
            <stop offset="1" stopColor="#ffffff" />
          </linearGradient>
          <radialGradient id="ds-glow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stopColor="#ffd36b" stopOpacity=".85" />
            <stop offset="1" stopColor="#ffd36b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="360" height="160" rx="18" fill="url(#ds-sky)" />
        <circle cx="190" cy="34" r="13" fill="#ffe08a" opacity=".9" />
        <g className="ds-cloud ds-cloud--1" fill="#fff">
          <ellipse cx="110" cy="30" rx="16" ry="7" />
          <ellipse cx="122" cy="26" rx="10" ry="7" />
        </g>
        <g className="ds-cloud ds-cloud--2" fill="#fff">
          <ellipse cx="248" cy="22" rx="14" ry="6" />
          <ellipse cx="258" cy="18" rx="9" ry="6" />
        </g>

        {/* ground + road */}
        <rect x="0" y="122" width="360" height="6" fill="#d9f0d3" />
        <rect x="0" y="128" width="360" height="22" fill="#2b2f36" />
        <line x1="0" y1="139" x2="360" y2="139" stroke="#fff" strokeWidth="2" strokeDasharray="12 10" opacity=".55" />

        {/* our store */}
        <g>
          <rect x="12" y="80" width="58" height="44" rx="2" fill="#fff" stroke="#e5e7eb" />
          <path d="M8 80h66l-4 10H12z" fill="#C41E1E" />
          <path d="M20 80h8l-2 10h-8zM36 80h8l-1 10h-8zM52 80h8v10h-8z" fill="#fff" opacity=".9" />
          <rect x="10" y="64" width="62" height="14" rx="3" fill="#111" />
          <text x="41" y="74" textAnchor="middle" fontSize="7.6" fontWeight="800" fill="#fff" fontFamily="system-ui,sans-serif" textLength="54" lengthAdjust="spacingAndGlyphs">
            Crazzy<tspan fill="#ff5a4f">Cars</tspan>
          </text>
          <rect x="34" y="100" width="14" height="24" rx="1.5" fill="#f3f4f6" stroke="#d1d5db" />
          <rect x="18" y="96" width="12" height="10" rx="1.5" fill="#dbeafe" />
          <rect x="52" y="96" width="12" height="10" rx="1.5" fill="#dbeafe" />
        </g>

        {/* customer's house */}
        <g>
          <rect x="294" y="60" width="8" height="16" fill="#8b5e3c" />
          <rect x="276" y="80" width="66" height="44" rx="2" fill="#fff" stroke="#e5e7eb" />
          <path d="M268 83l41-31 41 31z" fill="#7a2020" />
          <rect x="283" y="90" width="12" height="11" rx="1.5" fill="#dbeafe" />
          <rect x="325" y="90" width="12" height="11" rx="1.5" fill="#dbeafe" />
          <circle className="ds-glow" cx="309" cy="112" r="22" fill="url(#ds-glow)" />
          <rect x="301" y="99" width="16" height="25" rx="1.5" fill="#b45309" />
          <rect className="ds-door-light" x="301" y="99" width="16" height="25" rx="1.5" fill="#ffd36b" />
          <circle cx="313.5" cy="112" r="1.2" fill="#78350f" />
        </g>

        {/* van + parcel (both ride the same translate) */}
        <g className="ds-move">
          <g className="ds-speed" stroke="#C41E1E" strokeWidth="2.2" strokeLinecap="round" opacity=".55">
            <line x1="40" y1="112" x2="56" y2="112" />
            <line x1="46" y1="120" x2="58" y2="120" />
            <line x1="38" y1="128" x2="54" y2="128" />
          </g>
          <g className="ds-puffs" fill="#cbd5e1">
            <circle className="ds-puff ds-puff--1" cx="60" cy="130" r="3" />
            <circle className="ds-puff ds-puff--2" cx="54" cy="127" r="2.4" />
          </g>
          <g className="ds-van">
            <path d="M64 132v-20q0-6 6-6h42l14 12h6q4 0 4 4v10q0 2-2 2H66q-2 0-2-2z" fill="#C41E1E" />
            <path d="M104 109h9l10 9h-19z" fill="#fde2e2" />
            <rect x="68" y="110" width="30" height="10" rx="2" fill="#fff" opacity=".18" />
            <text x="83" y="117.6" textAnchor="middle" fontSize="6.4" fontWeight="800" fill="#fff" fontFamily="system-ui,sans-serif">
              CC.pk
            </text>
            <rect x="132" y="121" width="4" height="3.5" rx="1.2" fill="#ffd36b" />
            <path className="ds-beam" d="M136 121l22-4v13l-22-4z" fill="#ffd36b" opacity=".35" />
            <g className="ds-wheel">
              <circle cx="80" cy="136" r="7" fill="#111" />
              <circle cx="80" cy="136" r="2.6" fill="#e5e7eb" />
              <rect x="79.2" y="130" width="1.6" height="3.2" fill="#e5e7eb" />
            </g>
            <g className="ds-wheel">
              <circle cx="122" cy="136" r="7" fill="#111" />
              <circle cx="122" cy="136" r="2.6" fill="#e5e7eb" />
              <rect x="121.2" y="130" width="1.6" height="3.2" fill="#e5e7eb" />
            </g>
          </g>
          <g className="ds-parcel">
            <rect x="74" y="92" width="18" height="14" rx="1.5" fill="#d6a46c" />
            <rect x="74" y="92" width="18" height="4" fill="#c48b4f" />
            <rect x="81.5" y="92" width="3" height="14" fill="#C41E1E" />
          </g>
        </g>

        {/* delivered tick + confetti */}
        <g className="ds-tick">
          <circle cx="309" cy="34" r="12" fill="#16a34a" />
          <path d="M303.5 34.5l4 4 8-8.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g className="ds-confetti">
          <rect className="ds-c ds-c--1" x="307" y="32" width="4" height="4" rx="1" fill="#C41E1E" />
          <rect className="ds-c ds-c--2" x="307" y="32" width="4" height="4" rx="1" fill="#ffd36b" />
          <rect className="ds-c ds-c--3" x="307" y="32" width="4" height="4" rx="1" fill="#16a34a" />
          <rect className="ds-c ds-c--4" x="307" y="32" width="4" height="4" rx="1" fill="#3b82f6" />
          <rect className="ds-c ds-c--5" x="307" y="32" width="4" height="4" rx="1" fill="#C41E1E" />
          <rect className="ds-c ds-c--6" x="307" y="32" width="4" height="4" rx="1" fill="#ffd36b" />
        </g>
      </svg>
      {caption ? <figcaption className="ds__cap">{caption}</figcaption> : null}
    </figure>
  );
}
