# Privacy Policy for Ski Pass Finder

Last updated: October 27, 2026

Ski Pass Finder is a browser extension that shows the nearest Ikon, Epic and Indy ski resorts, with driving times, on Airbnb. This policy explains what data it handles. In short: it has no accounts, analytics or tracking, and the developer never receives any of your data.

## What data the extension handles

- **Locations of Airbnb listings.** On Airbnb search results and listing pages, the extension reads each listing's ID and its approximate map location (the same approximate pin Airbnb shows on its map). It does not read your name, messages, bookings, payment details or anything else from Airbnb.
- **Places you type.** If you type a town or address into the extension's search box, that text is used to look up its map location.
- **Your settings.** Which ski passes you selected, how many resorts to show, miles or kilometres, and whether the panel is minimized.

The extension does not use your device's own location (GPS) and does not record which pages you visit.

## How it is stored

- Settings are saved in your browser's extension storage. If you are signed in to Chrome with sync turned on, Chrome syncs them to your other browsers through your Google account.
- The IDs and map locations of up to 500 listings recently seen in search results are kept in your browser's local extension storage, so a listing page can show nearby resorts even if it can't read its own map pin. Older entries are removed automatically.
- Nothing is stored on any server run by the developer. There isn't one.

## How it is used and who receives it

To calculate driving times and turn typed places into map locations, the extension sends data to two free services run by the OpenStreetMap community:

- **OSRM routing** (router.project-osrm.org) receives the map coordinates of listings and of nearby ski resorts, and returns driving times and road distances. [Usage policy](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server).
- **Nominatim** (nominatim.openstreetmap.org) receives the text of a place you type, only when you search, and returns its map location. [Privacy policy](https://osmfoundation.org/wiki/Privacy_Policy).

Like any website, these services can see your IP address when your browser contacts them. No other data is sent to them. Clicking a resort opens Google Maps directions in a new tab, which is covered by Google's own privacy policy.

The extension does not sell, rent or share data with anyone else, does not use it for advertising, and does not use it for any purpose other than showing nearby ski resorts.

## Keeping and deleting data

Data stays in your browser until you remove it. Uninstalling the extension deletes everything it stored. You can also clear it by removing and reinstalling the extension.

## Changes to this policy

If the extension starts handling data differently, this policy will be updated and the "Last updated" date changed before that version is released.

## Contact

Questions about privacy: [CONTACT EMAIL]

Ski Pass Finder is an independent project and is not affiliated with Airbnb, Ikon Pass, Epic Pass or Indy Pass.
