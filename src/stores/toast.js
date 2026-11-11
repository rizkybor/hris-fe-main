// Short confirmations ("License created.") shown by UiToastHost (mounted
// once in App.vue). Errors that need a decision still use the alert modal.
import { defineStore } from "pinia";

let nextId = 1;

export const useToastStore = defineStore("toast", {
  state: () => ({ items: [] }),
  actions: {
    // type: success | error | info; timeout in ms (0 = stays until closed)
    push({ type = "success", title = "", message = "", timeout = 4000, action = null } = {}) {
      const id = nextId++;
      this.items.push({ id, type, title, message, action });
      if (timeout > 0) setTimeout(() => this.dismiss(id), timeout);
      return id;
    },
    success(title, message = "") {
      return this.push({ type: "success", title, message });
    },
    error(title, message = "") {
      return this.push({ type: "error", title, message, timeout: 6000 });
    },
    info(title, message = "") {
      return this.push({ type: "info", title, message });
    },
    dismiss(id) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
