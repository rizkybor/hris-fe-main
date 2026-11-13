import { DateTime } from "luxon";
import { t, localeTag } from "@/i18n";

// Labels are getters so they follow the interface language; the values,
// class maps and shapes stay the same.
const translatedMap = (keys) => {
  const map = {};
  for (const [name, key] of Object.entries(keys)) {
    Object.defineProperty(map, name, { get: () => t(key), enumerable: true });
  }
  return map;
};

export const TYPE_OPTIONS = [
  { value: "lifetime", get label() { return t("licenses.type.lifetime"); } },
  { value: "term", get label() { return t("licenses.type.term"); } },
];

// Plans a license can have.
export const PLAN_OPTIONS = [
  {
    value: "trial",
    get label() { return t("licenses.plans.trial.label"); },
    get note() { return t("licenses.plans.trial.note"); },
    category: "individual",
    defaultMaxDevices: 1,
  },
  {
    value: "professional",
    get label() { return t("licenses.plans.professional.label"); },
    get note() { return t("licenses.plans.professional.note"); },
    category: "individual",
    defaultMaxDevices: 2,
  },
  {
    value: "lifetime",
    get label() { return t("licenses.plans.lifetime.label"); },
    get note() { return t("licenses.plans.lifetime.note"); },
    category: "individual",
    defaultMaxDevices: 5,
  },
  {
    value: "organization",
    get label() { return t("licenses.plans.organization.label"); },
    get note() { return t("licenses.plans.organization.note"); },
    category: "organization",
    defaultMaxDevices: 10,
  },
];

const planOption = (value) => PLAN_OPTIONS.find((p) => p.value === value);


// Picker layout: Individual (Trial, Professional, Lifetime) and Organization.
export const PLAN_GROUPS = [
  { get label() { return t("licenses.category.individual"); }, plans: ["trial", "professional", "lifetime"].map(planOption) },
  { get label() { return t("licenses.category.organization"); }, plans: [planOption("organization")] },
];

export const PLATFORM_OPTIONS = [
  { value: "mac", label: "Mac", note: "macOS", plans: ["trial", "professional", "lifetime", "organization"] },
  { value: "ipad", label: "iPad", get note() { return t("licenses.platform.ipadNote"); }, plans: ["professional", "lifetime", "organization"] },
];

// Create-only choice: a Mac and an iPad key generated together (one
// bundle, same licensee / plan / period). Not for Trial.
export const PLATFORM_BOTH = "both";
export const PLATFORM_CHOICES = [
  ...PLATFORM_OPTIONS,
  { value: PLATFORM_BOTH, label: "Mac + iPad", get note() { return t("licenses.platform.bothNote"); }, plans: ["professional", "lifetime", "organization"] },
];

const platformOption = (value) => PLATFORM_CHOICES.find((p) => p.value === value);

// The platforms a choice stands for ("both" = Mac and iPad).
export const platformsOf = (choice) => (choice === PLATFORM_BOTH ? ["mac", "ipad"] : [normalizePlatform(choice)]);

export const normalizePlatform = (platform) => (platformOption(platform) ? platform : "mac");

// Mac / iPad of a license (not the device's reported OS: see platformLabel).
export const licensePlatformLabel = (license) =>
  license?.platform_label || platformOption(license?.platform)?.label || "Mac";

export const planAllowedOn = (platform, plan) => !!platformOption(normalizePlatform(platform))?.plans.includes(plan);

// PLAN_GROUPS without the plans a platform does not sell (empty groups dropped).
export const planGroupsFor = (platform) =>
  PLAN_GROUPS.map((group) => ({ ...group, plans: group.plans.filter((plan) => planAllowedOn(platform, plan.value)) })).filter(
    (group) => group.plans.length
  );

export const PLATFORM_CHIP = {
  mac: "bg-ui-subtle text-ui-text",
  ipad: "bg-ui-accent-soft text-ui-accent",
  both: "bg-ui-surface text-ui-ink border border-ui-line",
};

export const platformChipClass = (platform) => PLATFORM_CHIP[normalizePlatform(platform)];

export const CATEGORY_LABELS = translatedMap({
  individual: "licenses.category.individual",
  organization: "licenses.category.organization",
});

