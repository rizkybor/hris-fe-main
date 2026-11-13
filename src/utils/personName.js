const PREFIX_TITLES = /^((?:(?:prof|dr|drs|dra|ir|drg)\.?|hj?\.)\s+)*/i;

export const bareName = (name) => {
  if (!name) return name || "";
  const main = String(name).replace(/\s+/g, " ").trim().split(",")[0].trim();
  const bare = main.replace(PREFIX_TITLES, "").trim();
  return bare || main;
};

export const displayName = (fullName, showDegree) =>
  showDegree ? String(fullName || "").replace(/\s+/g, " ").trim() : bareName(fullName);
