// Option lists the employee wizard (create + edit) needs, from the shared
// lookups cache: loaded in parallel once when the wizard opens, so entering
// the Job / Emergency steps later renders at once with no requests.
import { useLookupStore } from "@/stores/lookups";

export const WIZARD_LOOKUPS = [
  "teams",
  "roles",
  ["systemOptions", "employment-types"],
  ["systemOptions", "job-statuses"],
  ["systemOptions", "work-locations"],
  ["systemOptions", "ptkp-statuses"],
  ["systemOptions", "bank-names"],
  ["systemOptions", "preferred-languages"],
];

export const loadWizardLookups = () =>
  useLookupStore()
    .ensureAll(WIZARD_LOOKUPS)
    .catch((error) => console.error("Failed to load wizard options:", error));
