import type { SchemaSummary } from "./types";

function inferType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const itemType = inferType(value[0]);
    if (itemType.endsWith("[]")) return itemType;
    if (itemType === "object") return "object[]";
    return `${itemType}[]`;
  }
  return typeof value;
}

function inferObjectSchema(obj: Record<string, unknown>): SchemaSummary {
  const properties: Record<string, string> = {};
  let arrayItemSchema: Record<string, string> | undefined;

  for (const [key, value] of Object.entries(obj)) {
    const type = inferType(value);
    properties[key] = type;

    if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0])) {
      const itemSchema: Record<string, string> = {};
      for (const [k, v] of Object.entries(value[0] as Record<string, unknown>)) {
        itemSchema[k] = inferType(v);
      }
      arrayItemSchema = itemSchema;
    }
  }

  return {
    rootType: "object",
    properties,
    ...(arrayItemSchema ? { arrayItemSchema } : {}),
  };
}

export function generateSchema(value: unknown): SchemaSummary {
  if (value === null || value === undefined) {
    return { rootType: "null", properties: {} };
  }

  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === "object" && value[0] !== null && !Array.isArray(value[0])) {
      return inferObjectSchema(value[0] as Record<string, unknown>);
    }
    return {
      rootType: "array",
      properties: { length: "number" },
    };
  }

  if (typeof value === "object") {
    return inferObjectSchema(value as Record<string, unknown>);
  }

  return {
    rootType: typeof value,
    properties: {},
  };
}
