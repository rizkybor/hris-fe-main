import { ref, computed } from "vue";

const STORAGE_KEY = "hris-theme";
const MODES = ["light", "dark", "system"];

const readMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
};

const media = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

const mode = ref(readMode());
const systemDark = ref(!!media?.matches);
// Bumped on every theme change. uiColor() reads it, so chart options built
// in a computed() re-run and pick up the new colours.
export const themeRevision = ref(0);

const resolved = computed(() => (mode.value === "system" ? (systemDark.value ? "dark" : "light") : mode.value));

const apply = () => {
  document.documentElement.dataset.theme = resolved.value;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved.value === "dark" ? "#121823" : "#FFFFFF");
  themeRevision.value += 1;
};

media?.addEventListener?.("change", (event) => {
  systemDark.value = event.matches;
  if (mode.value === "system") apply();
});

export const setThemeMode = (next) => {
  if (!MODES.includes(next)) return;
  mode.value = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage unavailable: the choice lasts for this visit only */
  }
  apply();
};

// Call once at startup (main.js) to sync with what index.html applied.
export const initTheme = () => apply();

export const useTheme = () => ({ mode, resolved, setMode: setThemeMode });
