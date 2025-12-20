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
