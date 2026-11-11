// Design-token colours for places that need a real colour string instead
// of a Tailwind class (ApexCharts options, canvas, inline SVG). Reads the
// `--ui-*` RGB channels from :root at call time, so charts follow the
// palette (and a future dark theme) without hard-coded hex values.
export const uiColor = (name, alpha = 1) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`--ui-${name}`).trim();
  const channels = raw ? raw.split(/\s+/).join(", ") : "0, 0, 0";
  return alpha < 1 ? `rgba(${channels}, ${alpha})` : `rgb(${channels})`;
};

// Shared ApexCharts look: no toolbar or entrance animation, token grid and
// axis label colours, inherited font.
export const uiChartBase = () => ({
  chart: { toolbar: { show: false }, animations: { enabled: false }, fontFamily: "inherit" },
  dataLabels: { enabled: false },
  grid: { borderColor: uiColor("line"), strokeDashArray: 0, padding: { left: 4, right: 4 } },
  axisLabel: { colors: uiColor("muted"), fontSize: "11px" },
});