// Older records may still carry the draft value "pro".
export const normalizePlan = (plan) => (plan === "pro" ? "professional" : plan || "professional");

export const planLabel = (license) =>
  planOption(normalizePlan(license?.plan))?.label || license?.plan_label || license?.plan || "-";

export const planCategory = (license) =>
  license?.category || planOption(normalizePlan(license?.plan))?.category || "individual";

export const categoryLabel = (license) => CATEGORY_LABELS[planCategory(license)] || "-";

export const planDefaultMaxDevices = (plan) => planOption(plan)?.defaultMaxDevices ?? 2;

const PLAN_CHIP = {
  trial: "bg-ui-subtle text-ui-text",
  professional: "bg-ui-accent-soft text-ui-accent",
  lifetime: "bg-ui-ink text-white",
  organization: "bg-ui-surface text-ui-ink border border-ui-line-strong",
};

const PLAN_CHIP_DARK = {
  trial: "bg-white/10 text-white/80",
  professional: "bg-white/15 text-white",
  lifetime: "bg-white text-ui-ink-fill",
  organization: "bg-transparent text-white border border-white/30",
};

export const planChipClass = (plan, dark = false) =>
  (dark ? PLAN_CHIP_DARK : PLAN_CHIP)[normalizePlan(plan)] ||
  (dark ? "bg-white/10 text-white/80" : "bg-ui-subtle text-ui-text");

// Solid plan colours (same hues as the chips) for bars and legend dots.
const PLAN_BAR = {
  trial: "bg-ui-faint",
  professional: "bg-ui-accent",
  lifetime: "bg-ui-ink",
  organization: "bg-ui-accent/40",
};

export const planBarClass = (plan) => PLAN_BAR[normalizePlan(plan)] || "bg-ui-line-strong";

export const PLATFORM_CODES = { mac: "3", ipad: "5" };
export const PLAN_DIGITS = { trial: "1", professional: "2", lifetime: "3", organization: "4" };

export const planCode = (plan, platform = "mac") =>
  `${PLATFORM_CODES[normalizePlatform(platform)]}${PLAN_DIGITS[normalizePlan(plan)] || "0"}`;

export const padSequence = (n) => String(Math.max(1, Number(n) || 1)).padStart(4, "0");

// Preview of the next key: "OC32-XXXX-XXXX-XXXX-0007".
export const keyPreview = (prefix, plan, sequence = 1, platform = "mac") =>
  `${String(prefix || "XX").toUpperCase()}${planCode(plan, platform)}-XXXX-XXXX-XXXX-${padSequence(sequence)}`;

// Example for a product, e.g. "OC31-XXXX-XXXX-XXXX-0001".
export const keyExample = (prefix) => keyPreview(prefix, "trial", 1);

// List masking: first and last group visible, "OC32-••••-••••-••••-0001".
export const maskLicenseKey = (key) => {
  const parts = String(key || "").split("-");
  if (parts.length < 3) return key || "-";
  return [parts[0], ...parts.slice(1, -1).map(() => "••••"), parts[parts.length - 1]].join("-");
};

export const planType = (plan) => (normalizePlan(plan) === "lifetime" ? "lifetime" : "term");

export const DURATION_OPTIONS = [
  { value: "14_days", get label() { return t("licenses.duration.days14"); } },
  { value: "30_days", get label() { return t("licenses.duration.days30"); } },
  { value: "6_months", get label() { return t("licenses.duration.months6"); } },
  { value: "1_year", get label() { return t("licenses.duration.year1"); } },
  { value: "custom", get label() { return t("licenses.duration.custom"); } },
];

const durationOption = (value) => DURATION_OPTIONS.find((d) => d.value === value);

// Duration presets per plan: the main ones first, then the shorter extras.
export const durationOptionsFor = (plan) => {
  if (normalizePlan(plan) === "trial") {
    return { primary: ["14_days", "30_days", "custom"].map(durationOption), secondary: [] };
  }
  return {
    primary: ["6_months", "1_year", "custom"].map(durationOption),
    secondary: ["14_days", "30_days"].map(durationOption),
  };
};

export const defaultDurationFor = (plan) => (normalizePlan(plan) === "trial" ? "14_days" : "1_year");

