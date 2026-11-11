// Mount a tab's content the first time it's opened, then keep it (so it
// doesn't refetch every switch) — instead of v-show on every tab, which
// mounts and fetches all of them on the first visit.
//
//   const visited = useVisitedTabs(() => list.tab);
//   <ProjectDocuments v-if="visited.has('documents')" v-show="list.tab === 'documents'" />
import { reactive, watch } from "vue";

export function useVisitedTabs(activeTab) {
  const visited = reactive(new Set());
  watch(activeTab, (tab) => tab != null && visited.add(tab), { immediate: true });
  return visited;
}
