export function getPageInfo(): { url: string; title?: string } {
  return {
    url: window.location.href,
    title: document.title,
  };
}
