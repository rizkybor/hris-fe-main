import { computed, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const STORAGE_PREFIX = "hris-list:";
const URL_DEBOUNCE_MS = 250;

const parse = (raw, def) => {
  if (raw === undefined || raw === null) return def;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (Array.isArray(def)) return value === "" ? [] : String(value).split(",");
  if (typeof def === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : def;
  }
  if (typeof def === "boolean") return value === "1" || value === "true";
  return String(value);
};
const serialize = (value, def) => {
  if (Array.isArray(def)) return value.join(",");
  if (typeof def === "boolean") return value ? "1" : "0";
  return String(value);
};
const same = (a, b) => (Array.isArray(a) || Array.isArray(b) ? JSON.stringify(a) === JSON.stringify(b) : a === b);

const readSaved = (key) => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) || "null");
  } catch {
    return null;
  }
};
const writeSaved = (key, value) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the URL still carries the state */
  }
};

export function useListState(key, defaults, { remember = true } = {}) {
  const route = useRoute();
  const router = useRouter();
  const fields = Object.keys(defaults);
  const clone = (v) => (Array.isArray(v) ? [...v] : v);

  // URL wins when it carries any of our fields; otherwise the saved view.
  const fromUrl = fields.some((f) => route.query[f] !== undefined);
  const saved = !fromUrl && remember ? readSaved(key) : null;
  const initial = {};
  for (const f of fields) {
    if (fromUrl) initial[f] = parse(route.query[f], defaults[f]);
    else if (saved && f in saved && typeof saved[f] === typeof defaults[f] && Array.isArray(saved[f]) === Array.isArray(defaults[f])) initial[f] = saved[f];
    else initial[f] = clone(defaults[f]);
  }

  const state = reactive(initial);

  let timer = null;
  const syncUrl = () => {
    const query = { ...route.query };
    for (const f of fields) {
      if (same(state[f], defaults[f])) delete query[f];
      else query[f] = serialize(state[f], defaults[f]);
    }
    const changed = fields.some((f) => (query[f] ?? undefined) !== (route.query[f] ?? undefined));
    if (changed) router.replace({ query }).catch(() => {});
  };
  // Restored state (from storage) shows in the URL right away.
  if (!fromUrl && saved) syncUrl();

  let last = { ...initial };
  watch(
    () => fields.map((f) => clone(state[f])),
    () => {
      const pageField = "page" in defaults;
      if (pageField) {
        const otherChanged = fields.some((f) => f !== "page" && !same(state[f], last[f]));
        if (otherChanged && state.page !== defaults.page) state.page = defaults.page;
      }
      last = Object.fromEntries(fields.map((f) => [f, clone(state[f])]));
      if (remember) {
        // The page number isn't worth restoring on a later visit.
        const { page, ...rest } = last; // eslint-disable-line no-unused-vars
        writeSaved(key, pageField ? rest : last);
      }
      clearTimeout(timer);
      timer = setTimeout(syncUrl, URL_DEBOUNCE_MS);
    },
    { deep: true }
  );

  const isDirty = computed(() => fields.some((f) => f !== "page" && !same(state[f], defaults[f])));
  const reset = () => {
    for (const f of fields) state[f] = clone(defaults[f]);
  };

  // A computed stored in a reactive object is unwrapped on read.
  state.isDirty = isDirty;
  state.reset = reset;
  return state;
}
