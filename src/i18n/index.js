import { createI18n } from "vue-i18n";

const STORAGE_KEY = "hris-locale";
export const LOCALES = ["id", "en"];
export const DEFAULT_LOCALE = "id";

// One lazy chunk per language (see vite.config.js manualChunks): only the
// active language is downloaded at startup, the other one on first switch.
const files = import.meta.glob("../locales/*/*.json", { import: "default" });
const loaded = new Set();

export const loadLocaleMessages = async (locale) => {
  if (loaded.has(locale)) return;
  const entries = Object.entries(files).filter(([path]) => path.includes(`/locales/${locale}/`));
  const mods = await Promise.all(entries.map(([, load]) => load()));
  const messages = {};
  entries.forEach(([path], i) => {
    messages[path.match(/\/([\w-]+)\.json$/)[1]] = mods[i];
  });
  i18n.global.setLocaleMessage(locale, messages);
  loaded.add(locale);
};

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
  messages: {},
  // Keys are kept in sync across languages, so the fallback is never
  // needed at runtime; it only guards against a missed key.
  missingWarn: import.meta.env.DEV,
  // Missing keys fall back to English quietly; the dev console still
  // lists keys missing from every locale.
  fallbackWarn: false,
});

const syncDocument = (locale) => {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
};
syncDocument(i18n.global.locale.value);

export const setLocale = async (locale) => {
  if (!LOCALES.includes(locale)) return;
  await loadLocaleMessages(locale);
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
