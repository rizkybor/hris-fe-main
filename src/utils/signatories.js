// Company signatories that have a scanned signature on file in the backend
// (hris-api App\Support\SignatureImage). Keep both lists in sync. Names are
// listed without titles/degrees: on the PDF each one shows the way that
// person chose in My Profile (show degree), and the signature is found
// either way.
import { bareName } from "@/utils/personName";

export const SIGNATORIES = ["Aldi PP", "Andy Saputra", "Rizky Ajie Kurniawan"];

// Same loose match as the backend: titles and degrees are ignored and only
// the leading name has to match ("Aldi PP" / "Aldi Pratama Putra";
// the account name is spelled "Rizky Aji").
const SIGNATORY_PREFIXES = ["aldi", "andy saputra", "rizky ajie", "rizky aji"];

export const isCompanySignatory = (name) => {
  if (!name) return false;
  const normalized = bareName(name).toLowerCase();
  return SIGNATORY_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix} `));
};
