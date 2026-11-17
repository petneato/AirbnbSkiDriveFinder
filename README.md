# Ski Pass Finder

A Chrome extension that shows the nearest Ikon, Epic and Indy ski resorts, with driving times, right on Airbnb listing pages.

## Install (Chrome, Edge, Brave, Arc)

1. Unzip `ski-pass-finder.zip` somewhere you'll keep it (e.g. Documents). Chrome loads it from that folder, so don't delete it.
2. Open `chrome://extensions` in the address bar.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and choose the unzipped `ski-pass-finder` folder.
5. Optional: click the puzzle-piece icon in the toolbar and pin **Ski Pass Finder**.

## Use

Everything happens on its own as you browse Airbnb; there's nothing to type.

- **On Airbnb search results**, every listing card gets a line showing the nearest resort on each of your passes and the drive time (e.g. "Epic Park City · 3 min"). It keeps up as you scroll, page through results or move the map. Hover a tag for the distance.
- **On an Airbnb listing** (`airbnb.com/rooms/…`), a panel appears in the bottom-right corner with the closest resorts sorted by drive time.
- **Filter by pass** with the Ikon / Epic / Indy chips (on a listing's panel or in the toolbar popup). A resort shows if it's on any selected pass. Your choices are remembered and apply to the search result tags too.
- **Click a resort** to open Google Maps directions from the listing.
- **Minimize** with the – button; the pill that remains shows the closest resort.
- **Anywhere else**, click the toolbar icon and type a town or address.
- If the listing's map pin can't be read, type the town in the box at the bottom of the panel.

## Good to know

- Airbnb only shows an approximate location before you book, so times can be off by a few minutes.
- Drive times come from the free OpenStreetMap routing service (OSRM). They don't include traffic, and they don't know about winter road closures (e.g. Guardsman Pass between Park City and Big Cottonwood Canyon), so double-check any surprisingly short route.
- Resort lists reflect the 2026/27 season as of October 2026. Indy is limited to alpine partners (cross-country-only areas are left out) and doesn't include every small partner.
- Ikon "bonus mountains" (2 days on the full Ikon Pass) can be hidden with the checkbox.

## Update the resort list

Edit `resorts.js`. Each row is `[name, region, latitude, longitude, passes, note]`, where `passes` uses `I` = Ikon, `B` = Ikon bonus mountain, `E` = Epic, `N` = Indy (e.g. `"IN"` for a resort on both Ikon and Indy). Then click the reload icon for the extension on `chrome://extensions`.

## Files

- `manifest.json`: extension setup
- `content.js`: reads the Airbnb listing's location and shows the panel
- `search.js`: adds the resort tags to search result cards
- `hook.js` / `extract.js`: read listing locations from the search results Airbnb loads (nothing is sent anywhere else)
- `core.js`: filtering, sorting and the panel/popup UI
- `background.js`: calls the routing and address-lookup services
- `popup.html` / `popup.js`: the toolbar popup
- `resorts.js`: the resort list

## License

Code and resort list: [MIT](LICENSE). Driving times and place lookups come from OSRM and Nominatim (map data © OpenStreetMap contributors, ODbL) and follow those services' usage policies. Ski Pass Finder is not affiliated with Airbnb, Ikon Pass, Epic Pass or Indy Pass.
