import type { InvestigationDiffReport } from "./diff-types";
import type { FocusContainer } from "./semantic-types";

export function resolveFocusContainers(
  diff: InvestigationDiffReport,
  manualContainers: readonly string[],
): FocusContainer[] {
  const containers: FocusContainer[] = [];

  for (const selector of manualContainers) {
    containers.push({ selector, mode: "manual", label: selector });
  }

  if (manualContainers.length === 0) {
    const anchors = diff.trace?.addedAnchors ?? [];
    for (const anchor of anchors) {
      const after = anchor.after;
      if (typeof after === "string" && after.length > 0) {
        containers.push({ selector: after, mode: "auto", label: `anchor: ${after}` });
      }
    }

    if (containers.length === 0) {
      for (const change of diff.dom.added) {
        const after = change.after;
        if (after && typeof after === "object" && "tagName" in after) {
          const tag = (after as { tagName: string }).tagName;
          if (tag) {
            containers.push({ selector: tag.toLowerCase(), mode: "auto", label: `detected: <${tag}>` });
          }
        }
      }
    }
  }

  return containers;
}

export function isInsideFocusContainer(
  path: string,
  containers: readonly FocusContainer[],
): boolean {
  if (containers.length === 0) return true;

  for (const container of containers) {
    const selector = container.selector.toLowerCase();
    const pathLower = path.toLowerCase();

    if (pathLower.includes(selector)) return true;

    if (pathLower.startsWith("dom.") && pathLower.includes(selector.replace(/[#.]/g, ""))) {
      return true;
    }
  }

  return false;
}