export const ORGANIZATION_TYPE_OPTIONS = [
  { value: "team", get label() { return t("licenses.orgType.team"); } },
  { value: "community", get label() { return t("licenses.orgType.community"); } },
  { value: "club", get label() { return t("licenses.orgType.club"); } },
  { value: "federation", get label() { return t("licenses.orgType.federation"); } },
];

export const organizationTypeLabel = (value) =>
  ORGANIZATION_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || "-";

export const DEFAULT_COUNTRY = "Indonesia";

export const REGION_CODE_FIELDS = ["province_code", "regency_code", "district_code", "village_code"];
export const LOCATION_FIELDS = [
  "country",
  "province",
  "regency",
  "district",
  "village",
  "postal_code",
  ...REGION_CODE_FIELDS,
  "address",
];
export const SHARED_FIELDS = ["licensee_name", "licensee_email", "phone", ...LOCATION_FIELDS];
export const INDIVIDUAL_FIELDS = ["occupation", "affiliation"];
export const ORGANIZATION_FIELDS = [
  "organization_type",
  "contact_name",
  "contact_position",
  "website",
  "tax_id",
  "member_count",
];

// Required apart from the location (see requiredFields()).
export const REQUIRED_FIELDS = {
  individual: ["licensee_name", "licensee_email", "phone"],
  organization: ["licensee_name", "organization_type", "contact_name", "licensee_email", "phone"],
};

export const isIndonesia = (country) => String(country || "").trim().toLowerCase() === "indonesia";

export const requiredLocationFields = (category, country) => {
  const fields = isIndonesia(country)
    ? ["country", "province_code", "regency_code", "district_code", "village_code", "postal_code"]
    : ["country", "province", "regency", "postal_code"];
  if (category === "organization") fields.push("address");
  return fields;
};

export const requiredFields = (category, country) => [
  ...REQUIRED_FIELDS[category],
  ...requiredLocationFields(category, country),
];

// "Jl. ..., Gambir, Gambir, Kota Administrasi Jakarta Pusat, DKI Jakarta 10110, Indonesia"
export const formatAddress = (value) => {
  if (!value) return "";
  const provincePostal = [value.province, value.postal_code].filter((p) => String(p || "").trim()).join(" ");
  return [value.address, value.village, value.district, value.regency, provincePostal, value.country]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(", ");
};

export const categoryOfPlan = (plan) => planOption(normalizePlan(plan))?.category || "individual";

export const categoryFields = (category) =>
  category === "organization" ? ORGANIZATION_FIELDS : INDIVIDUAL_FIELDS;

export const otherCategoryFields = (category) =>
  category === "organization" ? INDIVIDUAL_FIELDS : ORGANIZATION_FIELDS;

export const isRequiredField = (category, field, country = DEFAULT_COUNTRY) =>
  requiredFields(category, country).includes(field);

export const STATUS_OPTIONS = [
  { value: "active", get label() { return t("licenses.status.active"); } },
  { value: "expiring_soon", get label() { return t("licenses.status.expiringSoon"); } },
  { value: "expired", get label() { return t("licenses.status.expired"); } },
  { value: "inactive", get label() { return t("licenses.status.inactive"); } },
];

export const SORT_OPTIONS = [
  { value: "", get label() { return t("licenses.sort.newest"); } },
  { value: "expires_at:asc", get label() { return t("licenses.sort.expiresSoonest"); } },
  { value: "expires_at:desc", get label() { return t("licenses.sort.expiresLatest"); } },
];

export const EXPIRING_SOON_DAYS = 14;

const PLATFORM_LABELS = {
  ios: "iPadOS",
  ipados: "iPadOS",
  ipad: "iPadOS",
  macos: "macOS",
  mac: "macOS",
  maccatalyst: "macOS (Catalyst)",
  mac_catalyst: "macOS (Catalyst)",
};

// In the browser's timezone, month names in the interface language.
export const formatDate = (value, format = "dd MMM yyyy") =>
  value ? DateTime.fromISO(value, { zone: "utc" }).toLocal().setLocale(localeTag()).toFormat(format) : "-";

export const formatDateTime = (value) => formatDate(value, "dd MMM yyyy HH:mm");

export const platformLabel = (platform) =>
  PLATFORM_LABELS[String(platform || "").toLowerCase()] || platform || "-";

