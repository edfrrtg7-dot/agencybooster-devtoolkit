import type { DOMAnchor, DOMMatch } from "./types";

function buildSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
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

function matchesKeywords(text: string, keywords: readonly string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) return kw;
  }
  return null;
}

export function traceFromAnchor(
  anchor: DOMAnchor,
  keywords: readonly string[],
): DOMMatch[] {
  const matches: DOMMatch[] = [];
  const anchorEl = document.querySelector(anchor.selector);
  if (!anchorEl) return matches;

  const searchRoots: Element[] = [];

  if (anchorEl.parentElement) searchRoots.push(anchorEl.parentElement);
  if (anchorEl.parentElement?.parentElement) {
    searchRoots.push(anchorEl.parentElement.parentElement);
  }

  for (const root of searchRoots) {
    const children = Array.from(root.children);
    for (const child of children) {
      if (child === anchorEl) continue;

      const tagText = child.tagName.toLowerCase() + " " + (child.textContent ?? "");
      const kw = matchesKeywords(tagText, keywords);
      if (!kw) continue;

      const text = child.textContent ?? "";
      const truncatedText = text.length > 500 ? text.slice(0, 500) + "..." : text;

      const attrs: Record<string, string> = {};
      for (const attr of Array.from(child.attributes).slice(0, 10)) {
        attrs[attr.name] = attr.value.length > 200 ? attr.value.slice(0, 200) + "..." : attr.value;
      }

      matches.push({
        tagName: child.tagName.toLowerCase(),
        selector: buildSelector(child),
        xpath: buildXPath(child),
        text: truncatedText,
        matchedKeyword: kw,
        hierarchy: getHierarchy(child),
        parentChain: getParentChain(child),
        childCount: child.children.length,
        attributes: attrs,
      });
    }
  }

  return matches;
}
