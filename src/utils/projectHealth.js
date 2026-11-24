export const RISK_THRESHOLDS = {
  CRITICAL_DAYS_LEFT: 3,
  CRITICAL_MIN_PROGRESS: 80,
  AT_RISK_DAYS_LEFT: 7,
  AT_RISK_MIN_PROGRESS: 90,
  AT_RISK_PROGRESS_GAP: 25,
  BEHIND_PROGRESS_GAP: 10,
};

import { t as translate } from "@/i18n";

const DAY_IN_MS = 1000 * 60 * 60 * 24;

// Schedule health follows the project's status:
// - active (and older records without a known status): progress is judged
//   against the timeline (overdue / critical / at-risk / behind / on-track);
// - planning: work hasn't started, so no pace judgement; it only notes when
//   the start date has already passed ("not-started") or is still ahead;
// - on_hold: the clock is paused, no pace judgement ("paused");
// - draft, completed, cancelled: nothing to show.
export const getProjectHealth = (project) => {
  const { start_date, end_date, status } = project || {};
  if (!start_date || !end_date || ["completed", "cancelled", "draft"].includes(status)) return null;

  const start = new Date(start_date);
  const end = new Date(end_date);
  const today = new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  if (status === "planning" || status === "on_hold") {
    const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / DAY_IN_MS);
    const daysToStart = Math.ceil((start.getTime() - today.getTime()) / DAY_IN_MS);
    const actualProgress = Math.round(project.progress ?? 0);
    const base = { daysRemaining, daysToStart, expectedProgress: null, actualProgress };
    if (status === "on_hold") {
      return {
        ...base,
        level: "paused",
        label: translate("projects.health.paused"),
        message: translate("projects.health.pausedMessage", { progress: actualProgress }),
      };
    }
    if (daysToStart > 0) {
      return {
        ...base,
        level: "planning",
        label: translate("projects.health.planning"),
        message: translate("projects.health.planningMessage", { n: daysToStart }, daysToStart),
      };
    }
    return {
      ...base,
      level: "not-started",
      label: translate("projects.health.notStarted"),
      message: translate(
        daysRemaining < 0 ? "projects.health.notStartedPastEndMessage" : "projects.health.notStartedMessage",
        { n: Math.abs(daysToStart), end: Math.abs(daysRemaining) },
        Math.abs(daysToStart)
      ),
    };
  }

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
      label: translate("projects.health.overdue"),
      message: translate(
        "projects.health.overdueMessage",
        { n: Math.abs(daysRemaining), progress: actualProgress },
        Math.abs(daysRemaining)
      ),
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  if (daysRemaining <= t.CRITICAL_DAYS_LEFT && actualProgress < t.CRITICAL_MIN_PROGRESS) {
    return {
      level: "critical",
      label: translate("projects.health.critical"),
      message: translate(
        "projects.health.criticalMessage",
        { n: daysRemaining, progress: actualProgress },
        daysRemaining
      ),
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
      label: translate("projects.health.atRisk"),
      message: translate(
        "projects.health.atRiskMessage",
        { n: daysRemaining, expected: expectedProgress, progress: actualProgress },
        daysRemaining
      ),
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  if (progressGap >= t.BEHIND_PROGRESS_GAP) {
    return {
      level: "behind",
      label: translate("projects.health.behind"),
      message: translate("projects.health.behindMessage", {
        progress: actualProgress,
        expected: expectedProgress,
      }),
      daysRemaining,
      expectedProgress,
      actualProgress,
    };
  }

  return {
    level: "on-track",
    label: translate("projects.health.onTrack"),
    message: translate("projects.health.onTrackMessage", {
      progress: actualProgress,
      expected: expectedProgress,
    }),
    daysRemaining,
    expectedProgress,
    actualProgress,
  };
};

// Levels that are a schedule problem (the rest are information only).
export const RISK_LEVELS = ["overdue", "critical", "at-risk", "behind"];

export const PROJECT_HEALTH_BADGE_CLASS = {
  "not-started": "bg-yellow-100 text-yellow-700",
  planning: "bg-gray-100 text-gray-700",
  paused: "bg-gray-100 text-gray-700",
  overdue: "bg-red-100 text-red-700",
  critical: "bg-red-100 text-red-700",
  "at-risk": "bg-orange-100 text-orange-700",
  behind: "bg-yellow-100 text-yellow-700",
  "on-track": "bg-green-100 text-green-700",
};
