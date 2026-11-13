import { defineStore } from "pinia";
import { t } from "@/i18n";

const AUTO_CLOSE_MS = 5000;
let autoCloseTimer = null;

function clearAutoClose() {
  clearTimeout(autoCloseTimer);
  autoCloseTimer = null;
}

// Global replacement for native alert()/confirm(). Mounted once via
// AlertConfirmModal in App.vue; call alert()/confirm() from anywhere and
// await the result the same way you would the native browser dialogs.
export const useAlertModalStore = defineStore("alertModal", {
  state: () => ({
    visible: false,
    mode: "alert", // 'alert' | 'confirm'
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    type: "info", // 'success' | 'danger' | 'warning' | 'info'
    // A drawn, animated check instead of the still icon (success only) --
    // for the moments worth a little celebration, e.g. clocking in.
    celebrate: false,
    resolver: null,
  }),

  actions: {
    alert(message, options = {}) {
      return new Promise((resolve) => {
        this.mode = "alert";
        this.title = options.title ?? t("common.confirm.notice");
        this.message = message;
        this.confirmText = options.confirmText ?? t("common.confirm.ok");
        this.cancelText = options.cancelText ?? t("common.actions.cancel");
        this.type = options.type ?? "info";
        this.celebrate = !!options.celebrate;
        this.visible = true;
        this.resolver = resolve;

        clearAutoClose();
        autoCloseTimer = setTimeout(() => this.handleCancel(), AUTO_CLOSE_MS);
      });
    },

    confirm(message, options = {}) {
      return new Promise((resolve) => {
        this.mode = "confirm";
        this.title = options.title ?? t("common.confirm.title");
        this.message = message;
        this.confirmText = options.confirmText ?? t("common.actions.confirm");
        this.cancelText = options.cancelText ?? t("common.actions.cancel");
        this.type = options.type ?? "danger";
        this.celebrate = false;
        this.visible = true;
        this.resolver = resolve;

        clearAutoClose();
      });
    },

    handleConfirm() {
      clearAutoClose();
      this.visible = false;
      this.resolver?.(true);
      this.resolver = null;
    },

    handleCancel() {
      clearAutoClose();
      this.visible = false;
      this.resolver?.(this.mode === "alert" ? undefined : false);
      this.resolver = null;
    },
  },
});
