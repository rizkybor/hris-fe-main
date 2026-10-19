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
