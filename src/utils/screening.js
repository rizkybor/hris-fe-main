// Shared labels for Client Screening. Labels are getters so they follow
// the interface language each time they are read.
import { t } from "@/i18n";

export const SCREENING_STATUS = {
  draft: { get label() { return t("screening.status.draft"); }, class: "bg-gray-100 text-gray-600" },
  invited: { get label() { return t("screening.status.invited"); }, class: "bg-sky-50 text-sky-700" },
  new: { get label() { return t("screening.status.new"); }, class: "bg-blue-50 text-[#0C51D9]" },
  in_review: { get label() { return t("screening.status.in_review"); }, class: "bg-amber-50 text-amber-700" },
  reviewed: { get label() { return t("screening.status.reviewed"); }, class: "bg-violet-50 text-violet-700" },
  won: { get label() { return t("screening.status.won"); }, class: "bg-green-50 text-green-700" },
  lost: { get label() { return t("screening.status.lost"); }, class: "bg-red-50 text-red-600" },
};

export const SCREENING_SOURCE = {
  get landing() { return t("screening.source.landing"); },
  get invite() { return t("screening.source.invite"); },
  get internal() { return t("screening.source.internal"); },
};

export const PRICE_UNIT = {
  once: "",
  get month() { return t("screening.priceUnit.month"); },
  get year() { return t("screening.priceUnit.year"); },
};

export const PRICING_MODE = {
  get rate_card() { return t("screening.pricingMode.rate_card"); },
  get hourly() { return t("screening.pricingMode.hourly"); },
  get by_quote() { return t("screening.pricingMode.by_quote"); },
};

export const COMPLEXITY = {
  S: { get label() { return t("screening.complexity.S"); }, class: "bg-green-50 text-green-700" },
  M: { get label() { return t("screening.complexity.M"); }, class: "bg-blue-50 text-[#0C51D9]" },
  L: { get label() { return t("screening.complexity.L"); }, class: "bg-amber-50 text-amber-700" },
  XL: { get label() { return t("screening.complexity.XL"); }, class: "bg-red-50 text-red-600" },
};

// Is a section/question shown for these answers? Mirrors
// ScreeningRecommender::isVisible() on the API.
export const isVisible = (showIf, answers) => {
  if (!showIf) return true;
  const value = answers?.[showIf.question];
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  if (showIf.includes) return [].concat(showIf.includes).some((v) => values.includes(v));
  if ("equals" in showIf) return values.includes(showIf.equals);
  return true;
};
