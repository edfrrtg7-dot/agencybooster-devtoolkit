import type { InvestigationConfig, DOMMatch } from "./types";

function buildSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector = `#${current.id}`;
      parts.unshift(selector);
      break;
    }
    if (current.className && typeof current.className === "string") {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join(".");
      if (cls) selector += `.${cls}`;
    }
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

function buildXPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    let index = 1;
    let sibling = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === current.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
    current = current.parentElement;
  }
  return "/" + parts.join("/");
}

function getHierarchy(el: Element): string[] {
  const chain: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    let desc = current.tagName.toLowerCase();
    if (current.id) desc += `#${current.id}`;
    chain.push(desc);
    current = current.parentElement;
  }
  return chain;
}

function getParentChain(el: Element): string[] {
  const chain: string[] = [];
  let current: Element | null = el.parentElement;
  let depth = 0;
  while (current && depth < 5) {
    chain.push(current.tagName.toLowerCase());
    current = current.parentElement;
    depth++;
  }
  return chain;
}

function getNearbyText(el: Element): string {
  const parent = el.parentElement;
  if (!parent) return "";
  const text = parent.textContent ?? "";
  return text.length > 200 ? text.slice(0, 200) + "..." : text;
}

function matchesKeywords(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

export function investigateDOM(
  keywords: readonly string[],
  config: InvestigationConfig,
): { matches: DOMMatch[]; truncated: boolean } {
  const matches: DOMMatch[] = [];
  const maxMatches = Math.min(config.maxObjects, 500);

  const walker = document.createTreeWalker(
    document.documentElement,
    NodeFilter.SHOW_ELEMENT,
    null,
  );

  let node: Element | null;
  while ((node = walker.nextNode() as Element | null)) {
    if (matches.length >= maxMatches) {
      return { matches, truncated: true };
    }

    const tagText = node.tagName.toLowerCase() + " " + (node.textContent ?? "");
    const kw = matchesKeywords(tagText, keywords);
    if (!kw) continue;

    const text = node.textContent ?? "";
    const truncatedText = text.length > 500 ? text.slice(0, 500) + "..." : text;

    const attrs: Record<string, string> = {};
    for (const attr of Array.from(node.attributes).slice(0, 10)) {
      attrs[attr.name] = attr.value.length > 200 ? attr.value.slice(0, 200) + "..." : attr.value;
    }

    matches.push({
      tagName: node.tagName.toLowerCase(),
      selector: buildSelector(node),
      xpath: buildXPath(node),
      text: truncatedText,
      matchedKeyword: kw,
      hierarchy: getHierarchy(node),
      parentChain: getParentChain(node),
      childCount: node.children.length,
      attributes: attrs,
    });
  }

  return { matches, truncated: false };
}
