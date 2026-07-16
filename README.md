**🌍 Language:** **English** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Drone Flight Check (DE · FR · AT · CH)

**SkyCheck** is a free single-page web app for quickly pre-checking drone flights. It aggregates real-time data from several official sources and provides an immediate flight recommendation. Our use cases: surveying, inspection, image films, TV & film productions, and A2/STS drone licence training at [www.multikopterschule.de](https://www.multikopterschule.de).

> 🔒 **Privacy-first · runs in the browser · nothing to install.**
> SkyCheck collects no data, sets no tracking, and needs no account or sign-up — it can't spy on you because there is no backend that stores anything. Everything runs directly in your browser; the data you see is fetched live and gone the moment you close the tab. There's nothing to install either: "adding it to your home screen" (as a PWA) simply creates a shortcut that opens this web page — essentially a bookmark with an icon. No app package is downloaded, no permissions are granted, no background process runs.

Weather, air traffic, METAR/TAF, Kp-index and geocoding are identical everywhere; only the **geo-zone source** is country-specific and selected automatically from the hostname.

## 🌐 Live sites

| Country | Live app | Geo-zone source |
|---|---|---|
| 🇩🇪 **Germany** | [skycheck-de.netlify.app](https://skycheck-de.netlify.app/) | DiPUL WMS — `uas-betrieb.de` |
| 🇫🇷 **France** | [skycheck-fr.netlify.app](https://skycheck-fr.netlify.app/) | ED-269 dataset (French UAS zones) |
| 🇦🇹 **Austria** | [skycheck-at.netlify.app](https://skycheck-at.netlify.app/) | Austro Control ED-269 — auto-updated monthly |
| 🇨🇭 **Switzerland** | [skycheck-ch.netlify.app](https://skycheck-ch.netlify.app/) | BAZL / geo.admin.ch — WMS + Identify API |

> All four are the **same** deployment of `skycheck.html` from this repo, each served on its own Netlify site. Country detection: hostname (`skycheck-<xx>.netlify.app`) or the URL parameter `?country=de|fr|at|ch`. Default: `de`.

📦 **Current version:** v0.85

---

## Features

| Area | Details |
|---|---|
| **Flight recommendation** | Traffic-light system (Go / Warn / No-Go) based on wind, gusts, precipitation and Kp-index |
| **Weather** | Wind gusts, wind speed, wind direction, temperature, dew point, visibility, cloud cover, precipitation — data from DWD via BrightSky |
| **METAR / TAF** | Real-time aviation weather from nearby airports (NOAA Aviation Weather Center), including flight-category light VFR / MVFR / IFR / LIFR |
| **Wind profile** | Extrapolation of wind speed by altitude (10 / 60 / 120 / 150 m AGL) via power law |
| **Kp-index** | Current Kp from NOAA + GFZ Potsdam Hp30 bar chart (last 4 × 30 min + forecast) |
| **Air traffic** | ADS-B real-time flight movements in the surroundings with altitude colours and radar icons (Airplanes.live) |
| **Aircraft alarm view** | Full-screen map with audible aircraft alarm: announces approaching aircraft within an adjustable radius |
| **Airspace map** | Country-specific drone geo-zones (DE: DiPUL · FR/AT: ED-269 · CH: BAZL/geo.admin.ch) — no-fly zones, control zones, nature reserves; search radius switchable between 5 m and 100 m |
| **48 h forecast** | Hourly weather forecast over 2 days (scrollable, drone-flight light per hour) |
| **5-day overview** | Daily overview with min/max temperature, wind and traffic-light rating |
| **Hints & warnings** | Contextual warnings (GPS interference at high Kp, increased air traffic, no-fly reasoning) |
| **5 languages** | German, English, French, Spanish, Polish — switchable on the landing page |
| **PWA** | Installable as a web app (install banner with 30-day cooldown), works offline for static content |

---

## Technology

- **Single-file HTML/JS/CSS** — no build tools, no dependencies, no framework
- **Leaflet.js** for the interactive map
- **Service Worker** (`sw.js`) + **Web App Manifest** (`manifest.json`) for PWA support
- **Netlify** for hosting + serverless functions (CORS proxies)

---

## Data sources

| Source | Data | CORS |
|---|---|---|
| [DWD BrightSky](https://brightsky.dev/) | Weather data (hourly, 7 days) | ✅ |
| [NOAA Aviation Weather Center](https://aviationweather.gov/) | METAR / TAF | ❌ → Netlify Function `awc.js` |
| [GFZ Potsdam](https://kp.gfz.de/) | Kp-index, Hp30 (30-min resolution) | ❌ → Netlify Function `gfz.js` |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Kp-index fallback | ✅ |
| [Airplanes.live](https://airplanes.live/) | ADS-B flight movements | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geocoding / location search | ✅ |
| [Windy.com](https://www.windy.com/) | External link for detailed cloud view | — |
| **Geo-zones 🇩🇪** [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Drone airspace zones (WMS + GetFeatureInfo) | ✅ |
| **Geo-zones 🇫🇷** ED-269 dataset | French UAS zones (`data/uas-zones-fr.json`) | via `zones-fr.js` |
| **Geo-zones 🇦🇹** [Austro Control / dronespace.at](https://www.dronespace.at/) | Austrian UAS zones, ED-269 (`data/uas-zones-at.json`) | via `zones-at.js` |
| **Geo-zones 🇨🇭** [BAZL / geo.admin.ch](https://www.geo.admin.ch/) | Swiss UAS zones `ch.bazl.einschraenkungen-drohnen` (WMS + Identify) | ✅ |

---

## Architecture

```
skycheck.html               ← entire app (HTML + CSS + JS, ~5.2k lines)
manifest.json               ← PWA web app manifest
sw.js                       ← service worker (caching)
icon-192x192.png            ← app icon (small)
icon-512x512.png            ← app icon (large)
skycheck-icon.svg           ← source icon (vector)
netlify.toml                ← Netlify config (function bundle includes + root URL rewrite)
netlify/
  functions/
    awc.js                  ← NOAA AWC proxy for METAR/TAF (CORS workaround)
    gfz.js                  ← GFZ Potsdam proxy for Kp-index/Hp30
    zones-fr.js             ← France UAS zones (reads data/uas-zones-fr.json, bbox-filtered)
    zones-at.js             ← Austria UAS zones (reads data/uas-zones-at.json; ?all=1 = full overlay)
data/
  uas-zones-fr.json         ← ED-269 France UAS zones (monthly snapshot, replaceable)
  uas-zones-at.json         ← ED-269 Austria UAS zones (286 zones, auto-updated)
  uas-zones-at.version      ← marker of the last imported Austro Control release (idempotency)
.github/
  workflows/
    update-at-zones.yml     ← monthly job: fetch newest Austro Control ED-269 → commit data file
redirect.html               ← optional redirect page
```

> 🇨🇭 **CH needs none of the above** — the map overlay is the geo.admin.ch WMS layer and the zone detail comes from the geo.admin.ch Identify REST API, both called directly from the browser (CORS-open). No Netlify function, no hosted data file, no update workflow.

### Multi-country support (since v0.73)

SkyCheck uses an **adapter pattern** for country-specific geo-zone sources. Country is detected from the hostname (e.g. `skycheck-ch.netlify.app`) or the URL parameter `?country=de|fr|at|ch`. Default: `de`. Weather, ADS-B, METAR/TAF, Kp-index and geocoding are global and used as-is in every variant.

| Country | Geo-zone source | Overlay | Detail list / status | Data & updates |
|---|---|---|---|---|
| 🇩🇪 **DE** (default) | DiPUL WMS (`uas-betrieb.de`) | WMS tiles | WMS GetFeatureInfo | live service (official, always current) |
| 🇫🇷 **FR** | ED-269 dataset | client-side polygons/circles | `zones-fr.js` (bbox filter) | `data/uas-zones-fr.json` (~3.6k zones, replaceable) |
| 🇦🇹 **AT** | Austro Control ED-269 | all zones drawn client-side (286) | `zones-at.js` (bbox filter) | `data/uas-zones-at.json` — **auto-updated monthly** via GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | WMS tiles | geo.admin.ch **Identify** REST API | live service (CORS-open) — **no function, no file, no workflow** |

Two integration styles: **WMS + point query** (DE, CH — official live services render the whole country and answer point queries directly) and **hosted ED-269 file + Netlify function** (FR, AT — a JSON dataset in the repo, bbox-filtered server-side; AT refreshes itself monthly).

### Netlify Functions (CORS proxies)

The Aviation Weather and GFZ APIs don't send CORS headers, so they go through Netlify Functions:

- `awc.js` — proxies `aviationweather.gov/api/data/{metar,taf}`, adds CORS headers, 10 s timeout, 90 s cache
- `gfz.js` — proxies `kp.gfz.de` requests (Kp-index, Hp30)

### Asynchronous loading

Weather, air traffic, METAR/TAF and Kp-index are loaded in parallel. The GFZ Hp30 tile loads asynchronously in the background without blocking the main view — the status page therefore appears in ~1 second.

### Geo-zone detection (DiPUL WMS GetFeatureInfo)

The WMS `GetFeatureInfo` request uses a 101×101 pixel grid. The effective search radius is controlled via the bounding-box size `δ`:

```javascript
δ = Math.max(0.001134, radiusM * 101 / (4 * 111320))
```

This allows the search radius to be precisely scaled between 5 m and 100 m (empirically calibrated).

---

## Local development

```bash
# Simple HTTP server (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# With Netlify Functions (recommended — otherwise no METAR/TAF/Kp)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888/skycheck.html
```

> **Note:** Without `netlify dev`, the METAR/TAF and GFZ tiles will fail on localhost because `/.netlify/functions/*` is not available. Weather, ADS-B and airspace work with the plain HTTP server as well.

---

## Flight recommendation — rating logic

| Criterion | Warning | No-Go |
|---|---|---|
| Wind gusts | > 7 m/s | > 10 m/s |
| Kp-index | > 3.3 (GPS impaired) | > 5.0 (GPS unreliable) |
| Precipitation | > 0 mm | > 0.3 mm |
| Geo-zone | unrestricted, nature buffer zone | active no-fly zone |

---

## Version history (excerpt)

| Version | Change |
|---|---|
| v0.85 | 🇨🇭 **Switzerland** (`skycheck-ch`): new country adapter using the DE pattern — geo.admin.ch **WMS** layer for the map overlay + geo.admin.ch **Identify** REST API for the detail list/status. Both CORS-open, so no Netlify function, no hosted file and no update workflow are needed |
| v0.84 | 🇦🇹 AT map overlay now draws **all** Austrian zones (full-country overlay via `?all=1`, like the DE WMS) instead of only the point-filtered zones at the marked location |
| v0.83 | 🇦🇹 **Austria** (`skycheck-at`): new country adapter. `zones-at.js` parses the Austro Control ED-269 dataset; `data/uas-zones-at.json` is **auto-updated monthly** by a GitHub Actions workflow (`update-at-zones.yml`) |
| v0.78–v0.82 | Security & quality pass (XSS escaping + CSP, METAR visibility unit fix, 5-language completeness, alarm-defect fixes, ice/fog/visibility in the live view) — see `docs/code-review-2026-07-16.md` |
| v0.76 | Fix race condition: FR zone overlay polygons / circles now appear on first map render (previously they only showed up after a double-click that re-fetched). The `drawZoneOverlay` call ran before the map was created; now a re-draw triggers after map init using the cached `lastZones` |
| v0.75 | Country-name i18n: landing-page badge and footer show the active country name in the chosen UI language (e.g. FR domain + ES UI → "Verificación de vuelo de dron · Francia"). New `COUNTRY_NAMES` lookup table, `_country()` helper, `{country}` placeholder interpolated by `_t()`. `fltcatDisclaimer` decountryfied (EU-wide rule, no country mention needed) |
| v0.74 | FR map overlay: geo-zones in FR mode are now drawn as Leaflet polygons / circles on the map (in addition to the list). `zones-fr.js` returns geometry; `drawZoneOverlay()` renders client-side. Zone toggle remains compatible |
| v0.73 | Country-adapter architecture (stage 1): multi-country support for geo-zones. Country detection via URL param (`?country=fr`) or hostname; new Netlify function `zones-fr.js` reads ED-269 JSON for France (`data/uas-zones-fr.json`, ~3.6k zones), DE keeps DiPUL WMS |
| v0.72 | Info modal text corrected (target audience, specific category, new privacy section); README converted from German-only → 5 languages |
| v0.71 | 5 languages supported (DE / EN / FR / ES / PL); language switcher on landing page |
| v0.70 | Flight-category info modal (VFR / MVFR / IFR / LIFR) |
| v0.69 | Cloud-cover link to Windy, METAR wind with ° symbol and colour codes |
| v0.68 | SkyAlarm link on landing page |
| v0.67 | Map-style button raised above Leaflet attribution (z-index fix) |
| v0.66 | Low-altitude overlay narrowed, map-style cycler in main map |
| v0.65 | Fix: literal `\n` characters in the METAR section HTML |
| v0.64 | New Netlify Function `awc.js` as CORS proxy for NOAA AWC (METAR/TAF) |
| v0.63 | `fetchZones` δ formula empirically calibrated, default radius 100 m |
| v0.58 | Geo-zone radius coupling 5 m / 100 m |
| v0.57 | PWA install banner (`beforeinstallprompt`) |
| v0.54 | METAR/TAF integration, airport markers on map, METAR card |
| v0.35 | Aircraft alarm view (full-screen, ADS-B, Haversine, Web Audio, Leaflet map) |
| v0.27 | DE/EN language switcher, full I18N |
| v0.20 | `APP_VER` variable, Kp measurement timestamp |
| v0.15 | GFZ loaded async, Netlify Function as primary proxy, load time ~1 s |
| v0.14 | Netlify serverless function `gfz.js` as a reliable CORS proxy |
| v0.10 | GFZ Hp30 bar chart (4 × measurement + forecast) |

---

## Privacy

SkyCheck does not track or store any user data. The app is purely a web application — even the "installation" as a PWA only places an app icon and does not install anything persistently. Data is loaded only temporarily and disappears when you leave the app.

---

## Licence & liability

Germany, France, Austria & Switzerland · Operation in VLOS · No liability for completeness or accuracy of the displayed data. Using the app does not replace any required official authorisation. SkyCheck is an **orientation aid** — the legally required authorisation and final airspace clearance are issued via the competent national portals (e.g. **DFS Aviation Services** for DE, **Austro Control Dronespace** for AT, **skyguide** for CH).

Data sources are subject to their respective licences (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch).
