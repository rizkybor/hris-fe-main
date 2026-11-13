import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const fetchedAt = new Map(); // serialized key -> timestamp
const lastFetched = new Map(); // list name -> serialized key the store holds now

const serialize = (key) => (typeof key === "string" ? key : JSON.stringify(key));

export const invalidate = (prefix) => {
  for (const k of fetchedAt.keys()) if (k.includes(prefix)) fetchedAt.delete(k);
};

export function useStaleFetch(fetcher, { key = () => "default", hasData = () => false, maxAge = 30_000, refetchOnFocus = true } = {}) {
  const loading = ref(false);
  const refreshing = ref(false);
  let run = 0;

  const refresh = async ({ force = false } = {}) => {
    const raw = key();
    const k = serialize(raw);
    const list = Array.isArray(raw) ? serialize(raw[0]) : k;
    const age = Date.now() - (fetchedAt.get(k) ?? 0);
    const showing = hasData();
    const holdsThisView = lastFetched.get(list) === k;
    if (!force && showing && age < maxAge && holdsThisView) return;
    const id = ++run;
    if (showing) refreshing.value = true;
    else loading.value = true;
    try {
      await fetcher();
      fetchedAt.set(k, Date.now());
      // Only the latest request decides what the store now holds (stores
      // drop out-of-order replies).
      if (id === run) lastFetched.set(list, k);
    } finally {
      // Only the latest request clears the flags.
      if (id === run) {
        loading.value = false;
        refreshing.value = false;
      }
    }
  };

  watch(() => serialize(key()), () => refresh({ force: true }));

  const onVisible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  onMounted(() => {
    refresh();
    if (refetchOnFocus) document.addEventListener("visibilitychange", onVisible);
  });
  onBeforeUnmount(() => document.removeEventListener("visibilitychange", onVisible));

  return { loading, refreshing, refresh };
}
