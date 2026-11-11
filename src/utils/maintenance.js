import { uiColor } from "@/utils/uiColor";
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
  active: { label: "Active", class: "bg-ui-ok-soft text-ui-ok" },
  paused: { label: "Paused", class: "bg-ui-warn-soft text-ui-warn" },
  ended: { label: "Ended", class: "bg-ui-subtle text-ui-muted" },
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
  proposed: { label: "Proposed", class: "bg-ui-subtle text-ui-text" },
  approved: { label: "Approved", class: "bg-ui-accent-soft text-ui-accent" },
  in_progress: { label: "In progress", class: "bg-ui-warn-soft text-ui-warn" },
  done: { label: "Done", class: "bg-ui-ok-soft text-ui-ok" },
  cancelled: { label: "Cancelled", class: "bg-ui-subtle text-ui-faint" },
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
  if (!period) return uiColor("line-strong");
  if (period.overage > 0) return uiColor("bad");
  if (period.used_percent >= 75) return uiColor("warn");
  return uiColor("accent");
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
