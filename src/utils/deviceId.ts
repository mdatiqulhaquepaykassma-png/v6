export function getDeviceId(): string {
  const KEY = "dt_device_id";
  if (typeof window === "undefined" || !window.localStorage) {
    return "dev_preview_browser";
  }
  let id = localStorage.getItem(KEY);
  if (!id) {
    try {
      id = "dev_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    } catch {
      id = "dev_" + Math.random().toString(36).substring(2, 15) + "_" + Date.now().toString(36);
    }
    localStorage.setItem(KEY, id);
  }
  return id;
}
