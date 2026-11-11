import { DateTime } from "luxon";
import { formatToClientTimezone } from "@/helpers/format";

export const TYPE_OPTIONS = [
  { value: "lifetime", label: "Lifetime" },
  { value: "term", label: "Term" },
];

// Plans a license can have.
export const PLAN_OPTIONS = [
  {
    value: "trial",
    label: "Trial",
    note: "Individual · try every feature for a limited time",
    category: "individual",
    defaultMaxDevices: 1,
  },
  {
    value: "professional",
    label: "Professional",
    note: "Individual · paid per period",
    category: "individual",
    defaultMaxDevices: 2,
  },
  {
    value: "lifetime",
    label: "Lifetime",
    note: "Individual · one-time payment",
    category: "individual",
    defaultMaxDevices: 5,
  },
  {
    value: "organization",
    label: "Organization",
    note: "Team, community, club, or federation",
    category: "organization",
    defaultMaxDevices: 10,
  },
];

const planOption = (value) => PLAN_OPTIONS.find((p) => p.value === value);


// Picker layout: Individual (Trial, Professional, Lifetime) and Organization.
export const PLAN_GROUPS = [
  { label: "Individual", plans: ["trial", "professional", "lifetime"].map(planOption) },
  { label: "Organization", plans: [planOption("organization")] },
];

// The device platform a license is for, fixed at creation (mirrors
// License::PLATFORM_*): a Mac key only activates on a Mac, an iPad key only
// on an iPad. iPad has no Trial.
export const PLATFORM_OPTIONS = [
  { value: "mac", label: "Mac", note: "macOS", plans: ["trial", "professional", "lifetime", "organization"] },
  { value: "ipad", label: "iPad", note: "iPadOS · no Trial", plans: ["professional", "lifetime", "organization"] },
];

// Create-only choice: a Mac and an iPad key generated together (one
// bundle, same licensee / plan / period). Not for Trial.
export const PLATFORM_BOTH = "both";
export const PLATFORM_CHOICES = [
  ...PLATFORM_OPTIONS,
  { value: PLATFORM_BOTH, label: "Mac + iPad", note: "Two keys at once · no Trial", plans: ["professional", "lifetime", "organization"] },
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

export const CATEGORY_LABELS = { individual: "Individual", organization: "Organization" };

// Older records may still carry the draft value "pro".
export const normalizePlan = (plan) => (plan === "pro" ? "professional" : plan || "professional");

export const planLabel = (license) =>
  license?.plan_label || planOption(normalizePlan(license?.plan))?.label || license?.plan || "-";

export const planCategory = (license) =>
  license?.category || planOption(normalizePlan(license?.plan))?.category || "individual";

export const categoryLabel = (license) => CATEGORY_LABELS[planCategory(license)] || "-";

export const planDefaultMaxDevices = (plan) => planOption(plan)?.defaultMaxDevices ?? 2;

// Chip colours: light (tables, forms) and dark (the key hero panels).
// Plans are identities, not states, so they stay off the ok/warn/bad
// colours and differ by lightness instead: Trial grey, Professional
// accent, Lifetime ink, Organization outlined.
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

// The license type follows the plan: only the Lifetime plan is lifetime,
// every other plan (trial, professional, organization) is a term license.
// Key format {prefix}{platform}{plan}-XXXX-XXXX-XXXX-{sequence}, e.g.
// OC32-7KQM-2XRT-9HZP-0001 (mirrors License::PLATFORM_CODES / PLAN_DIGITS):
// Mac 31 Trial, 32 Professional, 33 Lifetime, 34 Organization; iPad 52, 53,
// 54. A key never changes, so its code is the platform and plan at creation.
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
  { value: "14_days", label: "14 days" },
  { value: "30_days", label: "30 days" },
  { value: "6_months", label: "6 months" },
  { value: "1_year", label: "1 year" },
  { value: "custom", label: "Custom date" },
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
  { value: "team", label: "Team" },
  { value: "community", label: "Community" },
  { value: "club", label: "Club" },
  { value: "federation", label: "Federation" },
];