// A license is expired when it is a term license whose expiry is in the past.
// The server may also send status === "expired"; either is enough.
export const isExpired = (license) => {
  if (!license) return false;
  if (license.status === "expired" || license.is_expired === true) return true;
  if (license.type !== "term" || !license.expires_at) return false;
  return DateTime.fromISO(license.expires_at) < DateTime.now();
};

// Local calendar date (yyyy-MM-dd) for an <input type="date">.
export const toDateInput = (value) =>
  value ? DateTime.fromISO(value).toLocal().toISODate() : "";

// Client-side preview of a preset duration counted from today; the server
// computes the authoritative expiry.
export const previewExpiry = (duration) => {
  const now = DateTime.now();
  const fmt = (date) => date.setLocale(localeTag()).toFormat("dd MMM yyyy");
  if (duration === "14_days") return fmt(now.plus({ days: 14 }));
  if (duration === "30_days") return fmt(now.plus({ days: 30 }));
  if (duration === "6_months") return fmt(now.plus({ months: 6 }));
  if (duration === "1_year") return fmt(now.plus({ years: 1 }));
  return null;
};

export const licenseToForm = (license) => {
  const plan = normalizePlan(license?.plan);
  const hasExpiry = license?.type === "term" && !!license?.expires_at;

  return {
    platform: normalizePlatform(license?.platform),
    plan,
    type: planType(plan),
    licensee_name: license?.licensee_name || "",
    licensee_email: license?.licensee_email || "",
    phone: license?.phone || "",
    country: license ? license.country || "" : DEFAULT_COUNTRY,
    province: license?.province || "",
    regency: license?.regency || "",
    district: license?.district || "",
    village: license?.village || "",
    postal_code: license?.postal_code || "",
    province_code: license?.province_code || "",
    regency_code: license?.regency_code || "",
    district_code: license?.district_code || "",
    village_code: license?.village_code || "",
    occupation: license?.occupation || "",
    affiliation: license?.affiliation || "",
    organization_type: license?.organization_type || "",
    contact_name: license?.contact_name || "",
    contact_position: license?.contact_position || "",
    address: license?.address || "",
    website: license?.website || "",
    tax_id: license?.tax_id || "",
    member_count: license?.member_count ?? "",
    duration: hasExpiry ? "custom" : defaultDurationFor(plan),
    expires_at: hasExpiry ? toDateInput(license.expires_at) : "",
    max_devices: license?.max_devices ?? planDefaultMaxDevices(plan),
    // per_device: one unique key per device (new licenses default to it);
    // shared: one key for every device. Fixed after create.
    key_mode: license?.key_mode || "per_device",
    // Lifetime only: the major version the license covers (blank = the
    // product's current major, filled in by the API).
    updates_major: license?.updates_major ?? "",
    notes: license?.notes || "",
    is_active: license ? !!license.is_active : true,
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Same as the API: 6-20 characters of digits, spaces, "+" and "-".
export const PHONE_RE = /^[0-9+\- ]{6,20}$/;

const isUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Keys under licenses.validation.required (per category where it differs).
const REQUIRED_MESSAGES = {
  licensee_name: { individual: "fullName", organization: "organizationName" },
  licensee_email: { individual: "email", organization: "contactEmail" },
  phone: { individual: "phone", organization: "contactPhone" },
  country: "country",
  province: "province",
  regency: "city",
  postal_code: "postalCode",
  province_code: "provinceCode",
  regency_code: "regencyCode",
  district_code: "districtCode",
  village_code: "villageCode",
  organization_type: "organizationType",
  contact_name: "contactName",
  address: "address",
};

const requiredMessage = (field, category) => {
  const msg = REQUIRED_MESSAGES[field];
  const key = typeof msg === "string" ? msg : msg?.[category] || "generic";
  return t(`licenses.validation.required.${key}`);
};

// Client-side checks mirroring the API rules; returns {field: message}.
export const validateLicenseForm = (form) => {
  const errors = {};
  const category = categoryOfPlan(form.plan);
  const blank = (v) => v === null || v === undefined || String(v).trim() === "";

  if (!PLATFORM_CHOICES.some((p) => p.value === form.platform)) errors.platform = t("licenses.validation.platform");
  if (!PLAN_OPTIONS.some((p) => p.value === form.plan)) errors.plan = t("licenses.validation.plan");
  else if (!errors.platform && !planAllowedOn(form.platform, form.plan))
    errors.plan = t("licenses.validation.planNotOnPlatform", {
      plan: planOption(form.plan).label,
      platform: platformOption(form.platform).label,
    });

  for (const field of requiredFields(category, form.country)) {
    if (blank(form[field])) errors[field] = requiredMessage(field, category);
  }
  if (!errors.postal_code && !blank(form.postal_code)) {
    const postal = String(form.postal_code).trim();
    if (isIndonesia(form.country) ? !/^[0-9]{5}$/.test(postal) : !/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(postal))
      errors.postal_code = isIndonesia(form.country) ? t("licenses.validation.postalCodeId") : t("licenses.validation.postalCodeOther");
  }

  if (!errors.licensee_email && !EMAIL_RE.test(String(form.licensee_email).trim()))
    errors.licensee_email = t("licenses.validation.email");
  if (!errors.phone && !PHONE_RE.test(String(form.phone).trim()))
    errors.phone = t("licenses.validation.phone");

  if (category === "organization") {
    if (!blank(form.website) && !isUrl(String(form.website).trim()))
      errors.website = t("licenses.validation.website");
    if (!blank(form.member_count)) {
      const n = Number(form.member_count);
      if (!Number.isInteger(n) || n < 1) errors.member_count = t("licenses.validation.memberCount");
    }
  }

  if (planType(form.plan) === "term") {
    if (!form.duration) errors.duration = t("licenses.validation.duration");
    if (form.duration === "custom" && !form.expires_at) errors.expires_at = t("licenses.validation.expiresAt");
  }

  if (planType(form.plan) === "lifetime" && !blank(form.updates_major)) {
    const major = Number(form.updates_major);
    if (!Number.isInteger(major) || major < 1 || major > 99) errors.updates_major = t("licenses.validation.updatesMajor");
  }

  const max = Number(form.max_devices);
  if (!Number.isInteger(max) || max < 1 || max > 100) errors.max_devices = t("licenses.validation.maxDevices");
  return errors;
};

// 422 responses carry {field: [messages]}; anything else has no field errors.
export const validationErrors = (error) =>
  error?.response?.status === 422 ? error.response.data?.errors || {} : {};

export const isLifetimeLicense = (license) => license?.type === "lifetime" || !license?.expires_at;

export const remainingLabel = (days) => {
  if (days === null || days === undefined) return t("licenses.plans.lifetime.label");
  if (days <= 0) return t("licenses.status.expired");
  return t("licenses.period.daysLeft", { n: days }, days);
};

// Badge colour for the remaining-days column.
export const remainingBadgeClass = (license) => {
  if (isLifetimeLicense(license)) return "bg-ui-accent-soft text-ui-accent";
  if (license.status === "expired" || license.remaining_days === 0) return "bg-ui-bad-soft text-ui-bad";
  if (license.status === "expiring_soon") return "bg-ui-warn-soft text-ui-warn";
  if (license.status === "inactive") return "bg-ui-subtle text-ui-muted";
  return "bg-ui-ok-soft text-ui-ok";
};

export const formatDuration = (days) => {
  if (days === null || days === undefined) return "-";
  if (days >= 365 && days % 365 <= 2) {
    const years = Math.round(days / 365);
    return t("licenses.period.yearsWithDays", { n: years, days }, years);
  }
  if (days >= 28) {
    const months = Math.round(days / 30.44);
    return t("licenses.period.monthsWithDays", { n: months, days }, months);
  }
  return t("licenses.period.days", { n: days }, days);
};

// "2 hours ago", "in 3 days".
export const relativeTime = (value) =>
  value ? DateTime.fromISO(value).toRelative({ locale: localeTag() }) || "-" : "-";

// tone: badge colour; group: used by the timeline filter.
export const EVENT_TYPES = {
  created: { get label() { return t("licenses.events.created"); }, tone: "violet", group: "Admin" },
  updated: { get label() { return t("licenses.events.updated"); }, tone: "blue", group: "Admin" },
  activated_by_admin: { get label() { return t("licenses.events.activatedByAdmin"); }, tone: "emerald", group: "Admin" },
  deactivated_by_admin: { get label() { return t("licenses.events.deactivatedByAdmin"); }, tone: "gray", group: "Admin" },
  extended: { get label() { return t("licenses.events.extended"); }, tone: "indigo", group: "Admin" },
  plan_changed: { get label() { return t("licenses.events.planChanged"); }, tone: "fuchsia", group: "Admin" },
  device_released_by_admin: { get label() { return t("licenses.events.deviceReleasedByAdmin"); }, tone: "amber", group: "Admin" },
  deleted: { get label() { return t("licenses.events.deleted"); }, tone: "red", group: "Admin" },
  certificate_downloaded: { get label() { return t("licenses.events.certificateDownloaded"); }, tone: "violet", group: "Admin" },
  certificate_emailed: { get label() { return t("licenses.events.certificateEmailed"); }, tone: "violet", group: "Admin" },
  certificate_shared_whatsapp: { get label() { return t("licenses.events.certificateSharedWhatsapp"); }, tone: "emerald", group: "Admin" },
  certificate_link_opened: { get label() { return t("licenses.events.certificateLinkOpened"); }, tone: "sky", group: "App" },
  device_activated: { get label() { return t("licenses.events.deviceActivated"); }, tone: "emerald", group: "App" },
  device_reactivated: { get label() { return t("licenses.events.deviceReactivated"); }, tone: "teal", group: "App" },
  refreshed: { get label() { return t("licenses.events.refreshed"); }, tone: "sky", group: "App" },
  device_released: { get label() { return t("licenses.events.deviceReleased"); }, tone: "amber", group: "App" },
  app_updated: { get label() { return t("licenses.events.appUpdated"); }, tone: "indigo", group: "App" },
  denied_device_limit: { get label() { return t("licenses.events.deniedDeviceLimit"); }, tone: "red", group: "Denied" },
  denied_inactive: { get label() { return t("licenses.events.deniedInactive"); }, tone: "red", group: "Denied" },
  denied_expired: { get label() { return t("licenses.events.deniedExpired"); }, tone: "red", group: "Denied" },
  denied_wrong_platform: { get label() { return t("licenses.events.deniedWrongPlatform"); }, tone: "red", group: "Denied" },
  denied_key_used: { get label() { return t("licenses.events.deniedKeyUsed"); }, tone: "red", group: "Denied" },
  denied_key_in_use: { get label() { return t("licenses.events.deniedKeyInUse"); }, tone: "red", group: "Denied" },
  denied_key_replaced: { get label() { return t("licenses.events.deniedKeyReplaced"); }, tone: "red", group: "Denied" },
};

// Key modes, offered on create only.
export const KEY_MODE_OPTIONS = [
  {
    value: "per_device",
    get label() { return t("licenses.keyMode.perDevice.label"); },
    get note() { return t("licenses.keyMode.perDevice.note"); },
  },
  {
    value: "shared",
    get label() { return t("licenses.keyMode.shared.label"); },
    get note() { return t("licenses.keyMode.shared.note"); },
  },
];

export const certificateKeyOptions = (license) => {
  if (license?.key_mode !== "per_device") return [];
  const members = [
    { platform: license.platform, platform_label: license.platform_label, keys: license.keys || [] },
    ...(license.bundle || []).map((b) => ({ platform: b.platform, platform_label: b.platform_label, keys: b.keys || [] })),
  ].sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0));
  return members.flatMap((m) =>
    m.keys
      .filter((k) => k.status !== "used")
      .map((k) => ({ ...k, platform: m.platform, platform_label: m.platform_label, total: m.keys.length }))
  );
};

