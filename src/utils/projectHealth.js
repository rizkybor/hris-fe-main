/**
 * Deadline risk formula
 * -----------------------------------------------------------------------
 * Parameters:
 *   totalDurationDays = end_date - start_date                 (planned length of the project)
 *   elapsedDays       = today - start_date, clamped [0, totalDurationDays]
 *   daysRemaining     = end_date - today                      (negative once overdue)
 *   expectedProgress  = elapsedDays / totalDurationDays * 100  (where a linear pace should be by now)
 *   progressGap       = expectedProgress - actualProgress     (positive = behind the expected pace)
 *
 * Thresholds (tunable):
 *   CRITICAL_DAYS_LEFT / CRITICAL_MIN_PROGRESS   -> e.g. "2 days left but only 40% done"
 *   AT_RISK_DAYS_LEFT / AT_RISK_MIN_PROGRESS     -> deadline is close and completion isn't near
 *   AT_RISK_PROGRESS_GAP                         -> way behind the linear pace regardless of deadline proximity
 *   BEHIND_PROGRESS_GAP                          -> mildly behind the linear pace
 *
 * Levels, evaluated in order (most severe wins): overdue > critical > at-risk > behind > on-track.
 */
export const RISK_THRESHOLDS = {
  CRITICAL_DAYS_LEFT: 3,
  CRITICAL_MIN_PROGRESS: 80,
  AT_RISK_DAYS_LEFT: 7,
  AT_RISK_MIN_PROGRESS: 90,
  AT_RISK_PROGRESS_GAP: 25,
  BEHIND_PROGRESS_GAP: 10,
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

/**
 * @param {{ start_date: string, end_date: string, status: string, progress: number }} project
 * @returns {null | { level: string, label: string, message: string, daysRemaining: number, expectedProgress: number, actualProgress: number }}
 */
export const getProjectHealth = (project) => {
  const { start_date, end_date, status } = project || {};
  if (!start_date || !end_date || status === "completed" || status === "cancelled") return null;

  const start = new Date(start_date);
  const end = new Date(end_date);
  const today = new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const totalDurationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_IN_MS));
  const elapsedDays = Math.min(
    totalDurationDays,
    Math.max(0, Math.ceil((today.getTime() - start.getTime()) / DAY_IN_MS))
  );
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / DAY_IN_MS);
  const expectedProgress = Math.round((elapsedDays / totalDurationDays) * 100);
  const actualProgress = Math.round(project.progress ?? 0);
  const progressGap = expectedProgress - actualProgress;

  const t = RISK_THRESHOLDS;

  if (daysRemaining < 0 && actualProgress < 100) {
    return {
      level: "overdue",
      label: "Overdue",
      message: `Deadline passed ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? "" : "s"} ago and the project is only ${actualProgress}% complete.`,
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  if (daysRemaining <= t.CRITICAL_DAYS_LEFT && actualProgress < t.CRITICAL_MIN_PROGRESS) {
    return {
      level: "critical",
      label: "Critical",
      message: `Only ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left until the deadline, but progress is just ${actualProgress}%.`,
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  if (
    (daysRemaining <= t.AT_RISK_DAYS_LEFT && actualProgress < t.AT_RISK_MIN_PROGRESS) ||
    progressGap >= t.AT_RISK_PROGRESS_GAP
  ) {
    return {
      level: "at-risk",
      label: "At Risk",
      message: `At today's pace the project should be around ${expectedProgress}% done, but it's at ${actualProgress}% with ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining.`,
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  if (progressGap >= t.BEHIND_PROGRESS_GAP) {
    return {
      level: "behind",
      label: "Behind Schedule",
      message: `Progress (${actualProgress}%) is slightly behind the expected pace (${expectedProgress}%) for this point in the timeline.`,
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  return {
    level: "on-track",
    label: "On Track",
    message: `Progress (${actualProgress}%) is keeping pace with the timeline (expected ${expectedProgress}%).`,
    daysRemaining,
    expectedProgress,
    actualProgress,
  };
};

export const PROJECT_HEALTH_BADGE_CLASS = {
  overdue: "bg-red-100 text-red-700",
  critical: "bg-red-100 text-red-700",
  "at-risk": "bg-orange-100 text-orange-700",
  behind: "bg-yellow-100 text-yellow-700",
  "on-track": "bg-green-100 text-green-700",
};
