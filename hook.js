// Runs inside the Airbnb page itself (not the extension sandbox) so it can see the search
// results Airbnb loads as you scroll, page or move the map. It only reads listing IDs and
// coordinates and hands them to search.js; it sends nothing anywhere else.
/* global SkiExtract */

(() => {
  const WATCH = /\/api\/v3\/(StaysSearch|StaysMapS2Search|ExploreSearch)/;

  function share(text) {
    const coords = SkiExtract.fromText(text);
    if (Object.keys(coords).length) {
      window.postMessage({ source: "ski-pass-finder", type: "coords", coords }, location.origin);
    }
  }

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const p = origFetch.apply(this, arguments);
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (WATCH.test(url)) p.then((res) => res.clone().text()).then(share).catch(() => {});
    } catch (_) { /* never break the page */ }
    return p;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    try {
      if (WATCH.test(String(url))) {
        this.addEventListener("load", () => {
          try { if (this.responseType === "" || this.responseType === "text") share(this.responseText); } catch (_) {}
        });
      }
    } catch (_) { /* never break the page */ }
    return origOpen.apply(this, arguments);
  };
})();
