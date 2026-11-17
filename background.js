// Background service worker: does the network calls (drive times and address lookup)
// so they work regardless of the page's own security rules.

const OSRM_URL = "https://router.project-osrm.org/table/v1/driving/";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const cache = new Map(); // key -> result, kept while the worker is alive
const CACHE_MAX = 200;

function remember(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  return value;
}

// The public OSRM server asks for at most about one request per second, and search
// pages can ask for many at once, so requests are spaced out.
const OSRM_GAP_MS = 1100;
let nextOsrmSlot = 0;
async function osrmFetch(url) {
  const now = Date.now();
  const slot = Math.max(now, nextOsrmSlot);
  nextOsrmSlot = slot + OSRM_GAP_MS;
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing service returned " + res.status);
  const data = await res.json();
  if (data.code !== "Ok") throw new Error("Routing service: " + (data.message || data.code));
  return data;
}

function coordList(points) {
  return points.map((p) => p.lng.toFixed(5) + "," + p.lat.toFixed(5)).join(";");
}

async function driveTimes(origin, destinations) {
  // origin: {lat, lng}; destinations: [{id, lat, lng}]
  const key =
    "route:" + origin.lat.toFixed(4) + "," + origin.lng.toFixed(4) + ":" +
    destinations.map((d) => d.id).join(",");
  if (cache.has(key)) return cache.get(key);

  const url = OSRM_URL + coordList([origin, ...destinations]) + "?sources=0&annotations=duration,distance";
  const data = await osrmFetch(url);

  const durations = data.durations[0];
  const distances = data.distances ? data.distances[0] : [];
  const out = destinations.map((d, i) => ({
    id: d.id,
    seconds: durations[i + 1],          // null when there's no road route
    meters: distances[i + 1] ?? null,
  }));
  return remember(key, out);
}

// Many listings to many resorts in one request (used on search result pages).
// Returns seconds[i][j] / meters[i][j] for origin i to destination j (null = no road route).
async function driveMatrix(origins, destinations) {
  const key =
    "matrix:" + origins.map((o) => o.lat.toFixed(4) + "," + o.lng.toFixed(4)).join("|") + ":" +
    destinations.map((d) => d.id).join(",");
  if (cache.has(key)) return cache.get(key);

  const sources = origins.map((_, i) => i).join(";");
  const dests = destinations.map((_, j) => origins.length + j).join(";");
  const url =
    OSRM_URL + coordList([...origins, ...destinations]) +
    `?sources=${sources}&destinations=${dests}&annotations=duration,distance`;
  const data = await osrmFetch(url);
  return remember(key, { seconds: data.durations, meters: data.distances || null });
}

async function geocode(query) {
  const key = "geo:" + query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const url = NOMINATIM_URL + "?format=json&limit=1&q=" + encodeURIComponent(query);
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Address lookup returned " + res.status);
  const list = await res.json();
  if (!list.length) return remember(key, null);
  const hit = list[0];
  return remember(key, {
    lat: parseFloat(hit.lat),
    lng: parseFloat(hit.lon),
    label: hit.display_name,
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const job =
    msg.type === "driveTimes" ? driveTimes(msg.origin, msg.destinations) :
    msg.type === "driveMatrix" ? driveMatrix(msg.origins, msg.destinations) :
    msg.type === "geocode" ? geocode(msg.query) :
    null;
  if (!job) return false;
  job
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
  return true; // keep the channel open for the async reply
});
