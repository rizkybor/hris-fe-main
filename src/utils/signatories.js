import { bareName } from "@/utils/personName";

export const SIGNATORIES = ["Aldi PP", "Andy Saputra", "Rizky Ajie Kurniawan"];

const SIGNATORY_PREFIXES = ["aldi", "andy saputra", "rizky ajie", "rizky aji"];

export const isCompanySignatory = (name) => {
  if (!name) return false;
  const normalized = bareName(name).toLowerCase();
  return SIGNATORY_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix} `));
};
