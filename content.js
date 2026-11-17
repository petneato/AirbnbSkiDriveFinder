// Runs on Airbnb. On a listing page (/rooms/123…) it finds the listing's map
// location and shows the nearest ski resorts in a floating panel.
/* global SkiFinder, chrome */

(() => {
  let widget = null;
  let hostEl = null;
  let currentListing = null;
  let currentCoords = null;
  let currentLabel = null;

  const LISTING_RE = /^\/rooms\/(?:plus\/)?(\d+)/;

  function listingId() {
    const m = location.pathname.match(LISTING_RE);
    return m ? m[1] : null;
  }

  function valid(lat, lng) {
    return isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);
  }

  // Pull the listing's coordinates out of page HTML/JSON. Airbnb has changed its markup
  // over time, so this tries several known patterns, most specific first.
  function coordsFromText(text) {
    if (!text) return null;
    const num = "(-?\\d{1,3}\\.\\d+)";
    const patterns = [
      new RegExp(`"listingLat"\\s*:\\s*${num}[\\s\\S]{0,80}?"listingLng"\\s*:\\s*${num}`),
      new RegExp(`"listing_lat"\\s*:\\s*${num}[\\s\\S]{0,80}?"listing_lng"\\s*:\\s*${num}`),
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m && valid(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
    }
    // The location section of the listing page carries the map pin.
    for (const anchor of ['"LOCATION_DEFAULT"', '"LocationSection"', '"mapData"', '"location"']) {
      const at = text.indexOf(anchor);
      if (at === -1) continue;
      const slice = text.slice(at, at + 6000);
      const m = slice.match(new RegExp(`"lat"\\s*:\\s*${num}\\s*,\\s*"(?:lng|lon|longitude)"\\s*:\\s*${num}`));
      if (m && valid(+m[1], +m[2])) return { lat: +m[1], lng: +m[2] };
    }
    // Google Maps links/embeds on the page (e.g. "Report a map error").
    const g = text.match(new RegExp(`google\\.[a-z.]+/maps[^"'\\s]*?[?&](?:ll|center|q)=${num}(?:,|%2C)${num}`));
    if (g && valid(+g[1], +g[2])) return { lat: +g[1], lng: +g[2] };
    const any = text.match(new RegExp(`"lat"\\s*:\\s*${num}\\s*,\\s*"lng"\\s*:\\s*${num}`));
    if (any && valid(+any[1], +any[2])) return { lat: +any[1], lng: +any[2] };
    const coord = text.match(new RegExp(`"latitude"\\s*:\\s*${num}\\s*,\\s*"longitude"\\s*:\\s*${num}`));
    if (coord && valid(+coord[1], +coord[2])) return { lat: +coord[1], lng: +coord[2] };
    return null;
  }

  function coordsFromDom() {
    const scripts = [...document.querySelectorAll('script[type="application/json"], script[id^="data-"]')];
    for (const s of scripts) {
      const c = coordsFromText(s.textContent);
      if (c) return c;
    }
    const links = [...document.querySelectorAll('a[href*="google."][href*="maps"]')].map((a) => a.href).join(" ");
    return coordsFromText(links);
  }

  async function coordsFromFreshHtml() {
    // After in-app navigation the embedded JSON can belong to the previous page,
    // so re-download the current listing's HTML and read it from there.
    try {
      const res = await fetch(location.href, { credentials: "include" });
      if (!res.ok) return null;
      return coordsFromText(await res.text());
    } catch (_) {
      return null;
    }
  }

  function coordsFromSearch(id) {
    // Saved by search.js when this listing showed up in search results.
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get("listingCoords", (data) => {
          const c = data && data.listingCoords && data.listingCoords[id];
          resolve(c && valid(c.lat, c.lng) ? c : null);
        });
      } catch (_) {
        resolve(null);
      }
    });
  }

  function placeLabel() {
    // e.g. "Entire cabin in Park City, Utah" → "Park City, Utah"
    for (const h of document.querySelectorAll("h1, h2")) {
      const m = (h.textContent || "").match(/^[^,]{0,60}\bin (.+)$/);
      if (m) return "Listing in " + m[1].trim();
    }
    return "This listing";
  }

  async function ensureWidget() {
    if (widget) return widget;
    hostEl = document.createElement("div");
    hostEl.id = "ski-pass-finder-host";
    const shadow = hostEl.attachShadow({ mode: "open" });
    document.documentElement.append(hostEl);
    widget = await SkiFinder.create(shadow, { mode: "panel" });
    return widget;
  }

  function removeWidget() {
    if (hostEl) hostEl.remove();
    hostEl = null;
    widget = null;
    currentCoords = null;
  }

  async function handlePage() {
    const id = listingId();
    if (!id) {
      currentListing = null;
      removeWidget();
      return;
    }
    if (id === currentListing) return;
    currentListing = id;
    currentCoords = null;

    const w = await ensureWidget();
    w.setSubtitle("Finding this listing's location…");
    w.setState("Reading the map pin… You can also type the town below.");

    // Try the fresh HTML first, then the live DOM (the map may load later), retrying a few times.
    let coords = (await coordsFromFreshHtml()) || (await coordsFromSearch(id));
    for (let i = 0; !coords && i < 8; i++) {
      if (currentListing !== id) return;
      coords = coordsFromDom();
      if (!coords) await new Promise((r) => setTimeout(r, 1000));
    }
    if (currentListing !== id) return;

    if (!coords) {
      w.setSubtitle("Couldn't read the listing's map location");
      w.setState("Type the listing's town below to see nearby resorts.");
      return;
    }
    currentCoords = coords;
    currentLabel = placeLabel();
    w.setOrigin(coords, currentLabel);

    // The "… in Town, State" heading often renders after the location is found, so keep
    // checking for it for a while, unless the user has searched for another place meanwhile.
    const fallback = currentLabel;
    for (let i = 0; currentLabel === fallback && fallback === "This listing" && i < 15; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      if (currentListing !== id || w.getSubtitle() !== fallback) return;
      const label = placeLabel();
      if (label !== fallback) {
        currentLabel = label;
        w.setSubtitle(label);
      }
    }
  }

  // Airbnb is a single-page app: watch for URL changes.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      handlePage();
    }
  }, 800);
  handlePage();

  // Lets the toolbar popup reuse this listing's location.
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === "getListingLocation") {
      sendResponse(currentCoords ? { ...currentCoords, label: currentLabel } : null);
    }
    return false;
  });
})();
