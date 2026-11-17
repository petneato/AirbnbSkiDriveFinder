# Chrome Web Store Listing — Ski Pass Finder

> Last Updated: 2026-10-27

## Store Listing

**Extension Name**
Ski Pass Finder

**Short Description** (115 / 132 characters, same as manifest.json)
On Airbnb, shows the nearest Ikon, Epic and Indy ski resorts with driving times on every search result and listing.

**Detailed Description**

```
Find Airbnb stays close to the mountains on your ski pass. Ski Pass Finder adds the nearest Ikon, Epic and Indy resorts, with driving times, to Airbnb search results and listing pages.

WHAT IT DOES
On Airbnb search results, every listing card gets a short line showing the closest resort on each of your passes and how long the drive is, for example "Epic: Park City · 4 min". It keeps up as you scroll, page through results or move the map.
On a listing page, a small panel lists the nearest resorts, sorted by driving time, with the distance by road.
Click any resort to open driving directions in Google Maps.
Choose which passes you hold (Ikon, Epic, Indy) and the tags and panel only show resorts on those passes. You can also hide Ikon bonus mountains.
Not on Airbnb? Click the toolbar icon and type any town or address to see the closest resorts.

HOW TO USE IT
1. Install the extension.
2. Search for stays on Airbnb as usual. Resort tags appear on each result automatically.
3. Open a listing to see the full list of nearby resorts.
4. Use the Ikon / Epic / Indy buttons in the panel or the toolbar popup to pick your passes.

GOOD TO KNOW
Airbnb shows only an approximate location before you book, so drive times can be off by a few minutes. Times come from free OpenStreetMap routing and don't include traffic or winter road closures. Resort lists cover the 2026/27 season.

PRIVACY
No account, no tracking and no analytics. The extension only runs on Airbnb pages. To work out driving times it sends the approximate map location of listings you browse, and any town you type into the search box, to the free OpenStreetMap routing and address-lookup services. Nothing else leaves your browser, and nothing is sold or shared.

Ski Pass Finder is an independent project and is not affiliated with or endorsed by Airbnb, Alterra Mountain Company (Ikon Pass), Vail Resorts (Epic Pass) or Indy Pass.
```

**Category**
Lifestyle → Travel

**Single Purpose**
Shows the nearest Ikon, Epic and Indy ski resorts, with driving times, for Airbnb listings.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | icons/icon128.png |
| Screenshot 1 | 1280×800 | ✅ Ready | store-assets/screenshot-1-search.png |
| Screenshot 2 | 1280×800 | ✅ Ready | store-assets/screenshot-2-listing.png |
| Screenshot 3 | 1280×800 | ⬜ Not created | (optional: toolbar popup) |
| Small Promo Tile | 440×280 | ⬜ Not created | (recommended, optional) |
| Marquee Promo Tile | 1400×560 | ⬜ Not created | (optional) |

### Screenshot Notes
1. Airbnb search results (Park City, UT) with resort tags on each card.
2. A Park City listing with the nearby-resorts panel open.

Screenshots show Airbnb's site, listing photos and the Airbnb logo. That's normal for an extension that works on a site, but if a reviewer objects, crop the header out or blur the listing photos.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| storage | permissions | Saves the user's choices (which ski passes they hold, how many resorts to show, miles or km, panel minimized or not) and remembers the map location of listings seen in Airbnb search results, so the listing page can show nearby resorts even when it can't read its own map pin. All stored data stays in the browser. |
| activeTab | permissions | When the user clicks the toolbar icon, the popup checks whether the current tab is an Airbnb listing and, if so, asks that page for the listing's location so it can show nearby resorts without the user typing an address. No access to any tab is requested otherwise. |
| https://router.project-osrm.org/* | host_permissions | The OpenStreetMap routing service (OSRM). The extension sends it listing and resort coordinates to get the driving times and road distances shown on search results, the listing panel and the popup. |
| https://nominatim.openstreetmap.org/* | host_permissions | The OpenStreetMap address-lookup service (Nominatim). Used only when the user types a town or address into the search box, to turn it into a map location. |
| https://www.airbnb.com/* and 16 other Airbnb country domains (.ca, .co.uk, .com.au, .co.nz, .ie, .fr, .de, .at, .ch, .it, .es, .jp, .cl, .se, .no, .fi) | content_scripts matches | The extension's whole purpose is to add ski resort information to Airbnb pages. On search pages it reads each listing's map location from the search data Airbnb loads, and adds a resort tag to each listing card. On listing pages it reads the listing's map location and shows the resort panel. It does not run on any other site. |

**Remote code:** None. All JavaScript is in the package. The only network calls are the two OpenStreetMap services above (which return JSON data), plus a reload of the current Airbnb listing page to read its map location.

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes, but only to provide its main feature. Nothing is sent to the developer.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | No | No | | No |
| Personal communications | No | No | | No |
| Location | Yes | Yes | The approximate map location of Airbnb listings the user views, and any town or address they type, are sent to OpenStreetMap routing/address services to calculate drive times. Not the user's own device location. | Only to those services, to provide the feature |
| Web history | No (locally, the IDs and map locations of up to 500 listings seen in search results are kept in browser storage; never transmitted) | No | | No |
| User activity | No | No | | No |
| Website content | Yes | Yes (coordinates only) | Reads listing IDs and map coordinates from Airbnb pages. Only the coordinates are sent, to the routing service above. | Only to that service |

Settings (passes, units, count) are saved with Chrome sync storage, which Google syncs across the user's own signed-in browsers. These are preferences, not personal data.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** — ⬜ TODO: host `PRIVACY.md` at a public URL (for example GitHub Pages or a public Gist) and paste the link here and into the dashboard.

## Distribution

**Visibility**: Public (or Unlisted first, to share with friends before going public)
**Regions**: All regions

## Developer Info

**Publisher Name** — ⬜ TODO
**Contact Email** — ⬜ TODO (shown publicly on the listing and must be monitored; Google sends policy notices there)
**Support URL / Email** — ⬜ TODO (optional)
**Homepage URL** — ⬜ TODO (optional)

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.1.0 | 2026-10-27 | First store submission. Resort tags on Airbnb search results, nearby-resorts panel on listings, toolbar popup with address search, pass filters. | Draft |

## Review Notes

### Known Issues / Limitations
- **Free routing and address services.** Drive times use the public OSRM demo server (limited to "reasonable, non-commercial use", about 1 request per second). Address lookup uses OpenStreetMap's Nominatim, whose policy caps *all users of an app combined* at 1 request per second and asks apps to be able to switch providers without a software update. The extension spaces out requests and caches results, and address lookup only happens when someone types and clicks Go, so this is fine for a small user base. If the extension gets popular, move to a paid or self-hosted routing/geocoding service.
- **Airbnb site changes.** The extension reads Airbnb's page data, which Airbnb can change without notice. Search tags and the listing panel may need updates after Airbnb redesigns.
- **Trademarks.** Airbnb, Ikon, Epic and Indy are named only to describe what the extension works with. The name and icon don't use their logos, and the description includes a no-affiliation note.

### Rejection History
None yet.
