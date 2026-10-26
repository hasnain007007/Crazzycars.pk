/**
 * Draws a front lip / splitter onto a 2D canvas for the "Try it on your car photo"
 * preview. Pure drawing, no React.
 *
 * fit: { cx, cy, w, h, curve, tilt, angle }
 *   centre, width, thickness (px), end rise (0–2), tilt (rad, in-picture rotation),
 *   angle (rad, turns the lip like the car is photographed from the side).
 * style: from tryOnStyleFor()
 */

let carbonPattern = null;

function carbon(ctx) {
  if (carbonPattern) return carbonPattern;
  const c = document.createElement("canvas");
  c.width = 8;
  c.height = 8;
  const p = c.getContext("2d");
  p.fillStyle = "#151515";
  p.fillRect(0, 0, 8, 8);
  p.fillStyle = "#2c2c2c";
  p.fillRect(0, 0, 4, 4);
  p.fillRect(4, 4, 4, 4);
  carbonPattern = ctx.createPattern(c, "repeat");
  return carbonPattern;
}

/** Top edge (negative = up) and bottom edge at u in [-1, 1], before perspective. */
function edges(u, fit, style) {
  const a = Math.abs(u);
  const { h, curve } = fit;
  let top = -curve * h * 1.6 * u * u;
  let thick = h;
  if (style.wings === "pointed") {
    if (a > 0.72) {
      const k = (a - 0.72) / 0.28;
      top -= h * 1.4 * k;
      thick = h * (1 + 0.4 * k) * (1 - 0.8 * Math.max(0, (a - 0.9) / 0.1));
    }
  } else if (a > 0.72) {
    const k = (a - 0.72) / 0.28;
    top -= h * 1.3 * Math.pow(k, 1.5);
    thick = h * (1 + 0.7 * k);
  }
  return { top, bottom: top + Math.max(thick, h * 0.15) };
}

/**
 * Perspective: the lip lies in a vertical plane turned by fit.angle around the
 * vertical axis, seen by a camera ~1.4 lip-widths away.
 */
function projector(fit) {
  const half = fit.w / 2;
  const ang = fit.angle || 0;
  const f = fit.w * 1.4;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return (u, y) => {
    const X = u * half;
    const k = f / (f + X * s);
    return [X * c * k, y * k];
  };
}

function outline(ctx, fit, style, P, from = -1, to = 1) {
  const steps = 60;
  ctx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const u = from + ((to - from) * i) / steps;
    const [x, y] = P(u, edges(u, fit, style).top);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i -= 1) {
    const u = from + ((to - from) * i) / steps;
    const [x, y] = P(u, edges(u, fit, style).bottom);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function bodyFill(ctx, fit, style) {
  // Spans the raised wing ends (about -2.6h) down to the underside (+1.2h).
  const g = ctx.createLinearGradient(0, -fit.h * 2.6, 0, fit.h * 1.2);
  if (style.finish === "matt") {
    g.addColorStop(0, "#2a2a2a");
    g.addColorStop(0.68, "#363636");
    g.addColorStop(1, "#1a1a1a");
  } else {
    // Gloss: dark wings, a thin bright reflection along the centre's top face, dark underside.
    g.addColorStop(0, "#1e1e1e");
    g.addColorStop(0.6, "#2c2c2c");
    g.addColorStop(0.68, "#7a7a7a");
    g.addColorStop(0.73, "#2a2a2a");
    g.addColorStop(0.85, "#0e0e0e");
    g.addColorStop(1, "#020202");
  }
  return g;
}

export function drawLip(ctx, fit, style) {
  const { cx, cy, h, tilt } = fit;
  const P = projector(fit);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt || 0);

  // Fins hang under the centre section ("spike" splitters).
  if (style.fins > 0) {
    ctx.fillStyle = bodyFill(ctx, fit, style);
    for (let i = 0; i < style.fins; i += 1) {
      const u = -0.45 + (0.9 * i) / Math.max(1, style.fins - 1);
      const b = edges(u, fit, style).bottom;
      const du = (h * 0.28) / (fit.w / 2);
      const pts = [P(u - du, b - 1), P(u + du, b - 1), P(u + du / 2, b + h * 0.75), P(u - du / 2, b + h * 0.75)];
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
    }
  }

  // Body with a soft ground shadow.
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = h * 1.4;
  ctx.shadowOffsetY = h * 0.7;
  outline(ctx, fit, style, P);
  ctx.fillStyle = bodyFill(ctx, fit, style);
  ctx.fill();
  ctx.shadowColor = "transparent";

  if (style.finish === "carbon") {
    ctx.save();
    outline(ctx, fit, style, P);
    ctx.clip();
    ctx.globalAlpha = 0.55;
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = carbon(ctx);
    ctx.fillRect(-fit.w, -fit.w, fit.w * 2, fit.w * 2);
    ctx.restore();
  }

  // Red accent strip along the lower edge of the centre section.
  if (style.accent === "red") {
    ctx.beginPath();
    const steps = 40;
    for (let i = 0; i <= steps; i += 1) {
      const u = -0.62 + (1.24 * i) / steps;
      const [x, y] = P(u, edges(u, fit, style).bottom - h * 0.32);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = steps; i >= 0; i -= 1) {
      const u = -0.62 + (1.24 * i) / steps;
      const [x, y] = P(u, edges(u, fit, style).bottom);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "#c8102e";
    ctx.fill();
  }

  // Panel seams for multi-piece kits.
  if (style.pieces >= 3) {
    ctx.strokeStyle = "rgba(0,0,0,0.9)";
    ctx.lineWidth = Math.max(1, h * 0.08);
    for (const u of [-0.4, 0.4]) {
      const { top, bottom } = edges(u, fit, style);
      const [x1, y1] = P(u, top);
      const [x2, y2] = P(u, bottom);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  // Highlight along the top edge (stronger on gloss).
  ctx.beginPath();
  for (let i = 0; i <= 60; i += 1) {
    const u = -0.98 + (1.96 * i) / 60;
    const [x, y] = P(u, edges(u, fit, style).top + h * 0.12);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = style.finish === "matt" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.38)";
  ctx.lineWidth = Math.max(1, h * 0.1);
  ctx.stroke();

  ctx.restore();
}
