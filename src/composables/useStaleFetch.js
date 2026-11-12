// Stale-while-revalidate for pages backed by Pinia stores. Store state
// outlives the page, so coming back to a list shows the data it already has
// immediately and refreshes it quietly instead of flashing a skeleton.
//
//   const { loading, refreshing, refresh } = useStaleFetch(
//     () => store.fetchStaffTasks(params.value),     // the store action
//     {
//       key: () => ["staff-tasks", params.value],     // refetch when it changes
//       hasData: () => store.staffTasks.length > 0,   // anything to show yet?
//       maxAge: 30_000,                               // fresh enough: no request
//     }
//   );
//
// - loading:    true only while there's nothing to show (first load).
// - refreshing: true while newer data is being fetched behind what's shown
//               (filter change, revisit, tab focus) — show a quiet hint.
// - refresh({ force }) after your own mutation if it didn't update the store.
// - invalidate("staff-tasks") from anywhere marks matching keys stale.
// Revisits within maxAge make no request; returning to the browser tab
// refetches when the data is older than maxAge.
//
// A store keeps one copy of a list, so a fresh key isn't enough: if the
// list was last fetched for another view (page 2, another filter) the store
// holds those rows. The first element of an array key names the list
// ("staff-tasks"); a revisit whose key differs from that list's last fetch
// always refreshes (quietly, behind what's shown).
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
