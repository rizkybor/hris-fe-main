// A project task's assignees as a list, whatever the response shape:
// `assignees` (several), or only the older single `assignee` / `assignee_id`.
export const assigneesOf = (task) => {
  if (Array.isArray(task?.assignees)) return task.assignees;
  return task?.assignee ? [task.assignee] : [];
};

export const assigneeIdsOf = (task) => {
  if (Array.isArray(task?.assignee_ids)) return task.assignee_ids;
  if (Array.isArray(task?.assignees)) return task.assignees.map((a) => a.id);
  const id = task?.assignee?.id ?? task?.assignee_id;
  return id ? [id] : [];
};

// Local fields for a task after its assignees change (the list, the ids and
// the first one as the primary assignee), so the UI updates at once.
export const assigneeFields = (list) => ({
  assignees: list,
  assignee_ids: list.map((e) => e.id),
  assignee: list[0] ?? null,
  assignee_id: list[0]?.id ?? null,
});
