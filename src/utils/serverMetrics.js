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
  if (percent === null || percent === undefined) return { color: "#94A3B8", text: "text-gray-500" };
  if (percent >= 90) return { color: "#DC2626", text: "text-red-600" };
  if (percent >= 75) return { color: "#D97706", text: "text-amber-600" };
  return { color: "#0C51D9", text: "text-brand-dark" };
};

export const STATUS = {
  online: { label: "Online", class: "bg-green-50 text-green-700", dot: "#16A34A" },
  offline: { label: "Offline", class: "bg-red-50 text-red-600", dot: "#DC2626" },
  pending: { label: "Menunggu laporan", class: "bg-amber-50 text-amber-700", dot: "#D97706" },
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
  laravel: { label: "Laravel", class: "bg-red-50 text-red-700" },
  wordpress: { label: "WordPress", class: "bg-sky-50 text-sky-700" },
  node: { label: "Node.js", class: "bg-green-50 text-green-700" },
  proxy: { label: "Aplikasi (proxy)", class: "bg-violet-50 text-violet-700" },
  codeigniter: { label: "CodeIgniter", class: "bg-orange-50 text-orange-700" },
  php: { label: "PHP", class: "bg-indigo-50 text-indigo-700" },
  static: { label: "Situs statis", class: "bg-slate-100 text-slate-700" },
  redirect: { label: "Redirect", class: "bg-slate-100 text-slate-600" },
  folder: { label: "Folder", class: "bg-slate-100 text-slate-600" },
  unknown: { label: "Lainnya", class: "bg-slate-100 text-slate-600" },
};

// SSL badge: expired / under 14 days red, under 30 days amber, else green.
export const sslState = (site) => {
  if (!site.ssl) return { label: "Tanpa SSL", class: "bg-slate-100 text-slate-600" };
  if (!site.ssl_expires_at) return { label: "SSL", class: "bg-green-50 text-green-700" };
  const days = Math.floor((new Date(site.ssl_expires_at).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "SSL kedaluwarsa", class: "bg-red-50 text-red-600", days };
  const label = `SSL s/d ${new Date(site.ssl_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  if (days < 14) return { label: `${label} (${days} hari)`, class: "bg-red-50 text-red-600", days };
  if (days < 30) return { label: `${label} (${days} hari)`, class: "bg-amber-50 text-amber-700", days };
  return { label, class: "bg-green-50 text-green-700", days };
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
