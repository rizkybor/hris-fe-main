// Same rules as the backend (hris-api App\Support\PersonName): names are
// typed with prefix titles before the name and degrees after a comma
// ("Dr. Budi Santoso, S.Kom., M.M."). The API already sends every user's
// `name` the way that person chose to show it (My Profile → show degree);
// this is for previews and loose matching on the client.
const PREFIX_TITLES = /^((?:(?:prof|dr|drs|dra|ir|drg)\.?|hj?\.)\s+)*/i;

export const bareName = (name) => {
  if (!name) return name || "";
  const main = String(name).replace(/\s+/g, " ").trim().split(",")[0].trim();
  const bare = main.replace(PREFIX_TITLES, "").trim();
  return bare || main;
};

export const displayName = (fullName, showDegree) =>
  showDegree ? String(fullName || "").replace(/\s+/g, " ").trim() : bareName(fullName);
