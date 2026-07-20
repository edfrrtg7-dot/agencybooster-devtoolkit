import type { InvestigationDiffReport } from "./diff-types";
import type { IgnoredChange, EvidenceItem } from "./semantic-types";

const NOISE_SELECTORS = [
  "online", "users", "counter", "badge", "notification",
  "clock", "timer", "session", "refresh", "lastRefresh",
  "notification-count", "unread-count", "mail-count",
];

const NOISE_STORAGE_KEYS = [
  "lastRefresh", "lastSeen", "sessionStart", "sessionTimer",
  "notificationCount", "unreadCount", "mailCount",
  "onlineUsers", "clockSync",
];

export function detectNoise(
  diff: InvestigationDiffReport,
): IgnoredChange[] {
  const ignored: IgnoredChange[] = [];

  for (const change of diff.dom.modified) {
    const path = change.path.toLowerCase();
    if (NOISE_SELECTORS.some((n) => path.includes(n))) {
      ignored.push({
        path: change.path,
        reason: "Counter/timer/notification change detected",
        category: "noise",
      });
    }
  }

  for (const change of diff.dom.added) {
    const path = change.path.toLowerCase();
    if (NOISE_SELECTORS.some((n) => path.includes(n))) {
      ignored.push({
        path: change.path,
        reason: "Counter/timer/notification element added",
        category: "noise",
      });
    }
  }

  for (const change of diff.storage.changedKeys) {
    const path = change.path.toLowerCase();
    if (NOISE_STORAGE_KEYS.some((n) => path.includes(n.toLowerCase()))) {
      ignored.push({
        path: change.path,
        reason: "Session/timer/counter storage change",
        category: "noise",
      });
    }
  }

  for (const name of diff.metadata.noiseIgnored) {
    ignored.push({
      path: `metadata.${name}`,
      reason: "Metadata noise filtered",
      category: "metadata",
    });
  }

  return ignored;
}

export function isNoiseChange(
  path: string,
  ignoredPaths: readonly IgnoredChange[],
): boolean {
  return ignoredPaths.some((i) => i.path === path);
}

export function buildNoiseEvidence(): EvidenceItem {
  return {
    type: "metadata",
    description: "Noise changes filtered (counters, timers, notifications)",
  };
}