export const organizationTypeLabel = (value) =>
  ORGANIZATION_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || "-";

export const DEFAULT_COUNTRY = "Indonesia";

// Licensee details per category (mirrors the API). Shared fields survive a
// category switch; the other category's own fields are cleared.
// Location (both categories). For Indonesia the region codes are what the
// API stores (names are filled from them); elsewhere the names are free
// text. "regency" is the city / regency (Kota/Kabupaten).
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

// Same as the API: Indonesia needs the region chain and a postal code;
// elsewhere state / province, city and postal code. Organizations also need
// the street address.
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
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];

export const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "expires_at:asc", label: "Expires soonest" },
  { value: "expires_at:desc", label: "Expires latest" },
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

export const formatDate = (value, format = "dd MMM yyyy") =>
  value ? formatToClientTimezone(value, format) : "-";

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
  if (duration === "14_days") return now.plus({ days: 14 }).toFormat("dd MMM yyyy");
  if (duration === "30_days") return now.plus({ days: 30 }).toFormat("dd MMM yyyy");
  if (duration === "6_months") return now.plus({ months: 6 }).toFormat("dd MMM yyyy");
  if (duration === "1_year") return now.plus({ years: 1 }).toFormat("dd MMM yyyy");
  return null;
};

// Turns a license from the API into the editable form shape. An existing
// term license starts on "custom" with its current expiry, so saving without
// touching the duration keeps the expiry unchanged. The type always follows
// the plan.
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

const REQUIRED_MESSAGES = {
  licensee_name: { individual: "Full name is required.", organization: "Organization name is required." },
  licensee_email: { individual: "Email is required.", organization: "Contact email is required." },
  phone: { individual: "Phone / WhatsApp is required.", organization: "Contact phone / WhatsApp is required." },
  country: "Choose a country.",
  province: "State / province is required.",
  regency: "City is required.",
  postal_code: "Postal code is required.",
  province_code: "Choose a province.",
  regency_code: "Choose a city / regency.",
  district_code: "Choose a district.",
  village_code: "Choose a village.",
  organization_type: "Choose the organization type.",
  contact_name: "Contact person is required.",
  address: "Street address is required.",
};

const requiredMessage = (field, category) => {
  const msg = REQUIRED_MESSAGES[field];
  return typeof msg === "string" ? msg : msg?.[category] || "This field is required.";
};

// Client-side checks mirroring the API rules; returns {field: message}.
export const validateLicenseForm = (form) => {
  const errors = {};
  const category = categoryOfPlan(form.plan);
  const blank = (v) => v === null || v === undefined || String(v).trim() === "";

  if (!PLATFORM_CHOICES.some((p) => p.value === form.platform)) errors.platform = "Choose Mac, iPad, or Mac + iPad.";
  if (!PLAN_OPTIONS.some((p) => p.value === form.plan)) errors.plan = "Choose a plan.";
  else if (!errors.platform && !planAllowedOn(form.platform, form.plan))
    errors.plan = `The ${planOption(form.plan).label} plan is not available for ${platformOption(form.platform).label} licenses.`;

  for (const field of requiredFields(category, form.country)) {
    if (blank(form[field])) errors[field] = requiredMessage(field, category);
  }
  if (!errors.postal_code && !blank(form.postal_code)) {
    const postal = String(form.postal_code).trim();
    if (isIndonesia(form.country) ? !/^[0-9]{5}$/.test(postal) : !/^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$/.test(postal))
      errors.postal_code = isIndonesia(form.country) ? "Use the 5-digit postal code." : "Use 2-20 letters, digits, spaces or \"-\".";
  }

  if (!errors.licensee_email && !EMAIL_RE.test(String(form.licensee_email).trim()))
    errors.licensee_email = "Enter a valid email address.";
  if (!errors.phone && !PHONE_RE.test(String(form.phone).trim()))
    errors.phone = 'Use 6-20 digits; spaces, "+" and "-" are allowed.';

  if (category === "organization") {
    if (!blank(form.website) && !isUrl(String(form.website).trim()))
      errors.website = "Enter a full URL, e.g. https://example.org";
    if (!blank(form.member_count)) {
      const n = Number(form.member_count);
      if (!Number.isInteger(n) || n < 1) errors.member_count = "Member count must be a whole number of at least 1.";
    }
  }

  if (planType(form.plan) === "term") {
    if (!form.duration) errors.duration = "Choose a duration.";
    if (form.duration === "custom" && !form.expires_at) errors.expires_at = "Pick an expiry date.";
  }

  if (planType(form.plan) === "lifetime" && !blank(form.updates_major)) {
    const major = Number(form.updates_major);
    if (!Number.isInteger(major) || major < 1 || major > 99) errors.updates_major = "Use a whole number from 1 to 99.";
  }

  const max = Number(form.max_devices);
  if (!Number.isInteger(max) || max < 1 || max > 100) errors.max_devices = "Max devices must be between 1 and 100.";
  return errors;
};

