// Asks before leaving a page with unsaved changes: in-app navigation shows
// the app's confirm dialog, closing/reloading the browser tab shows the
// browser's own prompt.
//
//   useUnsavedGuard(() => itemsDirty.value);
import { onBeforeUnmount, onMounted } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useAlertModalStore } from "@/stores/alertModal";
import { t } from "@/i18n";

export function useUnsavedGuard(isDirty) {
  onBeforeRouteLeave(async () => {
    if (!isDirty()) return true;
    return useAlertModalStore().confirm(t("common.confirm.unsavedMessage"), {
      title: t("common.confirm.unsavedTitle"),
      confirmText: t("common.confirm.leave"),
      cancelText: t("common.confirm.stay"),
      type: "warning",
    });
  });
  const onBeforeUnload = (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  onMounted(() => window.addEventListener("beforeunload", onBeforeUnload));
  onBeforeUnmount(() => window.removeEventListener("beforeunload", onBeforeUnload));
}
