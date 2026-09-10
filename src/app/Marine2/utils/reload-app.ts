/**
 * Hard reload for the MFD. The stock app registers a Workbox service worker that
 * precaches the bundle, so after a deploy the Simrad's webview kept serving the
 * old build until the MFD was rebooted. This drops every service worker and
 * cache first, then reloads from the GX.
 */
export async function reloadApp(): Promise<void> {
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister()))
    }
  } catch {
    /* ignore */
  }
  try {
    if ("caches" in window) {
      const keys = await window.caches.keys()
      await Promise.all(keys.map((k) => window.caches.delete(k)))
    }
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href)
  url.searchParams.set("r", String(Date.now()))
  window.location.replace(url.toString())
}

/** Called at startup instead of registering the worker: no offline cache on a boat display. */
export function unregisterServiceWorkers(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => undefined)
  }
}