// 422 responses carry {field: [messages]}; anything else has no field errors.
export const validationErrors = (error) =>
  error?.response?.status === 422 ? error.response.data?.errors || {} : {};

/* ------------------------------------------------------------------
 * Active period
 * ------------------------------------------------------------------ */

export const isLifetimeLicense = (license) => license?.type === "lifetime" || !license?.expires_at;

export const remainingLabel = (days) => {
  if (days === null || days === undefined) return "Lifetime";
  if (days <= 0) return "Expired";
  return `${days} day${days === 1 ? "" : "s"} left`;
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
    return `${years} year${years === 1 ? "" : "s"} (${days} days)`;
  }
  if (days >= 28) {
    const months = Math.round(days / 30.44);
    return `${months} month${months === 1 ? "" : "s"} (${days} days)`;
  }
  return `${days} day${days === 1 ? "" : "s"}`;
};

// "2 hours ago", "in 3 days".
export const relativeTime = (value) =>
  value ? DateTime.fromISO(value).toRelative({ locale: "en" }) || "-" : "-";

/* ------------------------------------------------------------------
 * Tracking events
 * ------------------------------------------------------------------ */

// tone: badge colour; group: used by the timeline filter.
export const EVENT_TYPES = {
  created: { label: "License created", tone: "violet", group: "Admin" },
  updated: { label: "Details updated", tone: "blue", group: "Admin" },
  activated_by_admin: { label: "Switched on by admin", tone: "emerald", group: "Admin" },
  deactivated_by_admin: { label: "Switched off by admin", tone: "gray", group: "Admin" },
  extended: { label: "Expiry changed", tone: "indigo", group: "Admin" },
  plan_changed: { label: "Plan changed", tone: "fuchsia", group: "Admin" },
  device_released_by_admin: { label: "Device released by admin", tone: "amber", group: "Admin" },
  deleted: { label: "License deleted", tone: "red", group: "Admin" },
  certificate_downloaded: { label: "Certificate PDF downloaded", tone: "violet", group: "Admin" },
  certificate_emailed: { label: "Certificate sent by email", tone: "violet", group: "Admin" },
  certificate_shared_whatsapp: { label: "Certificate shared via WhatsApp", tone: "emerald", group: "Admin" },
  certificate_link_opened: { label: "Certificate opened from a shared link", tone: "sky", group: "App" },
  device_activated: { label: "Device activated", tone: "emerald", group: "App" },
  device_reactivated: { label: "Device re-activated", tone: "teal", group: "App" },
  refreshed: { label: "License refreshed", tone: "sky", group: "App" },
  device_released: { label: "Device released from the app", tone: "amber", group: "App" },
  app_updated: { label: "App updated", tone: "indigo", group: "App" },
  denied_device_limit: { label: "Denied: device limit reached", tone: "red", group: "Denied" },
  denied_inactive: { label: "Denied: license switched off", tone: "red", group: "Denied" },
  denied_expired: { label: "Denied: license expired", tone: "red", group: "Denied" },
  denied_wrong_platform: { label: "Denied: wrong platform", tone: "red", group: "Denied" },
  denied_key_used: { label: "Denied: key already used", tone: "red", group: "Denied" },
  denied_key_in_use: { label: "Denied: key in use on another device", tone: "red", group: "Denied" },
  denied_key_replaced: { label: "Denied: old key (replaced after a plan change)", tone: "red", group: "Denied" },
};

