// Shared logic and UI for the Airbnb panel and the toolbar popup.
/* global RESORTS, RESORTS_UPDATED, chrome */

const SkiFinder = (() => {
  const DEFAULTS = {
    passes: { ikon: true, epic: true, indy: true },
    bonus: true,      // include Ikon Bonus Mountains when Ikon is selected
    count: 10,
    units: "mi",
    collapsed: false,
  };
  const ROUTE_LIMIT_KM = 2500; // beyond this straight-line distance, don't bother routing

  // ---------- settings ----------
  function loadSettings() {
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get("settings", (data) => {
          const s = (data && data.settings) || {};
          resolve({
            ...DEFAULTS,
            ...s,
            passes: { ...DEFAULTS.passes, ...(s.passes || {}) },
          });
        });
      } catch (_) {
        resolve({ ...DEFAULTS, passes: { ...DEFAULTS.passes } });
      }
    });
  }
  function saveSettings(settings) {
    try { chrome.storage.sync.set({ settings }); } catch (_) { /* ignore */ }
  }

  // ---------- geometry / formatting ----------
  function haversineKm(a, b) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function formatDuration(seconds) {
    if (seconds == null) return null;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return mins + " min";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function formatDistance(km, units) {
    if (km == null) return "";
    const v = units === "km" ? km : km * 0.621371;
    return (v < 10 ? v.toFixed(1) : Math.round(v)) + " " + units;
  }

  function matchesPasses(r, settings) {
    const p = settings.passes;
    if (p.epic && r.epic) return true;
    if (p.indy && r.indy) return true;
    if (p.ikon && r.ikon && (!r.ikonBonus || settings.bonus)) return true;
    return false;
  }

  function candidatesFor(origin, settings) {
    const pool = RESORTS.filter((r) => matchesPasses(r, settings))
      .map((r) => ({ ...r, km: haversineKm(origin, r) }))
      .sort((a, b) => a.km - b.km);
    const take = Math.min(40, Math.max(20, settings.count * 2));
    return pool.slice(0, take);
  }

  function send(msg) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(msg, (reply) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!reply) return reject(new Error("No reply from extension"));
        reply.ok ? resolve(reply.result) : reject(new Error(reply.error));
      });
    });
  }

  function directionsUrl(origin, r) {
    return (
      "https://www.google.com/maps/dir/?api=1&travelmode=driving" +
      `&origin=${origin.lat},${origin.lng}&destination=${r.lat},${r.lng}`
    );
  }

  // ---------- DOM helpers ----------
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) if (c != null) node.append(c);
    return node;
  }

  function passBadges(r) {
    const out = [];
    if (r.ikon) out.push(el("span", { class: "badge ikon", text: r.ikonBonus ? "Ikon bonus" : "Ikon" }));
    if (r.epic) out.push(el("span", { class: "badge epic", text: "Epic" }));
    if (r.indy) out.push(el("span", { class: "badge indy", text: "Indy" }));
    return out;
  }

  const CSS = `
  :host, .sf-root {
    --bg: #ffffff; --fg: #1b1f24; --muted: #667085; --line: #e7e9ee; --hover: #f5f7fa;
    --accent: #0f5f8a; --shadow: 0 10px 30px rgba(16,24,40,.18), 0 2px 6px rgba(16,24,40,.08);
    --ikon: #1f4fbf; --ikon-bg: #e8eefc; --epic: #b4400e; --epic-bg: #fdeee6;
    --indy: #17803d; --indy-bg: #e5f5eb; --chip-off: #f1f2f5;
  }
  @media (prefers-color-scheme: dark) {
    :host, .sf-root {
      --bg: #17191d; --fg: #eef0f3; --muted: #9aa3af; --line: #2a2e35; --hover: #20242a;
      --accent: #5fb3e0; --shadow: 0 10px 30px rgba(0,0,0,.5);
      --ikon: #9db8ff; --ikon-bg: #1d2a4a; --epic: #ffb48a; --epic-bg: #3d2416;
      --indy: #86e0a6; --indy-bg: #17351f; --chip-off: #23272e;
    }
  }
  * { box-sizing: border-box; }
  .sf-root {
    font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: var(--fg); background: var(--bg);
  }
  .sf-panel {
    position: fixed; right: 20px; bottom: 20px; width: 360px; max-height: min(640px, calc(100vh - 40px));
    display: flex; flex-direction: column; border-radius: 16px; box-shadow: var(--shadow);
    background: var(--bg); color: var(--fg);
    border: 1px solid var(--line); overflow: hidden; z-index: 2147483000;
  }
  .sf-popup { width: 380px; max-height: 590px; display: flex; flex-direction: column; background: var(--bg); color: var(--fg); }
  .sf-head { padding: 14px 16px 10px; display: flex; gap: 10px; align-items: flex-start; }
  .sf-title { font-weight: 650; font-size: 15px; letter-spacing: -.01em; }
  .sf-sub { color: var(--muted); font-size: 12px; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 270px; }
  .sf-head .sf-grow { flex: 1; min-width: 0; }
  .icon-btn { border: 0; background: transparent; color: var(--muted); cursor: pointer; width: 28px; height: 28px; border-radius: 8px; font-size: 16px; line-height: 1; }
  .icon-btn:hover { background: var(--hover); color: var(--fg); }
  .sf-controls { padding: 0 16px 10px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .chip { border: 1px solid transparent; border-radius: 999px; padding: 4px 11px; font: inherit; font-weight: 600; font-size: 12px; cursor: pointer; background: var(--chip-off); color: var(--muted); }
  .chip.on.ikon { background: var(--ikon-bg); color: var(--ikon); border-color: color-mix(in srgb, var(--ikon) 35%, transparent); }
  .chip.on.epic { background: var(--epic-bg); color: var(--epic); border-color: color-mix(in srgb, var(--epic) 35%, transparent); }
  .chip.on.indy { background: var(--indy-bg); color: var(--indy); border-color: color-mix(in srgb, var(--indy) 35%, transparent); }
  .sf-spacer { flex: 1; }
  .mini-select, .mini-toggle { font: inherit; font-size: 12px; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 3px 6px; cursor: pointer; }
  .sf-opt { width: 100%; display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; cursor: pointer; }
  .sf-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; border-top: 1px solid var(--line); flex: 1; min-height: 60px; }
  .sf-row a { display: flex; gap: 10px; padding: 10px 16px; text-decoration: none; color: inherit; border-bottom: 1px solid var(--line); }
  .sf-row a:hover { background: var(--hover); }
  .sf-rank { color: var(--muted); font-variant-numeric: tabular-nums; width: 16px; padding-top: 1px; }
  .sf-main { flex: 1; min-width: 0; }
  .sf-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sf-meta { color: var(--muted); font-size: 12px; display: flex; flex-wrap: wrap; gap: 4px 6px; align-items: center; margin-top: 3px; }
  .sf-note { color: var(--muted); font-size: 11px; margin-top: 2px; }
  .badge { font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 5px; letter-spacing: .02em; }
  .badge.ikon { background: var(--ikon-bg); color: var(--ikon); }
  .badge.epic { background: var(--epic-bg); color: var(--epic); }
  .badge.indy { background: var(--indy-bg); color: var(--indy); }
  .sf-time { text-align: right; white-space: nowrap; }
  .sf-time b { display: block; font-size: 14px; font-variant-numeric: tabular-nums; }
  .sf-time span { color: var(--muted); font-size: 12px; }
  .sf-time .noroute { color: var(--muted); font-weight: 500; font-size: 12px; }
  .sf-state { padding: 18px 16px; color: var(--muted); }
  .sf-state.err { color: #c2410c; }
  .sf-loc { padding: 10px 16px; border-top: 1px solid var(--line); display: flex; gap: 6px; }
  .sf-loc input { flex: 1; min-width: 0; font: inherit; color: var(--fg); background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 6px 9px; }
  .sf-loc button { font: inherit; font-weight: 600; border: 0; border-radius: 8px; padding: 6px 12px; background: var(--accent); color: #fff; cursor: pointer; }
  .sf-foot { padding: 8px 16px 12px; color: var(--muted); font-size: 11px; border-top: 1px solid var(--line); }
  .sf-foot a { color: var(--muted); }
  .sf-pill {
    position: fixed; right: 20px; bottom: 20px; z-index: 2147483000; border: 1px solid var(--line);
    background: var(--bg); color: var(--fg); box-shadow: var(--shadow); border-radius: 999px;
    padding: 9px 15px; font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; cursor: pointer;
  }
  .sf-pill small { color: var(--muted); font-weight: 500; margin-left: 6px; }
  @media (max-width: 480px) { .sf-panel { right: 8px; left: 8px; width: auto; bottom: 8px; } }
  `;

  // ---------- the widget ----------
  // host: element (or shadow root) to render into
  // opts.mode: "panel" (floating on Airbnb) or "popup"
  async function create(host, opts = {}) {
    const mode = opts.mode || "panel";
    const settings = await loadSettings();
    let origin = null;      // {lat, lng, label}
    let runId = 0;
    let lastNearest = null; // shown in collapsed pill

    const style = el("style", { text: CSS });
    const root = el("div", { class: "sf-root" });
    host.append(style, root);

    const title = el("div", { class: "sf-title", text: "Ski resorts nearby" });
    const sub = el("div", { class: "sf-sub", text: "Finding this listing's location…" });
    const list = el("ul", { class: "sf-list" });
    const locInput = el("input", { type: "text", placeholder: "Town, address or resort area" });
    const locForm = el(
      "form",
      { class: "sf-loc", onsubmit: (e) => { e.preventDefault(); lookUp(locInput.value); } },
      locInput,
      el("button", { type: "submit", text: "Go" })
    );

    function chip(key, label) {
      const b = el("button", { class: "chip " + key + (settings.passes[key] ? " on" : ""), type: "button", text: label });
      b.addEventListener("click", () => {
        settings.passes[key] = !settings.passes[key];
        b.classList.toggle("on", settings.passes[key]);
        saveSettings(settings);
        refresh();
      });
      return b;
    }

    const countSel = el("select", { class: "mini-select", title: "How many resorts to show" },
      [5, 10, 15, 20].map((n) => el("option", { value: n, text: "Top " + n, selected: n === settings.count })));
    countSel.addEventListener("change", () => { settings.count = +countSel.value; saveSettings(settings); refresh(); });

    const unitBtn = el("button", { class: "mini-toggle", type: "button", title: "Switch miles / km", text: settings.units });
    unitBtn.addEventListener("click", () => {
      settings.units = settings.units === "mi" ? "km" : "mi";
      unitBtn.textContent = settings.units;
      saveSettings(settings);
      refresh(false);
    });

    const bonusBox = el("input", { type: "checkbox", checked: settings.bonus });
    bonusBox.addEventListener("change", () => { settings.bonus = bonusBox.checked; saveSettings(settings); refresh(); });
    const bonusLabel = el("label", { class: "sf-opt" }, bonusBox, "Include Ikon bonus mountains (2 days, full Ikon only)");

    const headButtons = [];
    if (mode === "panel") {
      headButtons.push(el("button", { class: "icon-btn", type: "button", title: "Minimize", text: "–", onclick: () => setCollapsed(true) }));
    }

    const panel = el(
      "div",
      { class: mode === "panel" ? "sf-panel" : "sf-popup" },
      el("div", { class: "sf-head" }, el("div", { class: "sf-grow" }, title, sub), headButtons),
      el("div", { class: "sf-controls" },
        chip("ikon", "Ikon"), chip("epic", "Epic"), chip("indy", "Indy"),
        el("span", { class: "sf-spacer" }), countSel, unitBtn, bonusLabel),
      list,
      locForm,
      el("div", { class: "sf-foot" },
        "Drive times from OpenStreetMap routing, without traffic. Map data © OpenStreetMap contributors. Airbnb pins are approximate. ",
        `Pass lists as of ${RESORTS_UPDATED}.`)
    );

    const pill = el("button", { class: "sf-pill", type: "button", onclick: () => setCollapsed(false) });
    root.append(panel);
    if (mode === "panel") root.append(pill);

    function setCollapsed(c) {
      settings.collapsed = c;
      saveSettings(settings);
      panel.style.display = c ? "none" : "";
      pill.style.display = c ? "" : "none";
      updatePill();
    }
    function updatePill() {
      pill.textContent = "⛷ Ski resorts";
      if (lastNearest) pill.append(el("small", { text: lastNearest }));
    }
    if (mode === "panel") setCollapsed(!!settings.collapsed);

    function setState(text, isErr) {
      list.replaceChildren(el("li", { class: "sf-state" + (isErr ? " err" : ""), text }));
    }

    async function lookUp(q) {
      q = (q || "").trim();
      if (!q) return;
      setState("Looking up “" + q + "”…");
      try {
        const hit = await send({ type: "geocode", query: q });
        if (!hit) return setState("Couldn't find that place. Try a town name.", true);
        setOrigin({ lat: hit.lat, lng: hit.lng }, hit.label.split(",").slice(0, 3).join(","));
      } catch (e) {
        setState("Address lookup failed: " + e.message, true);
      }
    }

    function setOrigin(o, label) {
      origin = { lat: o.lat, lng: o.lng };
      sub.textContent = label || `${o.lat.toFixed(4)}, ${o.lng.toFixed(4)}`;
      sub.title = sub.textContent;
      refresh();
    }

    let lastRows = null;
    async function refresh(reroute = true) {
      if (!origin) return;
      if (!reroute && lastRows) return render(lastRows);
      if (!settings.passes.ikon && !settings.passes.epic && !settings.passes.indy) {
        lastNearest = null; updatePill();
        return setState("Pick at least one pass above.");
      }
      const id = ++runId;
      const cands = candidatesFor(origin, settings);
      if (!cands.length) return setState("No resorts match these filters.");
      setState("Calculating drive times…");

      let rows;
      const routable = cands.filter((c) => c.km <= ROUTE_LIMIT_KM);
      try {
        const times = routable.length
          ? await send({
              type: "driveTimes",
              origin,
              destinations: routable.map((c) => ({ id: c.id, lat: c.lat, lng: c.lng })),
            })
          : [];
        const byId = new Map(times.map((t) => [t.id, t]));
        rows = cands.map((c) => {
          const t = byId.get(c.id);
          return { ...c, seconds: t ? t.seconds : null, roadKm: t && t.meters != null ? t.meters / 1000 : null };
        });
      } catch (e) {
        if (id !== runId) return;
        // Routing failed: fall back to straight-line distance so the list is still useful.
        rows = cands.map((c) => ({ ...c, seconds: null, roadKm: null }));
        rows.failed = e.message;
      }
      if (id !== runId) return; // a newer request superseded this one

      rows.sort((a, b) => {
        if (a.seconds == null && b.seconds == null) return a.km - b.km;
        if (a.seconds == null) return 1;
        if (b.seconds == null) return -1;
        return a.seconds - b.seconds;
      });
      rows = Object.assign(rows.slice(0, settings.count), { failed: rows.failed });
      lastRows = rows;
      render(rows);
    }

    function render(rows) {
      const items = rows.map((r, i) => {
        const time = formatDuration(r.seconds);
        const dist = formatDistance(r.roadKm ?? r.km, settings.units);
        return el("li", { class: "sf-row" },
          el("a", { href: directionsUrl(origin, r), target: "_blank", rel: "noopener", title: "Open directions in Google Maps" },
            el("div", { class: "sf-rank", text: String(i + 1) }),
            el("div", { class: "sf-main" },
              el("div", { class: "sf-name", text: r.name }),
              el("div", { class: "sf-meta" }, el("span", { text: r.region }), passBadges(r)),
              r.note ? el("div", { class: "sf-note", text: r.note }) : null),
            el("div", { class: "sf-time" },
              time ? el("b", { text: time }) : el("b", { class: "noroute", text: r.km > ROUTE_LIMIT_KM ? "Fly" : "No drive route" }),
              el("span", { text: (r.roadKm == null ? "~" : "") + dist }))));
      });
      if (rows.failed) {
        items.unshift(el("li", { class: "sf-state err", text: "Couldn't get drive times (" + rows.failed + "). Showing straight-line distance." }));
      }
      list.replaceChildren(...items);
      const first = rows[0];
      lastNearest = first ? (formatDuration(first.seconds) || formatDistance(first.km, settings.units)) + " to " + first.name : null;
      updatePill();
    }

    return {
      setOrigin,
      setState,
      setTitle: (t) => { title.textContent = t; },
      setSubtitle: (t) => { sub.textContent = t; sub.title = t; },
      getSubtitle: () => sub.textContent,
      focusSearch: () => locInput.focus(),
      destroy: () => { style.remove(); root.remove(); },
    };
  }

  return { create, loadSettings, send, haversineKm, candidatesFor, formatDuration, formatDistance, matchesPasses, DEFAULTS };
})();

if (typeof module !== "undefined") module.exports = { SkiFinder };
