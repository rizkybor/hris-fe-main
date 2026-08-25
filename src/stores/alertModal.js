import { defineStore } from "pinia";

// Auto-close both modes after this long if the user never responds -- a
// confirm left open indefinitely (e.g. the user navigated away or just
// forgot about it) shouldn't block whatever was waiting on its resolution
// forever. Times out to the same outcome as clicking Cancel/close, never
// Confirm, so a timeout can never itself trigger a destructive action.
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
    resolver: null,
  }),

  actions: {
    alert(message, options = {}) {
      return new Promise((resolve) => {
        this.mode = "alert";
        this.title = options.title ?? "Notice";
        this.message = message;
        this.confirmText = options.confirmText ?? "OK";
        this.cancelText = options.cancelText ?? "Cancel";
        this.type = options.type ?? "info";
        this.visible = true;
        this.resolver = resolve;

        clearAutoClose();
        autoCloseTimer = setTimeout(() => this.handleCancel(), AUTO_CLOSE_MS);
      });
    },

    confirm(message, options = {}) {
      return new Promise((resolve) => {
        this.mode = "confirm";
        this.title = options.title ?? "Confirm Action";
        this.message = message;
        this.confirmText = options.confirmText ?? "Confirm";
        this.cancelText = options.cancelText ?? "Cancel";
        this.type = options.type ?? "danger";
        this.visible = true;
        this.resolver = resolve;

        clearAutoClose();
        autoCloseTimer = setTimeout(() => this.handleCancel(), AUTO_CLOSE_MS);
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
