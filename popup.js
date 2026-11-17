// Toolbar popup: uses the current Airbnb listing's location if there is one,
// otherwise lets you type any town or address.
/* global SkiFinder, chrome */

(async () => {
  const widget = await SkiFinder.create(document.getElementById("app"), { mode: "popup" });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let loc = null;
  if (tab && /^https:\/\/www\.airbnb\./.test(tab.url || "")) {
    try {
      loc = await chrome.tabs.sendMessage(tab.id, { type: "getListingLocation" });
    } catch (_) {
      loc = null; // content script not ready or not a listing page
    }
  }

  if (loc) {
    widget.setOrigin(loc, loc.label || "This listing");
  } else {
    widget.setSubtitle("Enter a town, address or Airbnb area");
    widget.setState("Type a location below. On an Airbnb listing, the panel appears automatically.");
    widget.focusSearch();
  }
})();
