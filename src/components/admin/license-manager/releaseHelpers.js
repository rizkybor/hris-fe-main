import { DateTime } from "luxon";
import { t, localeTag } from "@/i18n";

// Labels are getters so they follow the interface language.
const translatedMap = (keys) => {
  const map = {};
  for (const [name, key] of Object.entries(keys)) {
    Object.defineProperty(map, name, { get: () => t(key), enumerable: true });
  }
  return map;
};

// Versions (releases) of a product's app: labels, colours and the form shape.

export const RELEASE_PLATFORM_OPTIONS = [
  { value: "both", label: "Mac + iPad" },
  { value: "mac", label: "Mac" },
  { value: "ipad", label: "iPad" },
  { value: "windows", label: "Windows" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
  { value: "multi", get label() { return t("licenses.releaseForm.multiplatform"); } },
];

// What a multiplatform version can list.
export const TARGET_PLATFORM_OPTIONS = [
  { value: "mac", label: "Mac" },
  { value: "ipad", label: "iPad" },
  { value: "windows", label: "Windows" },
  { value: "android", label: "Android" },
  { value: "ios", label: "iOS" },
];

// The platforms a version runs on ("both" = Mac and iPad; "multi" = its list).
export const platformListOf = (platforms, targets = []) =>
  platforms === "both" ? ["mac", "ipad"] : platforms === "multi" ? targets || [] : platforms ? [platforms] : [];

// "Multiplatform · Mac, Windows, Android"; plain label otherwise.
export const releasePlatformLabel = (value, targets = null) => {
  const label = RELEASE_PLATFORM_OPTIONS.find((o) => o.value === value)?.label || value || "-";
  if (value !== "multi" || !targets?.length) return label;
  return `${label} · ${targets.map((p) => TARGET_PLATFORM_OPTIONS.find((o) => o.value === p)?.label || p).join(", ")}`;
};

export const RELEASE_PLATFORM_CHIP = {
  both: "bg-ui-surface text-ui-ink border border-ui-line",
  mac: "bg-ui-subtle text-ui-text",
  ipad: "bg-ui-accent-soft text-ui-accent",
  windows: "bg-ui-info-soft text-ui-info",
  android: "bg-ui-ok-soft text-ui-ok",
  ios: "bg-ui-accent-soft text-ui-accent",
  multi: "bg-ui-ink text-white",
};
export const releasePlatformChip = (value) => RELEASE_PLATFORM_CHIP[value] || RELEASE_PLATFORM_CHIP.mac;

// Android API levels with their Android version, for minimum / target SDK.
export const ANDROID_API_LEVELS = [
  [21, "5.0"], [22, "5.1"], [23, "6.0"], [24, "7.0"], [25, "7.1"], [26, "8.0"], [27, "8.1"], [28, "9"],
  [29, "10"], [30, "11"], [31, "12"], [32, "12L"], [33, "13"], [34, "14"], [35, "15"], [36, "16"],
].map(([level, version]) => ({ value: level, label: `API ${level} · Android ${version}` }));
// API level -> Android version number ("26" -> "8.0"); null when unknown.
export const androidVersionOf = (level) => ANDROID_API_LEVELS.find((o) => o.value === Number(level))?.label.split(" · Android ")[1] || null;

export const RELEASE_STATUS_OPTIONS = [
  { value: "published", get label() { return t("licenses.releases.status.published"); } },
  { value: "draft", get label() { return t("licenses.releases.status.draft"); } },
];

export const RELEASE_STATUS_CHIP = {
  published: "bg-ui-ok-soft text-ui-ok",
  draft: "bg-ui-subtle text-ui-text",
};

// Same names as the API's kind_label.
export const KIND_LABELS = translatedMap({
  major: "licenses.releases.kind.major",
  minor: "licenses.releases.kind.minor",
  patch: "licenses.releases.kind.patch",
});
// Shorter badge text for the list.
export const KIND_BADGES = translatedMap({
  major: "licenses.releases.kindBadge.major",
  minor: "licenses.releases.kindBadge.minor",
  patch: "licenses.releases.kindBadge.patch",
});
export const KIND_CHIP = {
  major: "bg-ui-ink text-white",
  minor: "bg-ui-accent-soft text-ui-accent",
  patch: "bg-ui-subtle text-ui-text",
};

export const CHANGE_TYPES = [
  { value: "feature", get label() { return t("licenses.releases.change.feature"); }, countKey: "licenses.releases.changeCount.feature", chip: "bg-ui-ok-soft text-ui-ok" },
  { value: "improvement", get label() { return t("licenses.releases.change.improvement"); }, countKey: "licenses.releases.changeCount.improvement", chip: "bg-ui-info-soft text-ui-info" },
  { value: "fix", get label() { return t("licenses.releases.change.fix"); }, countKey: "licenses.releases.changeCount.fix", chip: "bg-ui-subtle text-ui-text" },
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
  CHANGE_TYPES.filter((type) => counts?.[type.value])
    .map((type) => t(type.countKey, { n: counts[type.value] }))
    .join(" · ");

// Changes grouped New / Improved / Fixed, empty groups dropped.
export const groupChanges = (changes) =>
  CHANGE_TYPES.map((type) => ({ ...type, items: (changes || []).filter((c) => c.type === type.value) })).filter(
    (group) => group.items.length
  );

// Y-m-d (a calendar date, no timezone shift).
export const formatReleaseDate = (value) => (value ? DateTime.fromISO(value).setLocale(localeTag()).toFormat("dd MMM yyyy") : "");

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

// Installer files the API accepts (up to 2 GB), per platform: the Mac disk
// image (or a zipped app / .pkg), the Windows .msi (or .msix / .exe), the
// Android .apk / .aab, or for a multiplatform version any of them.
const INSTALLER_TYPES = {
  mac: { ext: ["dmg", "zip", "pkg"], error: "licenses.releases.validation.fileType" },
  windows: { ext: ["msi", "msix", "exe"], error: "licenses.releases.validation.windowsFileType" },
  android: { ext: ["apk", "aab"], error: "licenses.releases.validation.androidFileType" },
  multi: { ext: ["dmg", "zip", "pkg", "msi", "msix", "exe", "apk", "aab"], error: "licenses.releases.validation.multiFileType" },
};
const installerType = (platforms) => INSTALLER_TYPES[platforms] || INSTALLER_TYPES.mac;
export const INSTALLER_ACCEPT = ".dmg,.zip,.pkg";
export const installerAcceptFor = (platforms) => installerType(platforms).ext.map((e) => `.${e}`).join(",");
export const INSTALLER_MAX_BYTES = 2 * 1024 * 1024 * 1024;
export const installerFileError = (file, platforms) => {
  if (!file) return "";
  const type = installerType(platforms);
  if (!new RegExp(`\\.(${type.ext.join("|")})$`, "i").test(file.name)) return t(type.error);
  if (file.size > INSTALLER_MAX_BYTES) return t("licenses.releases.validation.fileSize");
  return "";
};

// iPad installer: an Ad Hoc signed .ipa (up to 2 GB).
export const IPA_ACCEPT = ".ipa";
export const ipaFileError = (file) => {
  if (!file) return "";
  if (!/\.ipa$/i.test(file.name)) return t("licenses.releases.validation.ipaType");
  if (file.size > INSTALLER_MAX_BYTES) return t("licenses.releases.validation.fileSize");
  return "";
};

// The publish check of the API: versions that run on the Mac need the
// .dmg, Windows versions the .msi, versions that run on the iPad the .ipa.
export const needsFile = (release) =>
  release?.needs_file ?? (release?.platforms ? ["both", "mac", "windows", "android"].includes(release.platforms) : true);

export const needsIpa = (release) =>
  release?.needs_ipa ?? (release?.platforms ? ["both", "ipad", "ios"].includes(release.platforms) : true);

// A multiplatform version has no required installer, but may carry one
// file and, when it lists iPad or iOS, an .ipa.
export const allowsOptionalFile = (release) => release?.platforms === "multi";
export const allowsOptionalIpa = (release) =>
  release?.platforms === "multi" && (release.target_platforms || []).some((p) => p === "ipad" || p === "ios");

export const publishNeedsFileMessage = (platforms) =>
  t(
    platforms === "windows"
      ? "licenses.releases.validation.publishNeedsWindowsFile"
      : platforms === "android"
        ? "licenses.releases.validation.publishNeedsAndroidFile"
        : "licenses.releases.validation.publishNeedsFile"
  );

export const publishNeedsIpaMessage = () => t("licenses.releases.validation.publishNeedsIpa");

// The first missing installer of a version, as a message ("" when it can be published).
export const publishBlockedMessage = (release) => {
  if (needsFile(release) && !release?.file) return publishNeedsFileMessage(release?.platforms);
  if (needsIpa(release) && !release?.ipa) return publishNeedsIpaMessage();
  return "";
};

// Install link status: badge tone.
export const INSTALL_LINK_TONE = { active: "ok", used: "neutral", expired: "warn", revoked: "bad" };

export const blankChange = (type = "feature") => ({ type, area: "", text: "" });

export const releaseToForm = (release) => ({
  version: release?.version || "",
  title: release?.title || "",
  platforms: release?.platforms || "both",
  target_platforms: release?.target_platforms ? [...release.target_platforms] : [],
  android_min_sdk: release?.android_min_sdk ?? "",
  android_target_sdk: release?.android_target_sdk ?? "",
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
  if (blank(form.version)) errors.version = t("licenses.releases.validation.versionRequired");
  else if (!VERSION_RE.test(String(form.version).trim())) errors.version = t("licenses.releases.validation.versionFormat");
  if (!RELEASE_PLATFORM_OPTIONS.some((o) => o.value === form.platforms)) errors.platforms = t("licenses.releases.validation.platforms");
  else if (form.platforms === "multi" && (form.target_platforms || []).length < 2) errors.target_platforms = t("licenses.releases.validation.targetPlatforms");
  if (!blank(form.android_min_sdk) && !blank(form.android_target_sdk) && Number(form.android_target_sdk) < Number(form.android_min_sdk))
    errors.android_target_sdk = t("licenses.releases.validation.androidTargetSdk");
  if (!RELEASE_STATUS_OPTIONS.some((o) => o.value === form.status)) errors.status = t("licenses.releases.validation.status");
  if (form.status === "published" && blank(form.released_at)) errors.released_at = t("licenses.releases.validation.releasedAt");
  if (!blank(form.build)) {
    const n = Number(form.build);
    if (!Number.isInteger(n) || n < 0) errors.build = t("licenses.releases.validation.build");
  }
  if (!blank(form.download_url) && !isUrl(String(form.download_url).trim()))
    errors.download_url = t("licenses.releases.validation.downloadUrl");
  (form.changes || []).forEach((change, index) => {
    if (blank(change.text)) errors[`changes.${index}.text`] = t("licenses.releases.validation.changeText");
  });
  return errors;
};

export const releasePayload = (form) => {
  const list = platformListOf(form.platforms, form.target_platforms);
  const android = list.includes("android");
  return {
  version: String(form.version).trim(),
  title: blank(form.title) ? null : form.title.trim(),
  platforms: form.platforms,
  target_platforms: form.platforms === "multi" ? TARGET_PLATFORM_OPTIONS.map((o) => o.value).filter((p) => form.target_platforms.includes(p)) : null,
  android_min_sdk: android && !blank(form.android_min_sdk) ? Number(form.android_min_sdk) : null,
  android_target_sdk: android && !blank(form.android_target_sdk) ? Number(form.android_target_sdk) : null,
  status: form.status,
  released_at: blank(form.released_at) ? null : form.released_at,
  build: blank(form.build) ? null : Number(form.build),
  is_critical: !!form.is_critical,
  download_url: blank(form.download_url) ? null : form.download_url.trim(),
  changes: (form.changes || []).map((c) => ({ type: c.type, area: blank(c.area) ? null : c.area.trim(), text: c.text.trim() })),
  notes: blank(form.notes) ? null : form.notes.trim(),
  };
};
