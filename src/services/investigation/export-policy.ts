import type { ExportPolicyType, ExportLimits, DEFAULT_EXPORT_LIMITS } from "./types";

export interface ExportPolicy {
  readonly name: ExportPolicyType;
  readonly description: string;
  readonly limits: ExportLimits;
}

const SMART_LIMITS: ExportLimits = {
  maxJsonSize: 500_000,
  maxRecursionDepth: 8,
  maxObjectProperties: 200,
  maxArrayElements: 100,
  maxStringLength: 10_000,
};

const FULL_LIMITS: ExportLimits = {
  maxJsonSize: 2_000_000,
  maxRecursionDepth: 15,
  maxObjectProperties: 1000,
  maxArrayElements: 1000,
  maxStringLength: 100_000,
};

export const POLICIES: Readonly<Record<ExportPolicyType, ExportPolicy>> = {
  smart: {
    name: "smart",
    description: "Export complete JSON when practical. Apply limits to very large structures. Preserve structural information on truncation. Never silently discard.",
    limits: SMART_LIMITS,
  },
  full: {
    name: "full",
    description: "Export complete parsed JSON whenever possible. Only stop when hard safety limits are exceeded.",
    limits: FULL_LIMITS,
  },
};

export function getPolicy(type: ExportPolicyType): ExportPolicy {
  return POLICIES[type];
}

export function getDefaultLimits(type: ExportPolicyType): ExportLimits {
  return POLICIES[type].limits;
}
