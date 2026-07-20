import type { SemanticRule } from "./semantic-types";

const FINANCE_RULE: SemanticRule = {
  name: "Finance",
  profile: "Finance",
  storageMappings: {
    selectedDates: "Date range changed",
    selectedTimes: "Time range changed",
    transactions: "Transaction history updated",
    balance: "Balance updated",
    credits: "Credits updated",
    collapsed: "Widget collapsed",
    closed: "Widget closed",
    lastRefresh: "Widget refreshed",
    dateRange: "Date range changed",
    filterState: "Filter state changed",
    viewMode: "View mode changed",
  },
  domPatterns: [
    { selector: "table", label: "Transaction table", keywords: ["transaction", "table", "row"] },
    { selector: ".balance", label: "Balance display", keywords: ["balance", "amount", "total"] },
    { selector: ".date-range", label: "Date range selector", keywords: ["date", "range", "calendar"] },
  ],
  noisePatterns: ["online", "counter", "notification", "badge", "timer"],
};

const SENDER_RULE: SemanticRule = {
  name: "Sender",
  profile: "Sender",
  storageMappings: {
    selectedDates: "Date range changed",
    selectedTimes: "Time range changed",
    collapsed: "Widget collapsed",
    closed: "Widget closed",
    lastRefresh: "Widget refreshed",
    composeState: "Compose state changed",
    recipientList: "Recipients changed",
  },
  domPatterns: [
    { selector: ".compose", label: "Compose form", keywords: ["compose", "editor", "recipient"] },
    { selector: ".message-list", label: "Message list", keywords: ["message", "inbox", "list"] },
  ],
  noisePatterns: ["online", "counter", "notification", "badge", "timer"],
};

const GENERIC_RULE: SemanticRule = {
  name: "Generic",
  profile: "*",
  storageMappings: {
    lastRefresh: "Widget refreshed",
    collapsed: "Widget collapsed",
    closed: "Widget closed",
    filterState: "Filter state changed",
    viewMode: "View mode changed",
  },
  domPatterns: [],
  noisePatterns: ["online", "counter", "notification", "badge", "timer", "clock", "session"],
};

const RULES: readonly SemanticRule[] = [FINANCE_RULE, SENDER_RULE, GENERIC_RULE];

export function getRule(profileName: string): SemanticRule {
  const found = RULES.find((r) => r.profile === profileName);
  return found ?? GENERIC_RULE;
}

export function listRules(): readonly SemanticRule[] {
  return RULES;
}
