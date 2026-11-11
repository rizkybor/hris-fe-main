import { t } from "@/i18n";

// `label` is a getter so it follows the interface language at read time
// (render functions and computeds re-run when the locale changes).
const status = (value, cls) => ({
  value,
  get label() {
    return t(`documents.proposal.status.${value}`);
  },
  class: cls,
});

export const PROPOSAL_STATUSES = [
  status("draft", "bg-gray-100 text-gray-700"),
  status("sent", "bg-blue-50 text-blue-700"),
  status("accepted", "bg-green-50 text-green-700"),
  status("rejected", "bg-red-50 text-red-600"),
];

export const proposalStatus = (value) =>
  PROPOSAL_STATUSES.find((s) => s.value === value) ?? { value, label: value, class: "bg-gray-100 text-gray-700" };
