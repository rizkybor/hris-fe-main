// Usage status shared by Fixed Cost, SDM Resource and Infrastructure Tool
// (backend: App\Enums\OperationalCostStatus). Only "active" items count
// toward the Operational Cost totals.
export const OPERATIONAL_COST_STATUSES = [
  { value: "active", label: "Digunakan" },
  { value: "inactive", label: "Tidak Digunakan" },
];

export const operationalCostStatusLabel = (value) =>
  OPERATIONAL_COST_STATUSES.find((s) => s.value === value)?.label ?? value ?? "-";

export const operationalCostStatusClass = (value) =>
  value === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500";

// Expiry state of an in-use item, for the table's Expired column: already
// expired, expiring within 30 days, or fine. Items not in use aren't flagged.
export const expiryState = (item) => {
  if (item?.status !== "active" || !item?.expired_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${String(item.expired_date).slice(0, 10)}T00:00:00`);
  const days = Math.round((expiry - today) / 86400000);
  if (days < 0) return { label: "Sudah lewat", class: "text-red-600" };
  if (days <= 30) return { label: days === 0 ? "Hari ini" : `${days} hari lagi`, class: "text-amber-600" };
  return null;
};
