import { DateTime } from "luxon";

// Versions (releases) of a product's app: labels, colours and the form shape.

export const RELEASE_PLATFORM_OPTIONS = [
  { value: "both", label: "Mac + iPad" },
  { value: "mac", label: "Mac" },
  { value: "ipad", label: "iPad" },
];

export const releasePlatformLabel = (value) => RELEASE_PLATFORM_OPTIONS.find((o) => o.value === value)?.label || value || "-";

export const RELEASE_STATUS_OPTIONS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
];

export const RELEASE_STATUS_CHIP = {
  published: "bg-ui-ok-soft text-ui-ok",
  draft: "bg-ui-subtle text-ui-text",
};

// Same names as the API's kind_label.
export const KIND_LABELS = { major: "Major version", minor: "Feature update", patch: "Bug fix update" };
// Shorter badge text for the list.
export const KIND_BADGES = { major: "Major", minor: "Feature update", patch: "Bug fix" };
export const KIND_CHIP = {
  major: "bg-ui-ink text-white",
  minor: "bg-ui-accent-soft text-ui-accent",
  patch: "bg-ui-subtle text-ui-text",
};

export const CHANGE_TYPES = [
  { value: "feature", label: "New", countLabel: "new", chip: "bg-ui-ok-soft text-ui-ok" },
  { value: "improvement", label: "Improved", countLabel: "improved", chip: "bg-ui-info-soft text-ui-info" },
  { value: "fix", label: "Fixed", countLabel: "fixed", chip: "bg-ui-subtle text-ui-text" },
];

export const VERSION_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

// "1.1.0" -> "minor" (x.0.0 major, x.y.0 feature update, x.y.z bug fix); null when not a version.
export const kindOfVersion = (version) => {
  const match = VERSION_RE.exec(String(version || "").trim());
  if (!match) return null;
  const [, , minor, patch] = match.map(Number);
  if (minor === 0 && patch === 0) return "major";
  return patch === 0 ? "minor" : "patch";
};

// "3 new · 1 improved · 2 fixed" (zero counts left out).
export const changeCountsLine = (counts) =>
  CHANGE_TYPES.filter((t) => counts?.[t.value])
    .map((t) => `${counts[t.value]} ${t.countLabel}`)
    .join(" · ");

// Changes grouped New / Improved / Fixed, empty groups dropped.
export const groupChanges = (changes) =>
  CHANGE_TYPES.map((type) => ({ ...type, items: (changes || []).filter((c) => c.type === type.value) })).filter(
    (group) => group.items.length
  );

// Y-m-d (a calendar date, no timezone shift).
export const formatReleaseDate = (value) => (value ? DateTime.fromISO(value).toFormat("dd MMM yyyy") : "");

export const todayInput = () => DateTime.now().toISODate();

// "84.2 MB"
export const formatBytes = (bytes) => {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "-";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
};

// Installer files the API accepts (up to 2 GB).
export const INSTALLER_ACCEPT = ".dmg,.zip,.pkg";
export const INSTALLER_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const installerFileError = (file) => {
  if (!file) return "";
  if (!/\.(dmg|zip|pkg)$/i.test(file.name)) return "Use a .dmg, .zip or .pkg file.";
  if (file.size > INSTALLER_MAX_BYTES) return "The installer may not be larger than 2 GB.";
  return "";
};

// The publish check of the API: versions that run on the Mac need an installer.
export const needsFile = (release) =>
  release?.needs_file ?? (release?.platforms ? release.platforms !== "ipad" : true);

export const PUBLISH_NEEDS_FILE = "Upload the Mac installer (.dmg) before publishing this version.";

export const blankChange = (type = "feature") => ({ type, area: "", text: "" });

export const releaseToForm = (release) => ({
  version: release?.version || "",
  title: release?.title || "",
  platforms: release?.platforms || "both",
  status: release?.status || "draft",
  released_at: release?.released_at || "",
  build: release?.build ?? "",
  is_critical: !!release?.is_critical,
  download_url: release?.download_url || "",
  notes: release?.notes || "",
  changes: (release?.changes || []).map((c) => ({ type: c.type || "feature", area: c.area || "", text: c.text || "" })),
});

const blank = (v) => v === null || v === undefined || String(v).trim() === "";

const isUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Client checks mirroring the API rules; keys match the API's (changes.0.text).
export const validateReleaseForm = (form) => {
  const errors = {};
  if (blank(form.version)) errors.version = "Version is required.";
  else if (!VERSION_RE.test(String(form.version).trim())) errors.version = "Use major.minor.patch, e.g. 1.1.0.";
  if (!RELEASE_PLATFORM_OPTIONS.some((o) => o.value === form.platforms)) errors.platforms = "Choose the platforms.";
  if (!RELEASE_STATUS_OPTIONS.some((o) => o.value === form.status)) errors.status = "Choose a status.";
  if (form.status === "published" && blank(form.released_at)) errors.released_at = "A published version needs a release date.";
  if (!blank(form.build)) {
    const n = Number(form.build);
    if (!Number.isInteger(n) || n < 0) errors.build = "Build must be a whole number.";
  }
  if (!blank(form.download_url) && !isUrl(String(form.download_url).trim()))
    errors.download_url = "Enter a full URL, e.g. https://example.com/OCCA.dmg";
  (form.changes || []).forEach((change, index) => {
    if (blank(change.text)) errors[`changes.${index}.text`] = "Describe the change.";
  });
  return errors;
};

export const releasePayload = (form) => ({
  version: String(form.version).trim(),
  title: blank(form.title) ? null : form.title.trim(),
  platforms: form.platforms,
  status: form.status,
  released_at: blank(form.released_at) ? null : form.released_at,
  build: blank(form.build) ? null : Number(form.build),
  is_critical: !!form.is_critical,
  download_url: blank(form.download_url) ? null : form.download_url.trim(),
  changes: (form.changes || []).map((c) => ({ type: c.type, area: blank(c.area) ? null : c.area.trim(), text: c.text.trim() })),
  notes: blank(form.notes) ? null : form.notes.trim(),
});
