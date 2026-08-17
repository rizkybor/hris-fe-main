export const getSkillLevelBadgeClass = (skillLevel) => {
  const classes = {
    expert: "bg-purple-100 text-purple-700",
    intermediate: "bg-blue-100 text-blue-700",
    beginner: "bg-green-100 text-green-700",
  };
  return classes[skillLevel?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

export const getStatusBadgeClass = (status) => {
  const classes = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    growing: "bg-blue-100 text-blue-700",
  };
  return classes[status?.toLowerCase()] || "bg-purple-100 text-purple-700";
};

export const getPriorityColor = (priority) => {
  const priorityConfig = {
    high: "bg-red-100 text-red-600",
    medium: "bg-yellow-100 text-yellow-600",
    low: "bg-green-100 text-green-600",
  };
  return priorityConfig[priority] || priorityConfig["medium"];
};

export const getProjectStatusColor = (status) => {
  const statusConfig = {
    active: "bg-[#EBF8FF] text-[#1E40AF]",
    completed: "bg-[#F0FDF4] text-[#166534]",
    "on-hold": "bg-[#FEF3C7] text-[#92400E]",
    overdue: "bg-[#FEE2E2] text-[#991B1B]",
  };
  return statusConfig[status] || "bg-gray-100 text-gray-500";
};

export const getProgressColor = (progress) => {
  if (progress >= 80) return "bg-green-500";
  if (progress >= 60) return "bg-blue-500";
  if (progress >= 40) return "bg-yellow-500";
  return "bg-red-500";
};

export const getRoleBadgeClass = (role) => {
  const classes = {
    manager: "bg-indigo-50 text-indigo-600 border-indigo-100",
    hr: "bg-blue-50 text-blue-600 border-blue-100",
    finance: "bg-emerald-50 text-emerald-600 border-emerald-100",
    employee: "bg-violet-50 text-violet-600 border-violet-100",
  };
  return classes[role?.toLowerCase()] || "bg-gray-50 text-gray-600 border-gray-100";
};

export const getRoleLabel = (role) => {
  const labels = {
    manager: "Manager",
    hr: "HR",
    finance: "Finance",
    employee: "Employee",
  };
  return labels[role?.toLowerCase()] || role;
};
