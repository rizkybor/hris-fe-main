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
