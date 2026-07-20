import type { InvestigationProfile } from "./types";

export const PROFILES: Readonly<Record<string, InvestigationProfile>> = {
  Finance: {
    name: "Finance",
    keywords: [
      "finance",
      "balance",
      "credit",
      "transaction",
      "payment",
      "money",
      "statistics",
      "total",
    ],
    enabledModules: ["dom", "runtime", "storage"],
  },
  Sender: {
    name: "Sender",
    keywords: ["sender", "chat-sender", "message", "send", "delay", "interval"],
    enabledModules: ["dom", "runtime", "storage"],
  },
  IceBreaker: {
    name: "IceBreaker",
    keywords: ["icebreaker", "ice-breaker", "greeting", "intro", "opener"],
    enabledModules: ["dom", "runtime", "storage"],
  },
  Storage: {
    name: "Storage",
    keywords: [],
    enabledModules: ["storage"],
  },
  Custom: {
    name: "Custom",
    keywords: [],
    enabledModules: ["dom", "runtime", "storage"],
  },
};

export function getProfile(name: string): InvestigationProfile {
  return PROFILES[name] ?? PROFILES.Custom;
}

export function listProfiles(): readonly string[] {
  return Object.keys(PROFILES);
}
