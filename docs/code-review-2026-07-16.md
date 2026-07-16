# SkyCheck — Code-Review (Stand v0.77, 2026-07-16)

Vollständiger Review durch vier parallele Opus-4.8-Agenten (Logik/State,
Sicherheit, Fachlogik Meteo/Aviation, PWA/Robustheit/I18N), tragende Befunde am
Code gegenverifiziert. Anlass: Abgleich mit den SkyAlarm-Fixes v0.32–v0.38, da
die Alarm-/ADS-B-Ansicht von SkyAlarm aus SkyCheck abgespalten wurde.

Status-Legende: 🔴 offen · 🟢 behoben

---

## Abgleich SkyAlarm-Fixes → SkyCheck

| SkyAlarm-Fix | Gilt für SkyCheck? | Anmerkung |
|---|---|---|
| v0.32 Wetter-Staleness | **Nein** | `fetchWeather` nutzt 7-Tage-Fenster (`end = now+7d`), `date ≠ last_date` → volle Reihe. Kein Bug. (Vorbefund korrigiert.) |
| K1 Alarm-Zustellbarkeit | **Ja** | Kein Wake Lock, kein Audio-Unlock; zwei AudioContexts |
| K2 Höhenbezug MSL/AGL | **Ja** | AV-View prüft `alt_baro` (MSL) gegen 984 ft „AGL" ohne Geländeabzug |
| H1 Bodenverkehr = 0 | **Ja** | AV-View: `'ground'/null → 0`; Hauptansicht teils abgesichert |
| H2 Hysterese | **Ja** | AV-Alarm ohne Hold-Down |
| H3 XSS-Escaping + CSP | **Ja, größere Fläche** | Kein `escapeHtml`; zusätzlich Geocoding/METAR/Zonen-Sinks; keine CSP |
| H4/M1 Poll-Guard/Backoff | **Ja** | `avPoll` ohne Guard/Timeout/Backoff (`safeFetch` existiert, ungenutzt) |
| M2 Trail-Rendering | **Ja** | Eine Polyline pro Segment + Vollrebuild |
| M3 OGN-Proxy | **N/A** | Kein OGN-Proxy; stattdessen awc.js/gfz.js/zones-fr.js |
| N1 Wetter-Overlay-Persistenz | teilw. | zu prüfen bei Umsetzung |
| N3 nächstgelegenes Target | **Ja** (AV-View) | `near[0]` statt nächstem; S.alarm sortiert bereits |
| N4 Vereisungsband −20 °C | optional | aktuell −10 °C (Beobachtung, kein Fehler) |

---

## Struktureller Kernbefund: zwei redundante Alarm-Systeme

- **AV-View** (`avPoll`, `avCheckProx`, `avBeep`, ~3419–3644): eigener 2-s-Live-Poll,
  aber **nur aktiv, solange die Vollbild-Alarm-View geöffnet ist**. Eigener
  `_avAudioCtx`. Rohschema airplanes.live.
- **S.alarm** (`checkAircraftAlarm`, `playBell`, ~5217–5260): läuft **nur einmal pro
  manuellem `runCheck`** (kein Auto-Refresh-Interval). Eigener `_bellAudioCtx`.
  Normalisiertes Schema.

Folge: (a) S.alarm ist **kein Live-Alarm**, sondern eine Momentaufnahme — läutet aus
einem veralteten Snapshot endlos weiter bzw. meldet neu einfliegende Tiefflieger nie.
(b) Beide Systeme können **gleichzeitig Audio** abspielen; keiner stoppt den anderen.

---

## Kritisch / Hoch

| ID | Datei:Zeile | Befund |
|----|-------------|--------|
| A1 | skycheck.html:5133/5243 | S.alarm ist kein Live-Alarm (nur Snapshot bei `runCheck`); Glocke läutet aus veraltetem Snapshot endlos, neue Tiefflieger werden nie gemeldet |
| A2 | skycheck.html:3443/5243 | Beide Alarmsysteme spielen ggf. gleichzeitig Audio; `avClose` räumt `S.alarm.intervalId` nicht auf |
| H1 | skycheck.html:3513/3570/4067/5222 | Boden-/fehlende Höhe → 0 → Fehlalarm bei geparktem/Bodenverkehr (kein `alt_geom`-Fallback) |
| K2 | skycheck.html:3513/3521 | `alt_baro` (MSL) gegen 984-ft-„AGL"-Schwelle ohne Geländeabzug → echte Tiefflieger in erhöhtem Gelände verfehlt; Anzeige „m" suggeriert AGL |
| X1 | skycheck.html:3536 | ADS-B-Callsign ungeschützt in **permanentem** Leaflet-Tooltip → XSS **ohne Klick** (untrusted RF-Freitext) |
| X2 | skycheck.html:3315–3323, 5023, 3186 | Photon/OSM-Ortsname (öffentlich editierbar) ungeschützt ins Autocomplete + `data-name` + Pin-Popup; **persistent** über localStorage-Verlauf → Stored XSS |
| X3 | netlify.toml | Keine Security-Header (CSP/X-Frame-Options/X-Content-Type-Options) — eskaliert jede HTML-Injektion zu Skriptausführung/Exfiltration |
| K1a | skycheck.html (fehlt) | Kein Screen Wake Lock → OS suspendiert Poll-Timer bei dunklem Display, Alarm bleibt aus |
| K1b | skycheck.html:3618/5182 | AudioContext nur lazy in Alarm-Callbacks, kein Unlock in User-Geste → iOS-Alarm stumm |
| H4 | skycheck.html:3499–3506 | `avPoll` ohne AbortController/Timeout/In-Flight-Guard/Backoff (`safeFetch` existiert, ungenutzt); zudem keine Hysterese → Beep-Flattern |
| I1 | skycheck.html:5236, 3579/3596/3615 | Zentraler Alarm-/Warntext **hartkodiert deutsch** — EN/FR/ES/PL erhalten kritischen Gefahrentext auf Deutsch |

