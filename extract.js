// Pulls listing IDs and map coordinates out of Airbnb search data (the JSON embedded in
// the page and the StaysSearch API responses). Loaded both in the page (hook.js) and in
// the extension's content script (search.js).

const SkiExtract = (() => {
  // Airbnb's GraphQL IDs are base64 of "DemandStayListing:<number>".
  function listingIdFrom(raw) {
    if (raw == null) return null;
    const s = String(raw);
    if (/^\d+$/.test(s)) return s;
    try {
      const m = atob(s).match(/Listing:(\d+)$/);
      return m ? m[1] : null;
    } catch (_) {
      return null;
    }
  }

  // Walks any parsed JSON value and collects {id: {lat, lng}} for every object shaped like
  // { id, location: { coordinate: { latitude, longitude } } }.
  function fromJson(root, out = {}) {
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (Array.isArray(node)) { for (const v of node) stack.push(v); continue; }
      const c = node.location && node.location.coordinate;
      if (c && typeof c.latitude === "number" && typeof c.longitude === "number") {
        const id = listingIdFrom(node.id);
        if (id) out[id] = { lat: c.latitude, lng: c.longitude };
      }
      for (const k in node) {
        const v = node[k];
        if (v && typeof v === "object") stack.push(v);
      }
    }
    return out;
  }

  function fromText(text, out = {}) {
    if (!text || text.indexOf('"coordinate"') === -1) return out;
    try {
      return fromJson(JSON.parse(text), out);
    } catch (_) {
      return out;
    }
  }

  function fromDocument(doc, out = {}) {
    for (const s of doc.querySelectorAll('script[type="application/json"]')) fromText(s.textContent, out);
    return out;
  }

  return { listingIdFrom, fromJson, fromText, fromDocument };
})();