// Key modes, offered on create only.
export const KEY_MODE_OPTIONS = [
  { value: "per_device", label: "One key per device", note: "Each device gets its own key; a released key can't be used again." },
  { value: "shared", label: "One shared key", note: "Every device uses the same key, up to Max devices." },
];

// Keys a one-key certificate can be made for: every key of the license
// and its bundle that is not used (a used key is dead). Each with
// { id, position, key, status, platform, platform_label, total }.
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
  available: { label: "Available", dot: "bg-ui-ok", text: "text-ui-ok", chip: "bg-ui-ok-soft text-ui-ok" },
  in_use: { label: "In use", dot: "bg-ui-accent", text: "text-ui-accent", chip: "bg-ui-accent-soft text-ui-accent" },
  used: { label: "Used", dot: "bg-ui-faint", text: "text-ui-muted", chip: "bg-ui-subtle text-ui-muted" },
};

// Activity icon tints: quiet by default; only events that carry a state
// (created/activated = ok, expiring = warn, revoked/deleted = bad, keys = accent)
// get a colour.
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
export const FIELD_LABELS = {
  licensee_name: "Name",
  licensee_email: "Email",
  phone: "Phone",
  country: "Country",
  province: "Province",
  regency: "City / Regency",
  district: "District",
  village: "Village",
  postal_code: "Postal code",
  province_code: "Province code",
  regency_code: "City / regency code",
  district_code: "District code",
  village_code: "Village code",
  occupation: "Occupation",
  affiliation: "Affiliation",
  organization_type: "Organization type",
  contact_name: "Contact person",
  contact_position: "Contact position",
  address: "Street address",
  website: "Website",
  tax_id: "Tax ID",
  member_count: "Member count",
  type: "Type",
  starts_at: "Starts",
  max_devices: "Max devices",
  updates_major: "Covers major version",
  notes: "Notes",
};

/* ------------------------------------------------------------------
 * Live preview of the active period (form summary)
 * ------------------------------------------------------------------ */

const PRESET_DURATIONS = {
  "14_days": { days: 14 },
  "30_days": { days: 30 },
  "6_months": { months: 6 },
  "1_year": { years: 1 },
};

// {lifetime: true} for the Lifetime plan, else {start, end, days} with end /
// days null while no valid date is chosen. Presets count from today (the
// server computes the stored value).
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
    start: start.toFormat("dd MMM yyyy"),
    end: end ? end.toFormat("dd MMM yyyy") : null,
    days: end ? Math.round(end.diff(start, "days").days) : null,
  };
};

// Labels for the "Required fields" checklist.
const CHECKLIST_LABELS = {
  licensee_name: { individual: "Full name", organization: "Organization name" },
  licensee_email: { individual: "Email", organization: "Contact email" },
  phone: { individual: "Phone / WhatsApp", organization: "Contact phone" },
  organization_type: "Organization type",
  contact_name: "Contact person",
  country: "Country",
  province: "State / province",
  regency: "City",
  postal_code: "Postal code",
  province_code: "Province",
  regency_code: "City / regency",
  district_code: "District",
  village_code: "Village",
  address: "Street address",
};

export const requiredFieldLabel = (field, category) => {
  const label = CHECKLIST_LABELS[field];
  return typeof label === "string" ? label : label?.[category] || field;
};
