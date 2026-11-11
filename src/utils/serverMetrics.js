import { uiColor } from "@/utils/uiColor";
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

export const STATUS = {
  online: { label: "Online", class: "bg-ui-ok-soft text-ui-ok", dot: uiColor("ok") },
  offline: { label: "Offline", class: "bg-ui-bad-soft text-ui-bad", dot: uiColor("bad") },
  pending: { label: "Menunggu laporan", class: "bg-ui-warn-soft text-ui-warn", dot: uiColor("warn") },
};

export const timeAgo = (value) => {
  if (!value) return "belum pernah";
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "baru saja";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`;
  return `${Math.floor(seconds / 86400)} hari lalu`;
};

export const formatUptime = (seconds) => {
  if (!seconds && seconds !== 0) return "-";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days} hari ${hours} jam` : `${hours} jam ${Math.floor((seconds % 3600) / 60)} menit`;
};

// Kinds of site the agent recognises from the web server config.
export const SITE_TYPES = {
  laravel: { label: "Laravel", class: "bg-ui-bad-soft text-ui-bad" },
  wordpress: { label: "WordPress", class: "bg-ui-info-soft text-ui-info" },
  node: { label: "Node.js", class: "bg-ui-ok-soft text-ui-ok" },
  proxy: { label: "Aplikasi (proxy)", class: "bg-ui-accent-soft text-ui-accent" },
  codeigniter: { label: "CodeIgniter", class: "bg-ui-warn-soft text-ui-warn" },
  php: { label: "PHP", class: "bg-ui-info-soft text-ui-info" },
  static: { label: "Situs statis", class: "bg-ui-subtle text-ui-text" },
  redirect: { label: "Redirect", class: "bg-ui-subtle text-ui-text" },
  folder: { label: "Folder", class: "bg-ui-subtle text-ui-text" },
  unknown: { label: "Lainnya", class: "bg-ui-subtle text-ui-text" },
};

// SSL badge: expired / under 14 days red, under 30 days amber, else green.
export const sslState = (site) => {
  if (!site.ssl) return { label: "Tanpa SSL", class: "bg-ui-subtle text-ui-text" };
  if (!site.ssl_expires_at) return { label: "SSL", class: "bg-ui-ok-soft text-ui-ok" };
  const days = Math.floor((new Date(site.ssl_expires_at).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "SSL kedaluwarsa", class: "bg-ui-bad-soft text-ui-bad", days };
  const label = `SSL s/d ${new Date(site.ssl_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  if (days < 14) return { label: `${label} (${days} hari)`, class: "bg-ui-bad-soft text-ui-bad", days };
  if (days < 30) return { label: `${label} (${days} hari)`, class: "bg-ui-warn-soft text-ui-warn", days };
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
