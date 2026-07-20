import type { ObjectTreeNode } from "./types";

const MAX_TREE_DEPTH = 6;
const MAX_CHILDREN = 20;

function getChildren(value: unknown): Array<{ name: string; value: unknown }> {
  if (Array.isArray(value)) {
    return value.slice(0, MAX_CHILDREN).map((item, i) => ({
      name: `[${i}]`,
      value: item,
    }));
  }

  if (typeof value === "object" && value !== null) {
    return Object.keys(value as Record<string, unknown>).slice(0, MAX_CHILDREN).map((key) => ({
      name: key,
      value: (value as Record<string, unknown>)[key],
    }));
  }

  return [];
}

function getChildCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object" && value !== null) return Object.keys(value as Record<string, unknown>).length;
  return 0;
}

function buildTree(
  name: string,
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): ObjectTreeNode {
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  const childCount = getChildCount(value);

  if (depth >= MAX_TREE_DEPTH || type === "null" || type === "string" || type === "number" || type === "boolean") {
    return { name, type, childCount: 0, children: [] };
  }

  if (typeof value === "object" && value !== null) {
    if (seen.has(value as object)) {
      return { name, type, childCount: 0, children: [{ name: "[circular]", type: "ref", childCount: 0, children: [] }] };
    }
    seen.add(value as object);
  }

  const rawChildren = getChildren(value);
  const children = rawChildren.map((child) =>
    buildTree(child.name, child.value, depth + 1, seen),
  );

  const totalChildren = childCount;
  if (totalChildren > MAX_CHILDREN) {
    children.push({ name: "...", type: "truncated", childCount: totalChildren - MAX_CHILDREN, children: [] });
  }

  return { name, type, childCount: totalChildren, children };
}

export function generateObjectTree(key: string, value: unknown): ObjectTreeNode {
  const seen = new WeakSet<object>();
  return buildTree(key, value, 0, seen);
}
