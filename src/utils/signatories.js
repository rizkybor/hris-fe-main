// Company signatories that have a scanned signature on file in the backend
// (hris-api App\Support\SignatureImage). Keep both lists in sync.
export const SIGNATORIES = ["Aldi PP, S.Ikom", "Andy Saputra, S.T.", "Rizky Ajie Kurniawan, S.Kom"];

// Same loose match as the backend: the degree after the comma is ignored
// and only the leading name has to match, since the same person can be
// "Aldi PP" on one record and "Aldi Pratama Putra" on another.
const SIGNATORY_PREFIXES = ["aldi", "andy saputra", "rizky ajie"];

export const isCompanySignatory = (name) => {
  if (!name) return false;
  const normalized = name.split(",")[0].trim().replace(/\s+/g, " ").toLowerCase();
  return SIGNATORY_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix} `));
};