// Per-device key status: label + dot/text classes.
export const KEY_STATUS = {
  available: { get label() { return t("licenses.keyStatus.available"); }, dot: "bg-ui-ok", text: "text-ui-ok", chip: "bg-ui-ok-soft text-ui-ok" },
  in_use: { get label() { return t("licenses.keyStatus.inUse"); }, dot: "bg-ui-accent", text: "text-ui-accent", chip: "bg-ui-accent-soft text-ui-accent" },
  used: { get label() { return t("licenses.keyStatus.used"); }, dot: "bg-ui-faint", text: "text-ui-muted", chip: "bg-ui-subtle text-ui-muted" },
};

const QUIET = "bg-ui-subtle text-ui-muted ring-ui-line";
export const EVENT_TONE_CLASS = {
  violet: "bg-ui-accent-soft text-ui-accent ring-ui-accent/15",
  blue: "bg-ui-accent-soft text-ui-accent ring-ui-accent/15",
  indigo: QUIET,
  fuchsia: QUIET,
  teal: QUIET,
  sky: QUIET,
  gray: QUIET,
  emerald: "bg-ui-ok-soft text-ui-ok ring-ui-ok/15",
  amber: "bg-ui-warn-soft text-ui-warn ring-ui-warn/15",
  red: "bg-ui-bad-soft text-ui-bad ring-ui-bad/15",
};

