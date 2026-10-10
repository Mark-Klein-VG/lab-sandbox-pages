/* Combat configuration TXT export: local timestamp + pretty-printed JSON. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CombatConfigExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const pad = n => String(n).padStart(2, "0");
  function filename(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new Error("Invalid export date.");
    return "Combat-config-" + date.getFullYear() + "-" + pad(date.getMonth() + 1) +
      "-" + pad(date.getDate()) + "-" + pad(date.getHours()) + ":" +
      pad(date.getMinutes()) + ".txt";
  }
  function serialize(configuration) {
    return JSON.stringify(configuration, null, 2);
  }
  function download(configuration, date = new Date(), env = globalThis) {
    const name = filename(date);
    const blob = new env.Blob([serialize(configuration)], { type: "text/plain;charset=utf-8" });
    const objectUrl = env.URL.createObjectURL(blob);
    const anchor = env.document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = name;
    anchor.hidden = true;
    try {
      env.document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor.remove();
      // Allow the browser time to begin downloading before releasing the Blob URL.
      env.setTimeout(() => env.URL.revokeObjectURL(objectUrl), 1000);
    }
    return name;
  }
  return { filename, serialize, download };
});
