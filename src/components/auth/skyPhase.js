
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Panel top / bottom, the aurora's two colours and strength, stars.
const P = {
  malam: { top: "#0f1b2d", bottom: "#0b1424", deep: "#1f5cd9", bright: "#52b8fa", glow: 1, stars: 1 },
  subuh: { top: "#141d40", bottom: "#4a2f5a", deep: "#5b45c4", bright: "#d98aa0", glow: 0.8, stars: 0.55 },
  pagi: { top: "#1f569b", bottom: "#4079ab", deep: "#5aa6ea", bright: "#ffd9a3", glow: 0.45, stars: 0 },
  siang: { top: "#1b6cc0", bottom: "#3480c0", deep: "#6cb8f2", bright: "#e4f4ff", glow: 0.35, stars: 0 },
  sore: { top: "#1e4b82", bottom: "#9a6230", deep: "#d98a3d", bright: "#ffd27a", glow: 0.5, stars: 0 },
  senja: { top: "#2a2458", bottom: "#9c4150", deep: "#c94f7a", bright: "#ff9a5c", glow: 0.8, stars: 0.15 },
  petang: { top: "#181a3f", bottom: "#432a58", deep: "#5b45c4", bright: "#b77cf0", glow: 0.9, stars: 0.6 },
};
const parsed = Object.fromEntries(
  Object.entries(P).map(([k, v]) => [k, { ...v, top: rgb(v.top), bottom: rgb(v.bottom), deep: rgb(v.deep), bright: rgb(v.bright) }])
);

const hm = (h, m = 0) => h * 60 + m;

// Colour keyframes (minutes past midnight); between two, colours blend.
const KEYS = [
  [hm(3, 40), "malam"],
  [hm(4, 30), "subuh"],
  [hm(5, 15), "subuh"],
  [hm(6, 15), "pagi"],
  [hm(10, 0), "siang"],
  [hm(14, 30), "siang"],
  [hm(16, 0), "sore"],
  [hm(17, 0), "sore"],
  [hm(17, 55), "senja"],
  [hm(18, 30), "petang"],
  [hm(19, 15), "malam"],
];

// The named moments (anything else is malam).
export const PHASES = [
  ["subuh", hm(4, 0), hm(5, 30)],
  ["pagi", hm(5, 30), hm(10, 0)],
  ["siang", hm(10, 0), hm(15, 0)],
  ["sore", hm(15, 0), hm(17, 30)],
  ["senja", hm(17, 30), hm(18, 30)],
];

const SUNRISE = hm(5, 45);
const SUNSET = hm(18, 0);

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const smooth = (t) => t * t * (3 - 2 * t);
const ramp = (x, a, b) => smooth(Math.min(1, Math.max(0, (x - a) / (b - a))));

/** @param {Date} now -- read in the device's own time zone */
export function skyAt(now = new Date()) {
  const minute = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  // Wrap: before the first keyframe / after the last, it's malam.
  let a = [KEYS[KEYS.length - 1][0] - 1440, "malam"];
  let b = KEYS[0];
  for (let i = 0; i < KEYS.length; i++) {
    if (minute >= KEYS[i][0]) {
      a = KEYS[i];
      b = KEYS[i + 1] ?? [KEYS[0][0] + 1440, "malam"];
    }
  }
  const t = smooth(Math.min(1, Math.max(0, (minute - a[0]) / Math.max(1, b[0] - a[0]))));
  const A = parsed[a[1]];
  const B = parsed[b[1]];

  const p = Math.min(1, Math.max(0, (minute - SUNRISE) / (SUNSET - SUNRISE)));
  const elevation = Math.sin(Math.PI * p);
  const sun = {
    x: 0.7 + 0.22 * p,
    y: 0.52 + 0.36 * elevation,
    amount: ramp(minute, SUNRISE - 20, SUNRISE + 50) * (1 - ramp(minute, SUNSET - 50, SUNSET + 15)) * (0.7 + 0.3 * elevation),
    warm: 1 - ramp(elevation, 0.15, 0.6),
  };

  const phase = PHASES.find(([, from, to]) => minute >= from && minute < to)?.[0] ?? "malam";
  const css = (c) => `rgb(${c.map((v) => Math.round(v)).join(" ")})`;
  return {
    phase,
    top: css(mix(A.top, B.top, t)),
    bottom: css(mix(A.bottom, B.bottom, t)),
    deep: mix(A.deep, B.deep, t).map((v) => v / 255),
    bright: mix(A.bright, B.bright, t).map((v) => v / 255),
    glow: A.glow + (B.glow - A.glow) * t,
    stars: A.stars + (B.stars - A.stars) * t,
    sun,
  };
}
