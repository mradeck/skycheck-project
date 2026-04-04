# SkyCheck — Drohnenflugprüfung für Deutschland

**SkyCheck** ist eine Single-Page Web-App zur schnellen Vorabprüfung von Drohnenflügen in Deutschland. Die App aggregiert Echtzeit-Daten aus mehreren offiziellen Quellen und gibt eine sofortige Flugempfehlung.

🌐 **Live:** [enchanting-stardust-f713da.netlify.app/skycheck.html](https://enchanting-stardust-f713da.netlify.app/skycheck.html)

---

## Features

| Bereich | Details |
|---|---|
| **Flugempfehlung** | Ampel-System (Go / Warn / No-Go) basierend auf Wind, Böen, Regen und Kp-Index |
| **Wetter** | Windböen, Windgeschwindigkeit, Windrichtung, Temperatur, Taupunkt, Sichtweite, Bewölkung, Niederschlag |
| **Windprofil** | Hochrechnung der Windgeschwindigkeit nach Höhe (10 / 60 / 120 / 150 m AGL) via Potenzgesetz |
| **Kp-Index** | Aktueller Kp-Wert von NOAA + GFZ Potsdam Hp30-Balkengrafik (letzten 4 × 30 min + Forecast) |
| **Luftverkehr** | ADS-B Echtzeit-Flugbewegungen im 200-km-Umkreis mit Höhenfarben und Radar-Icons |
| **Luftraumkarte** | DiPUL-Zonen (WMS) inkl. Flugverbotszonen, Kontrollzonen, Naturschutzgebiete |
| **48h-Vorschau** | Stündliche Wettervorschau über 2 Tage (scrollbar, Drohnenflug-Ampel je Stunde) |
| **5-Tage-Überblick** | Tagesübersicht mit Min/Max-Temperatur, Wind und Ampelbewertung (scrollbar) |
| **Hinweise & Warnungen** | Kontextuelle Warnungen (GPS-Störung, erhöhter Luftverkehr, No-Fly-Begründung) |

---

## Technologie

- **Single-File HTML/JS/CSS** — keine Build-Tools, keine Dependencies, kein Framework
- **Leaflet.js** für die interaktive Karte
- **Netlify** für Hosting + Serverless Functions (GFZ-Proxy)

---

## Datenquellen

| Quelle | Daten | CORS |
|---|---|---|
| [DWD BrightSky](https://brightsky.dev/) | Wetterdaten (stündlich, 7 Tage) | ✅ |
| [GFZ Potsdam](https://kp.gfz.de/) | Kp-Index, Hp30 (30-min-Auflösung) | ❌ → Netlify Function |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Kp-Index Fallback | ✅ |
| [Airplanes.live](https://airplanes.live/) | ADS-B Flugbewegungen | ✅ |
| [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Drohnen-Luftraumzonen WMS | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geocoding / Ortssuche | ✅ |

---

## Architektur

```
skycheck.html               ← gesamte App (HTML + CSS + JS)
netlify/functions/gfz.js    ← Serverless Proxy für GFZ Potsdam API (CORS-Umgehung)
redirect.html               ← optionale Weiterleitungsseite
```

### GFZ-Proxy Fallback-Kette

Die GFZ-API sendet keine CORS-Header. SkyCheck versucht daher in dieser Reihenfolge:

```
1. Direkter Fetch          →  schlägt im Browser durch CORS fehl
2. /.netlify/functions/gfz →  server-seitiger Proxy (primär, zuverlässig)
3. api.allorigins.win      →  öffentlicher CORS-Proxy (letzter Fallback)
```

### Asynchrones Laden

Wetter, Luftverkehr und Kp-Index werden parallel geladen. Die GFZ-Hp30-Kachel lädt asynchron im Hintergrund nach, ohne die Hauptanzeige zu blockieren — die Statusseite erscheint dadurch in ~1 Sekunde.

---

## Lokale Entwicklung

```bash
# Einfacher HTTP-Server (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# Mit Netlify Functions (empfohlen für GFZ-Kachel)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888/skycheck.html
```

> **Hinweis:** Ohne `netlify dev` schlägt die GFZ-Kachel auf localhost fehl, da `/.netlify/functions/gfz` nicht verfügbar ist. Alle anderen Kacheln funktionieren auch mit dem einfachen HTTP-Server.

---

## Flugempfehlung — Bewertungslogik

| Kriterium | Warnung | No-Go |
|---|---|---|
| Windböen | > 7 m/s | > 10 m/s |
| Kp-Index | > 3,3 (GPS beeinträchtigt) | > 5,0 (GPS unzuverlässig) |
| Niederschlag | > 0 mm | > 0,3 mm |

---

## Versionshistorie (Auszug)

| Version | Änderung |
|---|---|
| v0.15 | GFZ async geladen, Netlify Function als primärer Proxy, Ladezeit ~1s |
| v0.14 | Netlify Serverless Function `gfz.js` als zuverlässiger CORS-Proxy |
| v0.13 | Mobile-Optimierung: 5-Tage-Scroll, Windprofil 60/120m, Luftverkehr → Hinweise |
| v0.12 | Fix: allorigins.win als CORS-Proxy (corsproxy.io nur localhost) |
| v0.11 | Fix: Bewölkung zeigt aktuelle Stunde, korrekter Kachelmann-Link |
| v0.10 | GFZ Hp30 Balkengrafik (4 × Messung + Forecast) |

---

## Lizenz

Nur für Deutschland · Betrieb in VLOS · Keine Haftung für Vollständigkeit oder Richtigkeit der angezeigten Daten. Die Nutzung der App ersetzt keine behördliche Genehmigung.

Datenquellen unterliegen ihren jeweiligen Lizenzen (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use).
