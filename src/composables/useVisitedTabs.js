import { reactive, watch } from "vue";

export function useVisitedTabs(activeTab) {
  const visited = reactive(new Set());
  watch(activeTab, (tab) => tab != null && visited.add(tab), { immediate: true });
  return visited;
}
