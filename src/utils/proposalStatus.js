export const PROPOSAL_STATUSES = [
  { value: "draft", label: "Draft", class: "bg-gray-100 text-gray-700" },
  { value: "sent", label: "Terkirim", class: "bg-blue-50 text-blue-700" },
  { value: "accepted", label: "Diterima", class: "bg-green-50 text-green-700" },
  { value: "rejected", label: "Ditolak", class: "bg-red-50 text-red-600" },
];

export const proposalStatus = (value) =>
  PROPOSAL_STATUSES.find((s) => s.value === value) ?? { value, label: value, class: "bg-gray-100 text-gray-700" };
