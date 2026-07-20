import type { DOMMatch, DOMAnchor } from "./types";

function extractDataset(el: Element): Record<string, string> {
  const htmlEl = el as HTMLElement;
  const data: Record<string, string> = {};
  for (const key of Object.keys(htmlEl.dataset)) {
    data[key] = htmlEl.dataset[key] ?? "";
  }
  return data;
}

function getSiblingText(el: Element, direction: "previous" | "next"): string {
  const sibling = direction === "previous"
    ? el.previousElementSibling
    : el.nextElementSibling;
  if (!sibling) return "";
  const text = sibling.textContent ?? "";
  return text.length > 100 ? text.slice(0, 100) + "..." : text;
}

function getChildSummary(el: Element): string {
  const children = Array.from(el.children);
  if (children.length === 0) return "(no children)";
  const tags = children.slice(0, 5).map((c) => c.tagName.toLowerCase());
  const more = children.length > 5 ? ` +${children.length - 5} more` : "";
  return tags.join(", ") + more;
}

function getVisibleText(el: Element): string {
  let text = "";
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
    }
  }
  return text.trim().length > 200 ? text.trim().slice(0, 200) + "..." : text.trim();
}

function scoreAnchor(match: DOMMatch): number {
  let score = 0;

  if (match.attributes["id"]) score += 100;

  if (match.selector.includes("#")) score += 80;

  const text = match.text.toLowerCase();
  if (text.includes(match.matchedKeyword)) score += 30;

  if (match.tagName === "button" || match.tagName === "a" || match.tagName === "div") {
    score += 10;
  }

  if (match.hierarchy.length <= 4) score += 5;

  if (match.attributes["class"]) score += 5;

  return score;
}

export function selectAnchors(
  domMatches: readonly DOMMatch[],
  maxAnchors = 3,
): DOMAnchor[] {
  if (domMatches.length === 0) return [];

  const scored = domMatches
    .map((m) => ({ match: m, score: scoreAnchor(m) }))
    .sort((a, b) => b.score - a.score);

  const selected: DOMAnchor[] = [];
  const seenSelectors = new Set<string>();

  for (const { match } of scored) {
    if (selected.length >= maxAnchors) break;
    if (seenSelectors.has(match.selector)) continue;
    seenSelectors.add(match.selector);

    const el = document.querySelector(match.selector);
    if (!el) continue;

    selected.push({
      selector: match.selector,
      xpath: match.xpath,
      tagName: match.tagName,
      id: match.attributes["id"] ?? "",
      className: match.attributes["class"] ?? "",
      dataset: extractDataset(el),
      hierarchy: match.hierarchy,
      parentChain: match.parentChain,
      siblingBefore: getSiblingText(el, "previous"),
      siblingAfter: getSiblingText(el, "next"),
      childSummary: getChildSummary(el),
      visibleText: getVisibleText(el),
      nearbyText: match.text,
      attributes: match.attributes,
      matchedKeyword: match.matchedKeyword,
    });
  }

  return selected;
}