export const eventLabel = (event) => EVENT_TYPES[event?.event]?.label || event?.label || event?.event || "-";

export const eventToneClass = (event) => EVENT_TONE_CLASS[EVENT_TYPES[event?.event]?.tone] || EVENT_TONE_CLASS.gray;

// Readable field names for the "updated" diff.
export const FIELD_LABELS = translatedMap({
  licensee_name: "licenses.fields.licenseeName",
  licensee_email: "licenses.fields.licenseeEmail",
  phone: "licenses.fields.phone",
  country: "licenses.fields.country",
  province: "licenses.fields.province",
  regency: "licenses.fields.regency",
  district: "licenses.fields.district",
  village: "licenses.fields.village",
  postal_code: "licenses.fields.postalCode",
  province_code: "licenses.fields.provinceCode",
  regency_code: "licenses.fields.regencyCode",
  district_code: "licenses.fields.districtCode",
  village_code: "licenses.fields.villageCode",
  occupation: "licenses.fields.occupation",
  affiliation: "licenses.fields.affiliation",
  organization_type: "licenses.fields.organizationType",
  contact_name: "licenses.fields.contactName",
  contact_position: "licenses.fields.contactPosition",
  address: "licenses.fields.address",
  website: "licenses.fields.website",
  tax_id: "licenses.fields.taxId",
  member_count: "licenses.fields.memberCount",
  type: "licenses.fields.type",
  starts_at: "licenses.fields.startsAt",
  max_devices: "licenses.fields.maxDevices",
  updates_major: "licenses.fields.updatesMajor",
  notes: "licenses.fields.notes",
});

