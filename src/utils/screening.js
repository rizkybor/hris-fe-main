// Shared labels for Client Screening.
export const SCREENING_STATUS = {
  draft: { label: "Draft", class: "bg-gray-100 text-gray-600" },
  invited: { label: "Invited", class: "bg-sky-50 text-sky-700" },
  new: { label: "New", class: "bg-blue-50 text-[#0C51D9]" },
  in_review: { label: "In Review", class: "bg-amber-50 text-amber-700" },
  reviewed: { label: "Reviewed", class: "bg-violet-50 text-violet-700" },
  won: { label: "Won", class: "bg-green-50 text-green-700" },
  lost: { label: "Lost", class: "bg-red-50 text-red-600" },
};

export const SCREENING_SOURCE = {
  landing: "Website form",
  invite: "Invite link",
  internal: "Filled by team",
};

export const PRICE_UNIT = { once: "", month: " / month", year: " / year" };

export const PRICING_MODE = {
  rate_card: "Rate Card price",
  hourly: "Hours x hourly rate",
  by_quote: "By quote",
};

export const COMPLEXITY = {
  S: { label: "S · Simple", class: "bg-green-50 text-green-700" },
  M: { label: "M · Medium", class: "bg-blue-50 text-[#0C51D9]" },
  L: { label: "L · Large", class: "bg-amber-50 text-amber-700" },
  XL: { label: "XL · Very large", class: "bg-red-50 text-red-600" },
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
