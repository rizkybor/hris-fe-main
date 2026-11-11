import { uiColor } from "@/utils/uiColor";
import { t, localeTag } from "@/i18n";
// Formatting / threshold helpers for server monitoring.

export const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = Number(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

// Under 75% fine, 75-90% needs attention, 90%+ critical -- the same
// thresholds used for the app server's disk.
export const usageLevel = (percent) => {
  if (percent === null || percent === undefined) return { color: uiColor("faint"), text: "text-ui-muted" };
  if (percent >= 90) return { color: uiColor("bad"), text: "text-ui-bad" };
  if (percent >= 75) return { color: uiColor("warn"), text: "text-ui-warn" };
  return { color: uiColor("accent"), text: "text-ui-ink" };
};

// Labels are getters so they follow the interface language when rendered.
export const STATUS = {
  online: { get label() { return t("servers.status.online"); }, class: "bg-ui-ok-soft text-ui-ok", dot: uiColor("ok") },
  offline: { get label() { return t("servers.status.offline"); }, class: "bg-ui-bad-soft text-ui-bad", dot: uiColor("bad") },
  pending: { get label() { return t("servers.status.pending"); }, class: "bg-ui-warn-soft text-ui-warn", dot: uiColor("warn") },
};

export const timeAgo = (value) => {
  if (!value) return t("servers.time.never");
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return t("servers.time.justNow");
  const n = seconds < 3600 ? Math.floor(seconds / 60) : seconds < 86400 ? Math.floor(seconds / 3600) : Math.floor(seconds / 86400);
  const key = seconds < 3600 ? "minutesAgo" : seconds < 86400 ? "hoursAgo" : "daysAgo";
  return t(`servers.time.${key}`, { n }, n);
};

export const formatUptime = (seconds) => {
  if (!seconds && seconds !== 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0
    ? t("servers.uptime.daysHours", { days, hours })
    : t("servers.uptime.hoursMinutes", { hours, minutes: Math.floor((seconds % 3600) / 60) });
};

// Kinds of site the agent recognises from the web server config.
export const SITE_TYPES = {
  laravel: { label: "Laravel", class: "bg-ui-bad-soft text-ui-bad" },
  wordpress: { label: "WordPress", class: "bg-ui-info-soft text-ui-info" },
  node: { label: "Node.js", class: "bg-ui-ok-soft text-ui-ok" },
  proxy: { get label() { return t("servers.siteTypes.proxy"); }, class: "bg-ui-accent-soft text-ui-accent" },
  codeigniter: { label: "CodeIgniter", class: "bg-ui-warn-soft text-ui-warn" },
  php: { label: "PHP", class: "bg-ui-info-soft text-ui-info" },
  static: { get label() { return t("servers.siteTypes.static"); }, class: "bg-ui-subtle text-ui-text" },
  redirect: { label: "Redirect", class: "bg-ui-subtle text-ui-text" },
  folder: { get label() { return t("servers.siteTypes.folder"); }, class: "bg-ui-subtle text-ui-text" },
  unknown: { get label() { return t("servers.siteTypes.unknown"); }, class: "bg-ui-subtle text-ui-text" },
};

// SSL badge: expired / under 14 days red, under 30 days amber, else green.
export const sslState = (site) => {
  if (!site.ssl) return { label: t("servers.ssl.none"), class: "bg-ui-subtle text-ui-text" };
  if (!site.ssl_expires_at) return { label: "SSL", class: "bg-ui-ok-soft text-ui-ok" };
  const days = Math.floor((new Date(site.ssl_expires_at).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: t("servers.ssl.expired"), class: "bg-ui-bad-soft text-ui-bad", days };
  const label = t("servers.ssl.until", {
    date: new Date(site.ssl_expires_at).toLocaleDateString(localeTag(), { day: "numeric", month: "short", year: "numeric" }),
  });
  const withDays = t("servers.ssl.withDays", { label, n: days }, days);
  if (days < 14) return { label: withDays, class: "bg-ui-bad-soft text-ui-bad", days };
  if (days < 30) return { label: withDays, class: "bg-ui-warn-soft text-ui-warn", days };
  return { label, class: "bg-ui-ok-soft text-ui-ok", days };
};

// Clipboard with a fallback for plain-http pages, where navigator.clipboard
// isn't available.
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
};
