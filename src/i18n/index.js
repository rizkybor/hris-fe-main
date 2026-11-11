// Interface language: Indonesian (default) or English. The choice is kept
// per browser (localStorage "hris-locale"). Messages live in
// src/locales/<locale>/<namespace>.json and are loaded automatically, so a
// key is written as t("namespace.path.to.key"); English is the fallback
// when an Indonesian string is missing.
//
// Amounts in Rupiah keep the Indonesian format in both languages; dates
// and other numbers follow the selected language through localeTag().
import { createI18n } from "vue-i18n";

const STORAGE_KEY = "hris-locale";
export const LOCALES = ["id", "en"];
export const DEFAULT_LOCALE = "id";

const files = import.meta.glob("../locales/*/*.json", { eager: true });
const messages = {};
for (const [path, mod] of Object.entries(files)) {
  const match = path.match(/locales\/([\w-]+)\/([\w-]+)\.json$/);
  if (!match) continue;
  const [, locale, namespace] = match;
  (messages[locale] ??= {})[namespace] = mod.default ?? mod;
}

const readLocale = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LOCALES.includes(saved) ? saved : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: readLocale(),
  fallbackLocale: "en",
  messages,
  // Missing keys fall back to English quietly; the dev console still
  // lists keys missing from every locale.
  fallbackWarn: false,
});

const syncDocument = (locale) => {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
};
syncDocument(i18n.global.locale.value);

export const setLocale = (locale) => {
  if (!LOCALES.includes(locale)) return;
  i18n.global.locale.value = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
  syncDocument(locale);
};

// BCP 47 tag for Intl / toLocale*String, reactive to the language switch.
export const localeTag = () => (i18n.global.locale.value === "en" ? "en-US" : "id-ID");

// For stores, utils and other code outside components.
export const t = (...args) => i18n.global.t(...args);