---

## Mittel

| ID | Datei:Zeile | Befund |
|----|-------------|--------|
| A3 | skycheck.html:5247 | `checkAircraftAlarm` setzt bei transienter Leer-/Fehlerantwort `silenced=false` → Stumm-Schaltung wird ungewollt aufgehoben |
| A4 | skycheck.html:3311–3326 | Autocomplete Stale-Response-Race: Debounce löscht nur Timer, nicht laufenden fetch → verspätete Antwort überschreibt Vorschläge |
| M-vis | skycheck.html:4105 | METAR-`visib` ist **statute miles** (verifiziert an EDDM/EDDF/KJFK), wird als „km" angezeigt → Faktor-1,61-Fehler (z. B. 4 SM = 6,4 km als „4 km") |
| X4 | skycheck.html:5279 | METAR/TAF-Rohtext ungeschützt in Popup (Trusted-Upstream → MITM nötig) |
| X5 | skycheck.html:4877 | DiPUL-Zonenname per `textContent` extrahiert, per `innerHTML` re-injiziert (Trusted-Upstream) |
| X6 | skycheck.html:5290 | Callsign im zweiten Aircraft-Renderpfad ungeschützt (nur bei Klick) |
| I2 | skycheck.html:2729–3035 | 8 i18n-Keys in fr/es/pl fehlen → `_t` fällt auf **Deutsch** zurück (METAR-Karte, Taupunkt-Kacheln) |
| I3 | skycheck.html:3793, 4370, 4658 | Zonen-/Freezing-Rain-/METAR-Texte nur binär `LANG==='de' ? DE : EN` → FR/ES/PL erhalten Englisch |
| M2 | skycheck.html:3508–3567 | Trail: Vollrebuild + eine Polyline **pro Segment** je Poll (~29×/Ziel) → GC-Churn |
| D1 | skycheck.html:3996–4008 | `fetchAircraftCached` ruft sich selbst rekursiv statt `fetchAircraft` → latenter Stack-Overflow (aktuell toter Code) |

---

## Niedrig

| ID | Datei:Zeile | Befund |
|----|-------------|--------|
| N3 | skycheck.html:3575 | AV-Banner zeigt `near[0]` statt nächstgelegenes Target |
| L1 | skycheck.html:3439/3496 | `avOpen` ohne Re-Entrancy-Guard → Poll-Timer-Leak bei Doppelaufruf |
| L2 | zones-fr.js:55/156 | Lon-Umrechnung ohne `cos(lat)` → Bbox ost-west ~30 % zu schmal (FR-Breiten) |
| L3 | awc.js:6, gfz.js:6/14, zones-fr.js:143 | Offene Proxys, CORS `*`, `e.message`-Leck im 502-Body; host-gebunden (kein SSRF) |
| L4 | skycheck.html:2119/2131 | 9 externe Links `target="_blank"` ohne `rel="noopener"` |
| L5 | skycheck.html:3068 | `switchLang` re-rendert METAR-Karte und Alarm-Banner nicht |
| L6 | sw.js:1 | `CACHE_NAME` nie erhöht → Icon/Manifest-Änderungen erreichen installierte Clients nie (HTML-Shell ist network-first, unkritisch) |

---

## Ausdrücklich als korrekt verifiziert

Wetter-Fenster (7 Tage, kein v0.32-Bug), Flugkategorien VFR/MVFR/IFR/LIFR (aus
AWC `fltCat`), Ceiling-Parsing (nur BKN/OVC), Taupunkt (Magnus/Alduchov-Eskridge),
Wolkenbasis (125 m/°C), Vereisungsband (−10…0 °C plausibel), alle Einheiten
(K→°C, kt→m/s, kt→km/h, ft→m), Haversine, DiPUL-δ-Formel, KP/Hp30-Anzeige,
Sonnenstand/Taglicht, Vorhersage-Aggregation, Service-Worker-HTML-Shell
(network-first + skipWaiting/clients.claim), awc.js/gfz.js (Timeout + Whitelist).
