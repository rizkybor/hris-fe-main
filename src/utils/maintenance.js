// Labels and formatting shared by the Maintenance Management screens.

// 7.5 -> "7.5 h", 8 -> "8 h". Hours are stored with two decimals.
export const formatHours = (hours, unit = "h") => {
  if (hours === null || hours === undefined || hours === "") return "-";
  const value = Math.round(Number(hours) * 100) / 100;
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${unit}`;
};

export const formatMonth = (month) =>
  month ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "-";

export const CONTRACT_STATUS = {
  active: { label: "Active", class: "bg-green-50 text-green-700" },
  paused: { label: "Paused", class: "bg-amber-50 text-amber-700" },
  ended: { label: "Ended", class: "bg-gray-100 text-gray-500" },
};

// What happens to a month's unused hours.
export const LEFTOVER_POLICY = {
  bank: { label: "Move to Development Balance", short: "To balance" },
  rollover: { label: "Roll over to next month", short: "Roll over" },
  expire: { label: "Expire", short: "Expire" },
};

export const LOG_CATEGORIES = [
  { value: "bug_fix", label: "Bug fix" },
  { value: "content_update", label: "Content update" },
  { value: "minor_feature", label: "Minor feature" },
  { value: "server", label: "Server & infrastructure" },
  { value: "consultation", label: "Consultation" },
  { value: "other", label: "Other" },
];
export const categoryLabel = (value) => LOG_CATEGORIES.find((c) => c.value === value)?.label || value || "-";

export const FEATURE_STATUS = {
  proposed: { label: "Proposed", class: "bg-gray-100 text-gray-600" },
  approved: { label: "Approved", class: "bg-blue-50 text-[#0C51D9]" },
  in_progress: { label: "In progress", class: "bg-amber-50 text-amber-700" },
  done: { label: "Done", class: "bg-green-50 text-green-700" },
  cancelled: { label: "Cancelled", class: "bg-gray-100 text-gray-400" },
};

export const BANK_ENTRY_TYPE = {
  leftover: "Month leftover",
  adjust_in: "Top-up",
  refund: "Feature refund",
  feature: "New feature",
  adjust_out: "Deduction",
  expire: "Expired",
};

// Bar colour: blue, amber from 75%, red once over quota.
export const usageColor = (period) => {
  if (!period) return "#CBD5E1";
  if (period.overage > 0) return "#DC2626";
  if (period.used_percent >= 75) return "#D97706";
  return "#0C51D9";
};

// How a closed month's leftover was handled, for the history table.
export const leftoverResult = (period) => {
  if (!period.is_closed) return "Open";
  if (!period.leftover_hours) return "Fully used";
  if (period.leftover_applied === "bank") {
    const banked = period.leftover_banked_hours || 0;
    return banked < period.leftover_hours
      ? `${formatHours(banked)} to balance · ${formatHours(period.leftover_hours - banked)} expired (cap)`
      : `${formatHours(banked)} to balance`;
  }
  if (period.leftover_applied === "rollover") return `${formatHours(period.leftover_hours)} rolled over`;
  return `${formatHours(period.leftover_hours)} expired`;
};
