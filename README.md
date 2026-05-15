**🌍 Language:** **English** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Drone Flight Check for Germany

**SkyCheck** is a free single-page web app for quickly pre-checking drone flights in Germany. It aggregates real-time data from several official sources and provides an immediate flight recommendation. Our use cases: surveying, inspection, image films, TV & film productions, and A2/STS drone licence training at [www.multikopterschule.de](https://www.multikopterschule.de).

🌐 **Live:** [enchanting-stardust-f713da.netlify.app/skycheck.html](https://enchanting-stardust-f713da.netlify.app/skycheck.html)

📦 **Current version:** v0.72

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
| **Airspace map** | DiPUL WMS zones (uas-betrieb.de) including no-fly zones, control zones, nature reserves; search radius switchable between 5 m and 100 m |
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
| [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Drone airspace zones WMS | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geocoding / location search | ✅ |
| [Windy.com](https://www.windy.com/) | External link for detailed cloud view | — |

---

## Architecture

```
skycheck.html               ← entire app (HTML + CSS + JS, ~5.2k lines)
manifest.json               ← PWA web app manifest
sw.js                       ← service worker (caching)
icon-192x192.png            ← app icon (small)
icon-512x512.png            ← app icon (large)
skycheck-icon.svg           ← source icon (vector)
netlify/
  functions/
    awc.js                  ← NOAA AWC proxy for METAR/TAF (CORS workaround)
    gfz.js                  ← GFZ Potsdam proxy for Kp-index/Hp30
redirect.html               ← optional redirect page
```

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

For Germany only · Operation in VLOS · No liability for completeness or accuracy of the displayed data. Using the app does not replace any required official authorisation. SkyCheck is an **orientation aid** — the legally required authorisation and final airspace clearance are issued via the **DFS Aviation Services app** and other approved portals.

Data sources are subject to their respective licences (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL).
