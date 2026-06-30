// src/lib/maps.js

// We don't store street addresses for shops, so a Google Maps *search* by shop name plus the city is the "directions" path: it resolves to the place on the map and works on phone and desktop alike. Shared by the Vault's reservation details and the shop detail page.

export const mapUrlFor = (shop) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${shop} Antwerp`,
  )}`;
