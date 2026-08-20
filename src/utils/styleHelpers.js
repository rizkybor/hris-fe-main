/**
 * Get Tailwind CSS classes for priority badge
 * @param {string} priority - Priority level (low, medium, high, urgent)
 * @returns {string} Tailwind CSS classes
 */
export const getPriorityColor = (priority) => {
  const colors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };
  return colors[priority?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

/**
 * Get Tailwind CSS classes for level badge
 * @param {string} level - Skill level (Expert, Intermediate, Beginner)
 * @returns {string} Tailwind CSS classes
 */
export const getLevelColor = (level) => {
  const colors = {
    Expert: "bg-purple-100 text-purple-700",
    Advanced: "bg-indigo-100 text-indigo-700",
    Intermediate: "bg-blue-100 text-blue-700",
    Beginner: "bg-green-100 text-green-700",
  };
  return colors[level] || "bg-gray-100 text-gray-700";
};

export const getStatusColor = (status) => {
  const colors = {
    active: "bg-green-100 text-green-700",
    forming: "bg-blue-100 text-blue-700",
    planning: "bg-purple-100 text-purple-700",
    dormant: "bg-gray-100 text-gray-700",
  };
  return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

/**
 * Get Tailwind CSS classes for an employee's job status (active, on_leave, resigned)
 * @param {string} status - JobStatus enum value
 * @returns {string} Tailwind CSS classes
 */
export const getJobStatusColor = (status) => {
  const colors = {
    active: "bg-green-100 text-green-700",
    on_leave: "bg-yellow-100 text-yellow-700",
    resigned: "bg-red-100 text-red-700",
  };
  return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

export const getLeaveTypeBadgeClass = (type) => {
  const map = {
    annual: "bg-blue-100 text-blue-700",
    sick: "bg-red-100 text-red-700",
    personal: "bg-purple-100 text-purple-700",
    emergency: "bg-orange-100 text-orange-700",
    maternity: "bg-pink-100 text-pink-700",
  };
  return map[type?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

export const getLeaveRequestStatusBadgeClass = (status) => {
  const map = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return map[status?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

/**
 * Fixed swatch palette for a Project Task's Type badge / Task Detail
 * accent color -- a closed set of keys (matches App\Enums\TaskColor on the
 * backend, which only validates the key, not these classes), never a raw
 * hex value, so every task-type badge stays visually consistent with the
 * rest of the app's fixed-palette badges (priority, status, etc).
 */
export const TASK_TYPE_COLORS = [
  { key: "blue", label: "Blue", bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-500", borderLeft: "border-l-blue-500", dot: "bg-blue-500", ring: "ring-blue-500", accentBg: "bg-blue-50", accentBorder: "border-blue-500" },
  { key: "emerald", label: "Emerald", bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-500", borderLeft: "border-l-emerald-500", dot: "bg-emerald-500", ring: "ring-emerald-500", accentBg: "bg-emerald-50", accentBorder: "border-emerald-500" },
  { key: "amber", label: "Amber", bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-500", borderLeft: "border-l-amber-500", dot: "bg-amber-500", ring: "ring-amber-500", accentBg: "bg-amber-50", accentBorder: "border-amber-500" },
  { key: "rose", label: "Rose", bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-500", borderLeft: "border-l-rose-500", dot: "bg-rose-500", ring: "ring-rose-500", accentBg: "bg-rose-50", accentBorder: "border-rose-500" },
  { key: "violet", label: "Violet", bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-500", borderLeft: "border-l-violet-500", dot: "bg-violet-500", ring: "ring-violet-500", accentBg: "bg-violet-50", accentBorder: "border-violet-500" },
  { key: "cyan", label: "Cyan", bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-500", borderLeft: "border-l-cyan-500", dot: "bg-cyan-500", ring: "ring-cyan-500", accentBg: "bg-cyan-50", accentBorder: "border-cyan-500" },
  { key: "orange", label: "Orange", bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-500", borderLeft: "border-l-orange-500", dot: "bg-orange-500", ring: "ring-orange-500", accentBg: "bg-orange-50", accentBorder: "border-orange-500" },
  { key: "pink", label: "Pink", bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-500", borderLeft: "border-l-pink-500", dot: "bg-pink-500", ring: "ring-pink-500", accentBg: "bg-pink-50", accentBorder: "border-pink-500" },
  { key: "slate", label: "Slate", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-500", borderLeft: "border-l-slate-500", dot: "bg-slate-500", ring: "ring-slate-500", accentBg: "bg-slate-50", accentBorder: "border-slate-500" },
  { key: "indigo", label: "Indigo", bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-500", borderLeft: "border-l-indigo-500", dot: "bg-indigo-500", ring: "ring-indigo-500", accentBg: "bg-indigo-50", accentBorder: "border-indigo-500" },
  { key: "teal", label: "Teal", bg: "bg-teal-100", text: "text-teal-700", border: "border-teal-500", borderLeft: "border-l-teal-500", dot: "bg-teal-500", ring: "ring-teal-500", accentBg: "bg-teal-50", accentBorder: "border-teal-500" },
  { key: "fuchsia", label: "Fuchsia", bg: "bg-fuchsia-100", text: "text-fuchsia-700", border: "border-fuchsia-500", borderLeft: "border-l-fuchsia-500", dot: "bg-fuchsia-500", ring: "ring-fuchsia-500", accentBg: "bg-fuchsia-50", accentBorder: "border-fuchsia-500" },
];

const DEFAULT_TASK_TYPE_COLOR = { key: "gray", label: "Gray", bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-400", borderLeft: "border-l-gray-400", dot: "bg-gray-400", ring: "ring-gray-400", accentBg: "bg-gray-50", accentBorder: "border-gray-400" };

/**
 * @param {string|null|undefined} colorKey
 * @returns {{key:string,label:string,bg:string,text:string,border:string,borderLeft:string,dot:string,ring:string,accentBg:string,accentBorder:string}}
 */
export const getTaskTypeColorClasses = (colorKey) => {
  return TASK_TYPE_COLORS.find((c) => c.key === colorKey) || DEFAULT_TASK_TYPE_COLOR;
};
