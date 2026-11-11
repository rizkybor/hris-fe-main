import { uiColor } from "@/utils/uiColor";
import { t, localeTag } from "@/i18n";
// Labels and formatting shared by the Maintenance Management screens.
// Labels are getters so they follow the interface language each time
// they are read.

// 7.5 -> "7.5 h", 8 -> "8 h". Hours are stored with two decimals.
export const formatHours = (hours, unit = t("maintenance.hourUnit")) => {
  if (hours === null || hours === undefined || hours === "") return "-";
  const value = Math.round(Number(hours) * 100) / 100;
  return `${value.toLocaleString(localeTag(), { maximumFractionDigits: 2 })} ${unit}`;
};

export const formatMonth = (month) =>
  month ? new Date(`${month}-01T00:00:00`).toLocaleDateString(localeTag(), { month: "long", year: "numeric" }) : "-";

export const CONTRACT_STATUS = {
  active: { get label() { return t("maintenance.contractStatus.active"); }, class: "bg-ui-ok-soft text-ui-ok" },
  paused: { get label() { return t("maintenance.contractStatus.paused"); }, class: "bg-ui-warn-soft text-ui-warn" },
  ended: { get label() { return t("maintenance.contractStatus.ended"); }, class: "bg-ui-subtle text-ui-muted" },
};

// What happens to a month's unused hours.
const policy = (key) => ({
  get label() { return t(`maintenance.leftoverPolicy.${key}`); },
  get short() { return t(`maintenance.leftoverPolicy.${key}Short`); },
});
export const LEFTOVER_POLICY = {
  bank: policy("bank"),
  rollover: policy("rollover"),
  expire: policy("expire"),
};

const category = (value) => ({ value, get label() { return t(`maintenance.categories.${value}`); } });
export const LOG_CATEGORIES = [
  category("bug_fix"),
  category("content_update"),
  category("minor_feature"),
  category("server"),
  category("consultation"),
  category("other"),
];
export const categoryLabel = (value) => LOG_CATEGORIES.find((c) => c.value === value)?.label || value || "-";

export const FEATURE_STATUS = {
  proposed: { get label() { return t("maintenance.featureStatus.proposed"); }, class: "bg-ui-subtle text-ui-text" },
  approved: { get label() { return t("maintenance.featureStatus.approved"); }, class: "bg-ui-accent-soft text-ui-accent" },
  in_progress: { get label() { return t("maintenance.featureStatus.in_progress"); }, class: "bg-ui-warn-soft text-ui-warn" },
  done: { get label() { return t("maintenance.featureStatus.done"); }, class: "bg-ui-ok-soft text-ui-ok" },
  cancelled: { get label() { return t("maintenance.featureStatus.cancelled"); }, class: "bg-ui-subtle text-ui-faint" },
};

export const BANK_ENTRY_TYPE = {
  get leftover() { return t("maintenance.bankEntry.leftover"); },
  get adjust_in() { return t("maintenance.bankEntry.adjust_in"); },
  get refund() { return t("maintenance.bankEntry.refund"); },
  get feature() { return t("maintenance.bankEntry.feature"); },
  get adjust_out() { return t("maintenance.bankEntry.adjust_out"); },
  get expire() { return t("maintenance.bankEntry.expire"); },
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
  if (!period.is_closed) return t("maintenance.leftoverResult.open");
  if (!period.leftover_hours) return t("maintenance.leftoverResult.fullyUsed");
  if (period.leftover_applied === "bank") {
    const banked = period.leftover_banked_hours || 0;
    return banked < period.leftover_hours
      ? t("maintenance.leftoverResult.toBalanceCapped", { banked: formatHours(banked), expired: formatHours(period.leftover_hours - banked) })
      : t("maintenance.leftoverResult.toBalance", { banked: formatHours(banked) });
  }
  if (period.leftover_applied === "rollover") return t("maintenance.leftoverResult.rolledOver", { hours: formatHours(period.leftover_hours) });
  return t("maintenance.leftoverResult.expired", { hours: formatHours(period.leftover_hours) });
};
