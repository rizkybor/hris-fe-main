import { themeRevision } from "@/composables/useTheme";

export const uiColor = (name, alpha = 1) => {
  // Touch the theme revision so a computed() that builds chart options
  // re-runs when the theme changes.
  void themeRevision.value;
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
