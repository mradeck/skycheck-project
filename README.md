**🌍 Language:** **English** · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Drone Flight Check (DE · FR · AT · CH · ES · DK · IE · NL · PT)

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
| 🇪🇸 **Spain** | [skycheck-es.netlify.app](https://skycheck-es.netlify.app/) | EASA Common Repository (vector) **or** ENAIRE servAIS (WMS) — switchable on the start screen, EASA default |
| 🇩🇰 **Denmark** | [skycheck-dk.netlify.app](https://skycheck-dk.netlify.app/) | Trafikstyrelsen — ArcGIS FeatureServer (vector) |
| 🇮🇪 **Ireland** | [skycheck-ie.netlify.app](https://skycheck-ie.netlify.app/) | EASA Common Repository — ArcGIS (vector, preliminary) |
| 🇳🇱 **Netherlands** | [skycheck-nl.netlify.app](https://skycheck-nl.netlify.app/) | EASA Common Repository — ArcGIS (vector, ED-318) |
| 🇵🇹 **Portugal** | [skycheck-pt.netlify.app](https://skycheck-pt.netlify.app/) | EASA Common Repository — ArcGIS (vector) |

> All nine are the **same** deployment of `skycheck.html` from this repo, each served on its own Netlify site. Country detection: hostname (`skycheck-<xx>.netlify.app`) or the URL parameter `?country=de|fr|at|ch|es|dk|ie|nl|pt`. Default: `de`. Each country variant also presets the **UI language**, a **capital-landmark search hint**, and **country-scoped address search**.

📦 **Current version:** v26.08.113.2

Version format: `vYY.MM.major.subversion`, matching PointCloud Manager. The
existing sequential SkyCheck release is the `major` component; feature
releases start at subversion `0`, while local fixes and hotfixes increment only
the final component. The complete version is visible in the browser tab and
the app header.

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
| **Airspace map** | Country-specific drone geo-zones (DE: DiPUL · FR/AT: ED-269 · CH: geo.admin.ch · ES: ENAIRE · DK/IE: ArcGIS) — no-fly zones, control zones, nature reserves; search radius switchable between 5 m and 100 m |
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
| **Geo-zones 🇪🇸** [ENAIRE servAIS](https://www.enaire.es/) / [EASA Common Repository](https://www.easa.europa.eu/) | Spanish UAS zones — ENAIRE `SRV_UAS_ZG_V0` (WMS + ArcGIS Identify) **or** EASA `geozone_EASA` (ArcGIS vector, viewport-based); switchable, EASA default | ✅ |
| **Geo-zones 🇩🇰** [Trafikstyrelsen](https://www.droneregler.dk/) | Danish UAS zones (ArcGIS FeatureServer, GeoJSON) | ✅ |
| **Geo-zones 🇮🇪** [EASA Common Repository](https://www.easa.europa.eu/) | Irish UAS zones `ie_geozones` (ArcGIS, ED-318, preliminary) | ✅ |
| **Geo-zones 🇳🇱** [EASA Common Repository](https://www.easa.europa.eu/) | Dutch UAS zones `Netherlands_ED318` (ArcGIS vector, ED-318, ~162 zones) | ✅ |
| **Geo-zones 🇵🇹** [EASA Common Repository](https://www.easa.europa.eu/) / [ANAC](https://www.voanaeuropa.eu/) | Portuguese UAS zones `Portugal_Geo_Zones_Polygons` (ArcGIS vector, ~314 zones; KML-derived schema) | ✅ |
| **Context layers** (🇦🇹🇨🇭🇪🇸🇩🇰🇮🇪🇫🇷) [OpenStreetMap](https://www.openstreetmap.org/) (ODbL) | Optional overlays — protected areas, motorways, power lines, railways (static GeoJSON snapshots in `data/<cc>-*.json`, generated via `scripts/`); informational only, not part of the flight-status check. DE already has these via DiPUL | ✅ |

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
    zones-fr.js             ← France UAS zones (reads spatial 2° tiles, bbox-filtered)
    zones-at.js             ← Austria UAS zones (reads data/uas-zones-at.json; ?all=1 = full overlay)
data/
  uas-zones-fr.json         ← ED-269 France UAS zones (monthly snapshot, replaceable)
  fr-zones-tiles/           ← generated spatial index for the Netlify function
  context/fr/               ← bundled viewport tiles for the four France context layers
  uas-zones-at.json         ← ED-269 Austria UAS zones (286 zones, auto-updated)
  uas-zones-at.version      ← marker of the last imported Austro Control release (idempotency)
  <cc>-protected.json       ← context: protected areas (OSM, ODbL) — cc ∈ at,ch,es,dk,ie,fr
  <cc>-motorways.json       ← context: motorways (OSM, ODbL)
  <cc>-powerlines.json      ← context: high-voltage power lines (OSM, ODbL)
  <cc>-rail.json            ← context: main railway lines (OSM, ODbL)
scripts/
  gen-context.mjs           ← reusable generator: Overpass → simplified GeoJSON (lines + polygons)
  fetch-context.sh          ← robust driver: curl-fetch (retry) + gen-context per layer, idempotent
  README.md                 ← how to add context layers for a new country
.github/
  workflows/
    update-at-zones.yml     ← monthly job: fetch newest Austro Control ED-269 → commit data file
redirect.html               ← optional redirect page
```

> 🇨🇭 **CH needs none of the above** — the map overlay is the geo.admin.ch WMS layer and the zone detail comes from the geo.admin.ch Identify REST API, both called directly from the browser (CORS-open). No Netlify function, no hosted data file, no update workflow.

### Multi-country support (since v0.73)

SkyCheck uses an **adapter pattern** for country-specific geo-zone sources. Country is detected from the hostname (e.g. `skycheck-ch.netlify.app`) or the URL parameter `?country=de|fr|at|ch|es|dk|ie|nl|pt`. Default: `de`. Weather, ADS-B, METAR/TAF and Kp-index are global; the **UI language, the search-hint landmark and the geocoding bounding box** are set per country.

| Country | Geo-zone source | Overlay | Detail list / status | Data & updates |
|---|---|---|---|---|
| 🇩🇪 **DE** (default) | DiPUL WMS (`uas-betrieb.de`) | WMS tiles | WMS GetFeatureInfo | live service (official, always current) |
| 🇫🇷 **FR** | ED-269 dataset | client-side polygons/circles | `zones-fr.js` (bbox filter) | `data/uas-zones-fr.json` (~3.6k zones, replaceable) |
| 🇦🇹 **AT** | Austro Control ED-269 | all zones drawn client-side (286) | `zones-at.js` (bbox filter) | `data/uas-zones-at.json` — **auto-updated monthly** via GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | WMS tiles | geo.admin.ch **Identify** REST API | live service (CORS-open) — **no function, no file, no workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | WMS tiles | ArcGIS **Identify** REST API | live service (CORS-open) — **no function, no file, no workflow** |
| 🇩🇰 **DK** | Trafikstyrelsen ArcGIS FeatureServer | client-side vector polygons (~870, colour-coded) | ArcGIS query (bbox) | live service (CORS-open) — **no function, no file, no workflow** |
| 🇮🇪 **IE** | EASA Common Repository `ie_geozones` | client-side vector polygons (76) | ArcGIS query (bbox) | live service (CORS-open, **preliminary** EASA data) |

Three integration styles: **WMS + point query** (DE, CH, ES — official live services render the whole country and answer point queries directly), **client-side ArcGIS vector** (DK, IE — GeoJSON pulled live from an ArcGIS FeatureServer, drawn as colour-coded polygons), and **hosted ED-269 file + Netlify function** (FR, AT — a JSON dataset in the repo, bbox-filtered server-side; AT refreshes itself monthly).

### How many geo-zones per country?

Zone counts pulled directly from each country's live source (DE via DiPUL WFS across all 31 categories; ES via ENAIRE ArcGIS; FR/AT from the ED-269 datasets; CH from the geo.admin.ch GeoJSON; DK/IE via ArcGIS FeatureServer), normalised by land area:

| Country | Geo-zones | Area (km²) | Zones per 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Germany** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 Spain | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Switzerland | 1 232 | 41 285 | ≈ 30 |
| 🇩🇰 Denmark | 870 | 42 952 | ≈ 20 |
| 🇫🇷 France | 3 642 | 551 695 | ≈ 6.6 |
| 🇦🇹 Austria | 286 | 83 879 | ≈ 3.4 |
| 🇮🇪 Ireland\* | 76 | 70 273 | ≈ 1.1 |

\* Ireland's figure is from the EASA Common Repository, which is still **preliminary** (the national IAA dataset lists ~87) — so its count is indicative, not complete.

**Germany stands out drastically** — roughly **5.6×** the absolute count of the next country (Spain) and about **8×** the zone density of Spain/Switzerland, **37×** France and **73×** Austria. The reason is Germany's uniquely fine-grained zoning: it designates zones for categories the others largely don't — e.g. **industrial sites (24 482), residential properties (10 793), railway installations (9 819), nature reserves (9 012), even public outdoor pools (6 600)**. (Counting granularity differs between national datasets, which is itself the point: Germany zones far more categories at far finer resolution.)

### Legal basis — the zones are public by EU law

Under **Article 15(3) of Commission Implementing Regulation (EU) 2019/947**, every member state that defines UAS geographical zones **must make that information publicly available in a common unique digital format** — the EUROCAE **ED-269 / ED-318** standard — explicitly *for geo-awareness purposes*, i.e. so that apps and systems like SkyCheck can inform pilots. The **Open Data Directive (EU) 2019/1024** additionally frames such public-sector geospatial data as re-usable (geospatial being a "high-value dataset" category). In other words, the data is legally required to be openly accessible; SkyCheck merely displays each country's official source, with attribution. Exact re-use terms are still set nationally, so the individual data providers are credited above.

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
| v26.08.113.2 | 🇩🇪 **Height grid refined.** Finer ~300 m tiles on a canvas renderer (was ~940 m) so cells hug the round CTR boundaries — coarse tiles overlapped the edges and could show a green Zone-4 value at a Zone-3 point. Terrain is now bilinearly interpolated from a coarse support grid, with per-chunk retry and nearest-neighbour gap-filling, so a throttled elevation request no longer blanks half the CTR. The hover now computes the **maximum height at the exact cursor position** (an instant interpolated value, then the precise Open-Meteo elevation at that point) — noticeably lower on hills such as the Domberg — shown as a dark chip below the cursor so it no longer overlaps the DiPUL zone tooltip. Mobile: the geo-zone panel is always placed below the (multi-row) button bar, so they no longer overlap (S24 Ultra and smaller). The height formula itself was already correct. |
| v26.08.113.0 | 🇩🇪 **Height grid now covers the whole CTR (WFS redesign).** The traffic-light heatmap now spans the **entire** DFS control zone (like the Czech GRID) instead of a pin-centred 3 km grid, and is **computed once per CTR and cached** — clicking new positions inside the same CTR no longer rebuilds it (fixing the heatmap/button inconsistently disappearing after a few clicks). New data source: the **DiPUL WFS** (`dipul:kontrollzonen`) delivers the exact sub-zone polygons (each `U_CONTROL_ZONE_1…4` with its MSL lower limit); every cell is assigned to its **correct** sub-zone by point-in-polygon, terrain is fetched (Open-Meteo) and coloured via `computeCtrFlightInfo` — so the 2/3/4 steps are real rather than one detected zone applied everywhere. Toggle stays visible throughout Germany; binding remains DiPUL / NfL. |
| v26.08.112.0 | 🇩🇪 **Height grid (toggleable).** A traffic-light heatmap of the **maximum flight height per cell** inside a DFS control zone (CTR 2–4) — inspired by the Czech DroneMap GRID. **Hybrid**: DiPUL's WMS shows the sub-zone boundaries; the new overlay colours a 13×13 terrain grid (~3 km, Open-Meteo batch) via the existing `computeCtrFlightInfo` using the CTR zone detected at the location. Own map toggle + legend; appears only inside a German CTR 2/3/4. It is an **approximation** (one detected sub-zone applied across the grid — flat terrain in one zone reads fairly uniform; the 2/3/4 steps appear when moving between sub-zones) — binding remains DiPUL / NfL. |
| v26.08.111.0 | 🇳🇱🇵🇹 **Netherlands and Portugal added** (`skycheck-nl`, `skycheck-pt`). Both use the **EASA Common Repository** ArcGIS FeatureServers (client-side vector polygons, CORS-open) via the existing IE-style adapter: NL is ED-318 (~162 zones, coloured by `restriction`), PT is a KML-derived schema (~314 zones, coloured by `Restriction`, type from `FolderPath` — Aeroportos, CTRs, Zonas Militares, protected areas — ANAC contact). Country wiring (detection, names, bbox, landmark, CC, zone-source strip, country tile) and the full-overlay mechanism extended to `nl`/`pt`. For Czech Republic the clean official ED-269 route is on the roadmap (the ŘLP DronMap API is AES-obfuscated, the commercial Dronecharts WMS needs permission). |
| v26.08.110.2 | **Landing-page order clarified.** Country-specific SkyCheck variants now come first, followed by SkyAlarm, PointCloud Manager, GPS2UTM and MetaLens. |
| v26.08.110.1 | **Cross-app navigation completed.** SkyCheck now includes a PointCloud Manager card alongside SkyAlarm and GPS2UTM. |
| v26.08.110.0 | **GPS2UTM integration and shared version format.** The landing page links to GPS2UTM with the shared white/red/cyan wordmark. SkyCheck now uses `vYY.MM.major.subversion`, shown completely in the app header, footer and browser tab. |
| v1.09 | **Collapsible map controls on every screen size.** The compact one-row toolbar and collapsed weather/elevation/coordinate details now also replace the former desktop overlays, so split-screen and wide previews use the same interface as phones. |
| v1.08 | **Compact mobile map overlays.** The map toolbar is reduced to one row on phones; search radii 5/100/200 m and the 1.5 km alarm circle open on demand. The zone list stays visible while weather, terrain and coordinates are collapsible; address popups no longer duplicate GPS coordinates. |
| v1.07 | **GPS coordinate conversion and vertical datum.** WGS84/ETRS89 positions now show UTM immediately plus expandable Gauss-Krueger and GCG2016/DHHN2016 details. `coordinates.html` is a mobile live-GPS converter with the official Lübben control point as a built-in numerical check. |
| v1.06 | **Polished light map overlays.** The map controls, status panel, fullscreen button and map-style switch now use bright translucent surfaces on OSM. Controls follow a consistent rectangular 32 px system, while coloured context-layer toggles retain their category colour. Verified visually on desktop and 390 px mobile. |
| v1.05 | **Theme/map pairing and local Austria fallback.** Light interface now selects the standard OSM basemap, dark interface selects CARTO Dark; the separate map-style button can still override this afterwards. Local previews load the bundled Austro Control ED-269 file when Netlify Functions are unavailable, restoring all Austrian airport/control zones and point details. |
| v1.04 | **Global light interface.** A sun/moon button on the landing page and results navigation switches the complete SkyCheck interface, persists the preference, and keeps the integrated alarm view in sync. The same implementation applies to all seven country variants; map styling remains independently selectable. |
| v1.03 | **France performance.** The four OSM context layers are no longer loaded as full country files but bundled per 2° viewport tile — for Paris this cuts the transfer from ~4.1 MB to ~0.25 MB gzip. The French zones function also reads only the relevant spatial tiles on a cold start instead of the full 8.8 MB dataset. |
| v1.02 | **Point-analysis performance.** No blocking full-screen loader, an animated analysis circle, parallel queries, short-lived spatial caches, canvas rendering and improved browser/CDN caching. |
| v0.98 | **Browser tab title now follows the UI language.** The `<title>` tag was a static German string never wired to i18n, so every non-DE site showed a German tab title. Now `document.title` is set from a `docTitle` i18n key inside `applyLang()` — it updates on load (per country default language) and on every manual language switch, in all five languages |
| v0.97 | **Context layers extended to CH, ES, DK, IE, FR.** The Austria overlays from v0.96 (protected areas, motorways, power lines, railways) now exist for all non-DE countries (DE already has them via DiPUL). The client is generalised — `CONTEXT_META` + `CONTEXT_COUNTRIES`, one data file per country (`data/<cc>-<layer>.json`); the toggle group appears automatically for any listed country. The generator is now a single reusable tool (`scripts/gen-context.mjs` + a robust `fetch-context.sh` driver with curl-retry and resume) that **stitches OSM segments into long polylines before simplifying**, which shrank the large countries a lot (FR motorways 9 → 3.5 MB, ES 6 → 2.9 MB before gzip). France is clipped to a metropolitan bounding box (the ISO area would drag in overseas territories). Adding a future country = generate the data + add the code to `CONTEXT_COUNTRIES` (see `scripts/README.md`) |
| v0.96 | 🇦🇹 **Austria context layers.** skycheck-at can now overlay four extra, individually toggleable layers — **protected areas** (national parks, Natura 2000, nature reserves, landscape-protection areas, nature parks, biosphere reserves, protected landscape elements, natural monuments), **motorways**, **high-voltage power lines** and **main railways**. Sourced from **OpenStreetMap** (ODbL) as static, pre-simplified GeoJSON snapshots in `data/at-*.json` (generators in `scripts/`), lazy-loaded on toggle and drawn as coloured client-side vector overlays. They are **informational context** (distance-keeping guidance) — the binding zone check stays Austro Control / dronespace.at, so they do not feed the flight-status evaluation. Inspired by drohnenkarte.at, which uses the same open sources |
| v0.95 | Hotfix for v0.94: the global `de-DE`→`_locale()` replacement had also hit the `_LOCALES` map's own definition (`de: _locale()`), which read `_LOCALES` while it was still initialising — a temporal-dead-zone error that stopped the whole app from starting. Restored the `'de-DE'` literal. (`node --check` passes on syntax; this was a runtime-only regression, caught in the live smoke test.) |
| v0.94 | **Full i18n audit — no more German leaking into other languages.** Several dynamically-rendered sections (dew-point/icing analysis, METAR/TAF labels, estimated cloud base, loader/error messages, aircraft-marker popups, alerts, the "Updated" timestamp) were either hardcoded in German or only re-rendered their static labels on a language switch — so English/French users still saw German. Now every user-facing string routes through the i18n table (16 new keys × 5 languages), a `_locale()` helper drives all date/time formatting (was hardcoded `de-DE`), and switching language re-renders **all** dynamic result sections, not just the static `data-i18n` labels |
| v0.93 | **Landing polish & per-country correctness.** (1) New start-screen tile **"SkyCheck in other countries"** listing every other country variant as a direct link, styled like the wordmark (Sky white · Check cyan · `-xx` coral); the current country is omitted and the labels follow the UI language. (2) **Per-country geo-zone sources**: the source strip on the start and results pages (and the map layer toggle, formerly "DiPUL zones") now show the correct provider for each country instead of DiPUL everywhere — DE DiPUL/DFS, FR Géoportail, AT Austro Control, CH BAZL, ES ENAIRE/EASA, DK Trafikstyrelsen, IE EASA. (3) **Settings fully localised** in all five languages (previously German-only); the DiPUL layer-mode option — which only affects Germany — is now hidden outside DE, leaving just the country-agnostic 48 h forecast setting |
| v0.92 | 🇪🇸 **Spain source toggle**: the start screen now lets you pick the geo-zone source — **EASA** Common Repository (client-side ArcGIS vector, coloured by zone type, viewport-based; default) or **ENAIRE** servAIS (the previous official WMS). EASA renders cleaner, transparent per-zone polygons instead of the ENAIRE full-country WMS blanket; choice persists in `localStorage` |
| v0.91 | 🇮🇪 Bugfix: `getLegalLink` crashed on numeric `legal` values (Denmark's `Paragraf` field is a number), which took down the whole render pipeline for DK — coerced to string before the regex match |
| v0.90 | 🇩🇰 **Denmark** (`skycheck-dk`) & 🇮🇪 **Ireland** (`skycheck-ie`): two client-side **ArcGIS vector** adapters — DK from Trafikstyrelsen's FeatureServer, IE from the EASA Common Repository (ED-318, preliminary). Both fetch GeoJSON directly (CORS-open), colour polygons by category and support the full-country overlay |
| v0.89 | Address search restricted to the active country via Photon `countrycode` filter (removes cross-border neighbours the bounding box let through) |
| v0.88 | **Country-scoped address search**: `geocode()` was hard-wired to Germany (`lang=de` + a German bounding box) — every country variant only returned German suggestions. Now a per-country bounding box + UI-language are used |
| v0.87 | **Per-country defaults**: capital-landmark search placeholder (DE Brandenburg Gate, FR Eiffel Tower, AT St. Stephen's, CH Federal Palace, ES Puerta del Sol) and country-based default UI language on first visit |
| v0.86 | 🇪🇸 **Spain** (`skycheck-es`): new country adapter using the DE/CH pattern — ENAIRE servAIS **WMS** layer for the overlay + ENAIRE **ArcGIS Identify** for the detail list/status (structured altitude limits, legal links). CORS-open, no function/file/workflow |
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

Germany, France, Austria, Switzerland, Spain, Denmark & Ireland · Operation in VLOS · No liability for completeness or accuracy of the displayed data. Using the app does not replace any required official authorisation. SkyCheck is an **orientation aid** — the legally required authorisation and final airspace clearance are issued via the competent national portals (e.g. **DFS Aviation Services** for DE, **Austro Control Dronespace** for AT, **skyguide** for CH).

Data sources are subject to their respective licences (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch, ENAIRE, Trafikstyrelsen, EASA).
