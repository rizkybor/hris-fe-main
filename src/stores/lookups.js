// Shared cache for the option lists forms need (clients, projects to pick
// from, bank accounts, PPh types, employees, staff, configurable options,
// teams, roles and the system option lists under /options/<type>).
// Each list is fetched once and reused across pages for TTL_MS; concurrent
// calls share one request. Kept apart from the feature stores on purpose:
// e.g. projectStore.projects is the paginated Projects list, so forms that
// filled their project picker from it showed only that page.
//
//   const lookups = useLookupStore();
//   await lookups.ensure("clients");             // no request if fresh
//   lookups.clients                               // reactive list
//   lookups.ensure("options", "subscription_service_type"); lookups.optionsFor("subscription_service_type")
//   lookups.ensure("systemOptions", "employment-types"); lookups.systemOptionsFor("employment-types")
//   lookups.invalidate("clients")                 // after creating a client
import { defineStore } from "pinia";
import { axiosInstance } from "@/plugins/axios";

const TTL_MS = 5 * 60 * 1000;

const SOURCES = {
  clients: () => axiosInstance.get("/clients").then((r) => r.data.data ?? []),
  // The whole list (pickers and filters must offer every project; includes budget).
  projects: () => axiosInstance.get("/projects/all/paginated", { params: { row_per_page: 1000 } }).then((r) => r.data.data?.data ?? []),
  bankAccounts: () => axiosInstance.get("/bank-accounts").then((r) => r.data.data ?? []),
  pphTypes: () => axiosInstance.get("/options/pph-types").then((r) => r.data.data ?? []),
  employees: () => axiosInstance.get("employees").then((r) => r.data.data ?? []),
  staffOptions: () => axiosInstance.get("/staff-tasks/staff-options").then((r) => r.data.data ?? []),
  options: (category) => axiosInstance.get("/configurable-options", { params: { category } }).then((r) => r.data.data ?? []),
  teams: () => axiosInstance.get("teams").then((r) => r.data.data ?? []),
  roles: () => axiosInstance.get("/roles").then((r) => r.data.data ?? []),
  // System option lists: /options/<type>, e.g. "employment-types",
  // "job-statuses", "work-locations", "skill-levels", "ptkp-statuses",
  // "bank-names", "departments", "preferred-languages", "leave-types".
  systemOptions: (type) => axiosInstance.get(`/options/${type}`).then((r) => r.data.data ?? []),
};

const inflight = new Map(); // cacheKey -> Promise

export const useLookupStore = defineStore("lookups", {
  state: () => ({
    clients: [],
    projects: [],
    bankAccounts: [],
    pphTypes: [],
    employees: [],
    staffOptions: [],
    options: {}, // category -> list
    teams: [],
    roles: [],
    systemOptions: {}, // type -> list
    fetchedAt: {}, // cacheKey -> timestamp
  }),
  getters: {
    optionsFor: (state) => (category) => state.options[category] ?? [],
    systemOptionsFor: (state) => (type) => state.systemOptions[type] ?? [],
  },
  actions: {
    // Resolves to the list; no request while it's fresh unless `force`.
    async ensure(name, arg = null, { force = false } = {}) {
      if (!SOURCES[name]) throw new Error(`Unknown lookup: ${name}`);
      const key = arg ? `${name}:${arg}` : name;
      const keyed = name === "options" || name === "systemOptions"; // lists per argument
      const read = () => (keyed ? this[name][arg] ?? [] : this[name]);
      if (!force && Date.now() - (this.fetchedAt[key] ?? 0) < TTL_MS) return read();
      if (inflight.has(key)) return inflight.get(key);
      const request = SOURCES[name](arg)
        .then((list) => {
          if (keyed) this[name] = { ...this[name], [arg]: list };
          else this[name] = list;
          this.fetchedAt[key] = Date.now();
          return list;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, request);
      return request;
    },
    // Several at once: ensureAll(["clients", "projects", ["options", "x"]])
    ensureAll(names) {
      return Promise.all(names.map((n) => (Array.isArray(n) ? this.ensure(n[0], n[1]) : this.ensure(n))));
    },
    invalidate(name) {
      for (const k of Object.keys(this.fetchedAt)) if (k === name || k.startsWith(`${name}:`)) delete this.fetchedAt[k];
    },
  },
});
