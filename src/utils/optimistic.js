// Optimistic update: change the UI first, send the request, and undo the
// change (with an error toast) if the request fails. Use it for small edits
// on a list item — status, assignee, priority, due date, a checkbox — so the
// page doesn't wait for, or refetch after, every click.
//
//   await optimistic({
//     apply: () => {                               // mutate local/store state
//       const before = task.status;
//       task.status = "done";
//       return () => (task.status = before);       // ...and return the undo
//     },
//     request: () => store.updateStatus(task.id, "done"),  // must throw on failure
//     success: t("staffTasks.toast.statusUpdated"),         // optional toast
//   });
//
// Returns { ok, result }. Store actions that swallow errors instead of
// throwing can pass `failed: (result) => !result` (or check store.error).
import { useToastStore } from "@/stores/toast";
import { errorMessage } from "@/helpers/errorHelper";
import { t } from "@/i18n";

export async function optimistic({ apply, request, success = "", failed = null, errorTitle = "" }) {
  const toast = useToastStore();
  const undo = apply?.() || (() => {});
  try {
    const result = await request();
    if (failed && failed(result)) throw new Error("");
    if (success) toast.success(success);
    return { ok: true, result };
  } catch (error) {
    undo();
    toast.error(errorTitle || t("common.toast.error"), error?.message ? errorMessage(error, "") : "");
    return { ok: false, error };
  }
}
