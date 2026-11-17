// Runs on Airbnb search result pages (and anywhere else listing cards appear). Adds a
// line to each listing card with the nearest resort on each selected pass and its
// drive time, updating as you scroll, page through results or move the map.
/* global SkiFinder, SkiExtract, chrome */

(() => {
  const PASSES = [
    { key: "ikon", label: "Ikon" },
    { key: "epic", label: "Epic" },
    { key: "indy", label: "Indy" },
  ];
  const PER_PASS = 3;          // resorts per pass to route (closest by straight line)
  const MAX_KM = 400;          // ignore resorts further than this in a straight line
  const MAX_COORDS = 90;       // stay under the routing server's per-request limit
  const STORE_MAX = 500;       // listing locations remembered for listing pages

  const coords = {};           // listing id -> {lat, lng}
  const results = new Map();   // listing id -> [{pass, name, seconds, km, roadKm}] | null (pending)
  const queue = [];            // listing ids waiting for drive times
  let settings = null;
  let working = false;
  let generation = 0;          // bumped when settings change so stale replies are ignored

  // ---------- listing locations ----------
  function valid(c) {
    return c && isFinite(c.lat) && isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180 && !(c.lat === 0 && c.lng === 0);
  }

  let pendingStore = {};
  let storeTimer = null;
  function addCoords(map) {
    let added = false;
    for (const [id, c] of Object.entries(map)) {
      if (!valid(c) || coords[id]) continue;
      coords[id] = c;
      pendingStore[id] = c;
      added = true;
    }
    if (!added) return;
    scheduleScan();
    // Remember locations so the listing page can use them even if it can't read its own pin.
    clearTimeout(storeTimer);
    storeTimer = setTimeout(() => {
      const fresh = pendingStore;
      pendingStore = {};
      chrome.storage.local.get("listingCoords", (data) => {
        const all = { ...((data && data.listingCoords) || {}), ...fresh };
        const ids = Object.keys(all);
        for (const id of ids.slice(0, Math.max(0, ids.length - STORE_MAX))) delete all[id];
        chrome.storage.local.set({ listingCoords: all });
      });
    }, 1000);
  }

  window.addEventListener("message", (e) => {
    if (e.source !== window || !e.data || e.data.source !== "ski-pass-finder" || e.data.type !== "coords") return;
    if (e.data.coords && typeof e.data.coords === "object") addCoords(e.data.coords);
  });

  // ---------- drive times ----------
  function candidatesByPass(origin) {
    const out = [];
    for (const p of PASSES) {
      if (!settings.passes[p.key]) continue;
      const only = { ...settings, passes: { ikon: false, epic: false, indy: false, [p.key]: true } };
      for (const r of SkiFinder.candidatesFor(origin, only).slice(0, PER_PASS)) {
        if (r.km <= MAX_KM) out.push({ pass: p.key, resort: r });
      }
    }
    return out;
  }

  async function work() {
    if (working) return;
    working = true;
    try {
      while (queue.length) {
        const gen = generation;
        // Take listings until the request would get too big.
        const batch = [];
        const dests = new Map(); // resort id -> {index, resort}
        while (queue.length) {
          const id = queue[0];
          const cands = candidatesByPass(coords[id]);
          const newDests = cands.filter((c) => !dests.has(c.resort.id)).map((c) => c.resort);
          const unique = [...new Map(newDests.map((r) => [r.id, r])).values()];
          if (batch.length && batch.length + 1 + dests.size + unique.length > MAX_COORDS) break;
          queue.shift();
          for (const r of unique) dests.set(r.id, { index: dests.size, resort: r });
          batch.push({ id, cands });
        }
        const routed = batch.filter((b) => b.cands.length);
        for (const b of batch) if (!b.cands.length) results.set(b.id, []);

        let matrix = null;
        if (routed.length) {
          try {
            matrix = await SkiFinder.send({
              type: "driveMatrix",
              origins: routed.map((b) => coords[b.id]),
              destinations: [...dests.values()].map(({ resort }) => ({ id: resort.id, lat: resort.lat, lng: resort.lng })),
            });
          } catch (_) {
            matrix = null; // fall back to straight-line distances
          }
        }
        if (gen !== generation) continue;

        routed.forEach((b, i) => {
          const best = {};
          for (const { pass, resort } of b.cands) {
            const j = dests.get(resort.id).index;
            const seconds = matrix ? matrix.seconds[i][j] : null;
            const meters = matrix && matrix.meters ? matrix.meters[i][j] : null;
            const row = { pass, name: resort.name, seconds, km: resort.km, roadKm: meters == null ? null : meters / 1000 };
            const cur = best[pass];
            const better = !cur ||
              (row.seconds != null && (cur.seconds == null || row.seconds < cur.seconds)) ||
              (row.seconds == null && cur.seconds == null && row.km < cur.km);
            if (better) best[pass] = row;
          }
          results.set(b.id, PASSES.map((p) => best[p.key]).filter(Boolean));
        });
        render();
      }
    } finally {
      working = false;
    }
  }

  // ---------- cards ----------
  const CSS = `
    :host { all: initial; display: block; }
    .wrap { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;
      font: 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .tag { display: inline-flex; gap: 4px; align-items: baseline; padding: 2px 7px; border-radius: 6px;
      background: #f3f4f6; color: #1b1f24; white-space: nowrap; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
    .tag b { font-weight: 700; font-size: 10.5px; letter-spacing: .02em; }
    .ikon b { color: #1f4fbf; } .epic b { color: #b4400e; } .indy b { color: #17803d; }
    .ikon { background: #e8eefc; } .epic { background: #fdeee6; } .indy { background: #e5f5eb; }
    .t { font-weight: 650; font-variant-numeric: tabular-nums; }
    .muted { color: #667085; background: transparent; padding-left: 0; }
    @media (prefers-color-scheme: dark) {
      .tag { color: #eef0f3; } .ikon { background: #1d2a4a; } .epic { background: #3d2416; } .indy { background: #17351f; }
      .ikon b { color: #9db8ff; } .epic b { color: #ffb48a; } .indy b { color: #86e0a6; } .muted { color: #9aa3af; }
    }`;

  function listingIdOf(card) {
    const a = card.querySelector('a[href*="/rooms/"]');
    const m = a && a.getAttribute("href").match(/\/rooms\/(?:plus\/)?(\d+)/);
    return m ? m[1] : null;
  }

  function badgeFor(card) {
    let host = card.querySelector(":scope > .ski-pass-finder-tags");
    if (!host) {
      host = document.createElement("div");
      host.className = "ski-pass-finder-tags";
      host.attachShadow({ mode: "open" });
      card.append(host);
    }
    return host;
  }

  function fill(host, id, rows) {
    const shadow = host.shadowRoot;
    const sig = settings.units + "|" + JSON.stringify(rows);
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;
    shadow.replaceChildren();
    const style = document.createElement("style");
    style.textContent = CSS;
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    if (rows === null) {
      wrap.append(tag("muted", null, "⛷ Finding nearby resorts…"));
    } else if (!rows.length) {
      wrap.append(tag("muted", null, "⛷ No pass resorts nearby"));
    } else {
      for (const r of rows) {
        const time = SkiFinder.formatDuration(r.seconds);
        const dist = SkiFinder.formatDistance(r.roadKm ?? r.km, settings.units);
        const t = document.createElement("span");
        t.className = "t";
        t.textContent = time || "~" + dist;
        const el = tag(r.pass, PASSES.find((p) => p.key === r.pass).label, r.name + " · ");
        el.append(t);
        el.title = `${r.name}: ${time ? time + ", " : ""}${dist} by road${time ? "" : " (straight line)"}`;
        wrap.append(el);
      }
    }
    shadow.append(style, wrap);
  }

  function tag(cls, bold, text) {
    const span = document.createElement("span");
    span.className = "tag " + cls;
    if (bold) {
      const b = document.createElement("b");
      b.textContent = bold;
      span.append(b);
    }
    span.append(text);
    return span;
  }

  function render() {
    if (!settings) return;
    const anyPass = settings.passes.ikon || settings.passes.epic || settings.passes.indy;
    for (const card of document.querySelectorAll('[data-testid="card-container"]')) {
      const id = listingIdOf(card);
      const existing = card.querySelector(":scope > .ski-pass-finder-tags");
      if (!id || !coords[id] || !anyPass) {
        if (existing) existing.remove();
        continue;
      }
      if (!results.has(id)) {
        results.set(id, null);
        queue.push(id);
      }
      fill(badgeFor(card), id, results.get(id));
    }
    work();
  }

  let scanTimer = null;
  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(render, 250);
  }

  // ---------- start ----------
  SkiFinder.loadSettings().then((s) => {
    settings = s;
    // Results in the first page load are embedded in the HTML; later ones arrive via hook.js.
    addCoords(SkiExtract.fromDocument(document));
    scheduleScan();
    new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.settings) return;
    SkiFinder.loadSettings().then((s) => {
      const routingChanged = JSON.stringify([s.passes, s.bonus]) !== JSON.stringify([settings.passes, settings.bonus]);
      settings = s;
      if (routingChanged) {
        generation++;
        results.clear();
        queue.length = 0;
      }
      render();
    });
  });
})();