const PRESET_DURATIONS = {
  "14_days": { days: 14 },
  "30_days": { days: 30 },
  "6_months": { months: 6 },
  "1_year": { years: 1 },
};

export const periodPreview = (form) => {
  if (planType(form?.plan) === "lifetime") return { lifetime: true };

  const start = DateTime.now().startOf("day");
  let end = null;
  if (PRESET_DURATIONS[form?.duration]) end = start.plus(PRESET_DURATIONS[form.duration]);
  else if (form?.duration === "custom" && form?.expires_at) {
    const parsed = DateTime.fromISO(form.expires_at);
    end = parsed.isValid ? parsed.startOf("day") : null;
  }

  return {
    lifetime: false,
    start: start.setLocale(localeTag()).toFormat("dd MMM yyyy"),
    end: end ? end.setLocale(localeTag()).toFormat("dd MMM yyyy") : null,
    days: end ? Math.round(end.diff(start, "days").days) : null,
  };
};

// Labels for the "Required fields" checklist.
// Keys under licenses.checklist (per category where it differs).
const CHECKLIST_LABELS = {
  licensee_name: { individual: "fullName", organization: "organizationName" },
  licensee_email: { individual: "email", organization: "contactEmail" },
  phone: { individual: "phone", organization: "contactPhone" },
  organization_type: "organizationType",
  contact_name: "contactName",
  country: "country",
  province: "province",
  regency: "city",
  postal_code: "postalCode",
  province_code: "provinceCode",
  regency_code: "regencyCode",
  district_code: "districtCode",
  village_code: "villageCode",
  address: "address",
};

export const requiredFieldLabel = (field, category) => {
  const label = CHECKLIST_LABELS[field];
  const key = typeof label === "string" ? label : label?.[category];
  return key ? t(`licenses.checklist.${key}`) : field;
};
