**🌍 Sprache:** [English](README.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Drohnenflugprüfung für Deutschland

**SkyCheck** ist eine kostenlose Single-Page Web-App zur schnellen Vorabprüfung von Drohnenflügen in Deutschland. Die App aggregiert Echtzeit-Daten aus mehreren offiziellen Quellen und gibt eine sofortige Flugempfehlung. Unser Verwendungszweck: Vermessung, Inspektion, Imagefilm, TV- & Filmproduktionen sowie Schulungen für den Drohnenführerschein A2/STS bei [www.multikopterschule.de](https://www.multikopterschule.de).

🌐 **Live:** [enchanting-stardust-f713da.netlify.app/skycheck.html](https://enchanting-stardust-f713da.netlify.app/skycheck.html)

📦 **Aktuelle Version:** v0.74

---

## Features

| Bereich | Details |
|---|---|
| **Flugempfehlung** | Ampel-System (Go / Warn / No-Go) basierend auf Wind, Böen, Niederschlag und Kp-Index |
| **Wetter** | Windböen, Windgeschwindigkeit, Windrichtung, Temperatur, Taupunkt, Sichtweite, Bewölkung, Niederschlag — Daten von DWD via BrightSky |
| **METAR / TAF** | Echtzeit-Flugwetterdaten von nahegelegenen Flugplätzen (NOAA Aviation Weather Center), inkl. Flugkategorie-Ampel VFR / MVFR / IFR / LIFR |
| **Windprofil** | Hochrechnung der Windgeschwindigkeit nach Höhe (10 / 60 / 120 / 150 m AGL) via Potenzgesetz |
| **Kp-Index** | Aktueller Kp-Wert von NOAA + GFZ Potsdam Hp30-Balkengrafik (letzten 4 × 30 min + Forecast) |
| **Luftverkehr** | ADS-B Echtzeit-Flugbewegungen im Umkreis mit Höhenfarben und Radar-Icons (Airplanes.live) |
| **Flugzeug-Alarm-View** | Vollbild-Karte mit Fluggeräusch-Alarm: meldet anfliegende Maschinen im einstellbaren Radius akustisch |
| **Luftraumkarte** | DiPUL-WMS-Zonen (uas-betrieb.de) inkl. Flugverbotszonen, Kontrollzonen, Naturschutzgebiete; Suchradius 5 m oder 100 m umschaltbar |
| **48 h Vorschau** | Stündliche Wettervorschau über 2 Tage (scrollbar, Drohnenflug-Ampel je Stunde) |
| **5-Tage-Überblick** | Tagesübersicht mit Min/Max-Temperatur, Wind und Ampelbewertung |
| **Hinweise & Warnungen** | Kontextuelle Warnungen (GPS-Störung bei hohem Kp, erhöhter Luftverkehr, No-Fly-Begründung) |
| **5 Sprachen** | Deutsch, Englisch, Französisch, Spanisch, Polnisch — umschaltbar auf der Landing-Page |
| **PWA** | Als Web-App installierbar (Install-Banner mit 30-Tage-Cooldown), funktioniert offline für statische Inhalte |

---

## Technologie

- **Single-File HTML/JS/CSS** — keine Build-Tools, keine Dependencies, kein Framework
- **Leaflet.js** für die interaktive Karte
- **Service Worker** (`sw.js`) + **Web App Manifest** (`manifest.json`) für PWA-Unterstützung
- **Netlify** für Hosting + Serverless Functions (CORS-Proxies)

---

## Datenquellen

| Quelle | Daten | CORS |
|---|---|---|
| [DWD BrightSky](https://brightsky.dev/) | Wetterdaten (stündlich, 7 Tage) | ✅ |
| [NOAA Aviation Weather Center](https://aviationweather.gov/) | METAR / TAF | ❌ → Netlify Function `awc.js` |
| [GFZ Potsdam](https://kp.gfz.de/) | Kp-Index, Hp30 (30-min-Auflösung) | ❌ → Netlify Function `gfz.js` |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Kp-Index Fallback | ✅ |
| [Airplanes.live](https://airplanes.live/) | ADS-B Flugbewegungen | ✅ |
| [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Drohnen-Luftraumzonen WMS | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geocoding / Ortssuche | ✅ |
| [Windy.com](https://www.windy.com/) | Externer Link für detaillierte Bewölkungsansicht | — |

---

## Architektur

```
skycheck.html               ← gesamte App (HTML + CSS + JS, ~5.2k Zeilen)
manifest.json               ← PWA Web App Manifest
sw.js                       ← Service Worker (Caching)
icon-192x192.png            ← App-Icon (klein)
icon-512x512.png            ← App-Icon (groß)
skycheck-icon.svg           ← Quell-Icon (Vektor)
netlify.toml                ← Netlify-Config (Function-Bundle-Includes + Root-URL-Rewrite)
netlify/
  functions/
    awc.js                  ← NOAA AWC Proxy für METAR/TAF (CORS-Umgehung)
    gfz.js                  ← GFZ Potsdam Proxy für Kp-Index/Hp30
    zones-fr.js             ← Frankreich UAS-Zonen (liest data/uas-zones-fr.json, bbox-gefiltert)
data/
  uas-zones-fr.json         ← ED-269 Frankreich UAS-Zonen (monatlicher Snapshot, austauschbar)
redirect.html               ← optionale Weiterleitungsseite
```

### Multi-Country-Support (seit v0.73)

SkyCheck nutzt ein **Adapter-Pattern** für länderspezifische Datenquellen. Country wird aus URL-Param `?country=fr` oder Hostname (z. B. `skycheck-fr.netlify.app`) erkannt. Default: `de`.

| Country | Geozonen-Quelle | Status |
|---|---|---|
| **DE** (Default) | DiPUL WMS GetFeatureInfo (uas-betrieb.de) | live |
| **FR** | Netlify-Function `zones-fr.js` + monatliches ED-269-JSON | live |
| (weitere) | Platzhalter — Adapter bereit für zusätzliche Provider | — |

Wetter, ADS-B, METAR/TAF, Kp-Index und Geocoding sind global und werden in jeder Country-Variante unverändert verwendet.

### Netlify Functions (CORS-Proxies)

Die Aviation-Weather- und GFZ-APIs senden keine CORS-Header, daher laufen sie über Netlify Functions:

- `awc.js` — leitet `aviationweather.gov/api/data/{metar,taf}` durch, fügt CORS-Header hinzu, 10 s Timeout, 90 s Cache
- `gfz.js` — leitet `kp.gfz.de`-Anfragen durch (Kp-Index, Hp30)

### Asynchrones Laden

Wetter, Luftverkehr, METAR/TAF und Kp-Index werden parallel geladen. Die GFZ-Hp30-Kachel lädt asynchron im Hintergrund nach, ohne die Hauptanzeige zu blockieren — die Statusseite erscheint dadurch in ~1 Sekunde.

### Geozonen-Detektion (DiPUL WMS GetFeatureInfo)

Die WMS-`GetFeatureInfo`-Anfrage nutzt ein 101×101-Pixel-Raster. Der effektive Suchradius wird über die Bounding-Box-Größe `δ` gesteuert:

```javascript
δ = Math.max(0.001134, radiusM * 101 / (4 * 111320))
```

Damit lässt sich der Suchradius zwischen 5 m und 100 m präzise skalieren (empirisch kalibriert).

---

## Lokale Entwicklung

```bash
# Einfacher HTTP-Server (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# Mit Netlify Functions (empfohlen — sonst kein METAR/TAF/Kp)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888/skycheck.html
```

> **Hinweis:** Ohne `netlify dev` schlagen die METAR/TAF- und GFZ-Kachel auf localhost fehl, da `/.netlify/functions/*` nicht verfügbar ist. Wetter, ADS-B und Luftraum funktionieren auch mit dem einfachen HTTP-Server.

---

## Flugempfehlung — Bewertungslogik

| Kriterium | Warnung | No-Go |
|---|---|---|
| Windböen | > 7 m/s | > 10 m/s |
| Kp-Index | > 3,3 (GPS beeinträchtigt) | > 5,0 (GPS unzuverlässig) |
| Niederschlag | > 0 mm | > 0,3 mm |
| Geozone | ohne Auflagen, Naturschutz-Pufferzone | aktive Flugverbotszone |

---

## Versionshistorie (Auszug)

| Version | Änderung |
|---|---|
| v0.74 | FR-Map-Overlay: Geozonen im FR-Modus werden jetzt zusätzlich zur Liste als Leaflet-Polygone / -Kreise auf der Karte gezeichnet. `zones-fr.js` liefert Geometrie mit; `drawZoneOverlay()` rendert client-seitig. Zone-Toggle bleibt kompatibel |
| v0.73 | Country-Adapter-Architektur (Stufe 1): Multi-Country-Support für Geozonen. Country-Detection via URL-Param (`?country=fr`) oder Hostname; neue Netlify-Function `zones-fr.js` liest ED-269-JSON für Frankreich (`data/uas-zones-fr.json`, ~3,6k Zonen), DE behält DiPUL-WMS |
| v0.72 | Info-Modal-Text korrigiert (Zielgruppe, Spezifik-Kategorie, neuer Datenschutz-Abschnitt); README zweisprachig umgestellt → später auf 5 Sprachen erweitert |
| v0.71 | 5 Sprachen unterstützt (DE / EN / FR / ES / PL); Sprachbutton auf Landing-Page |
| v0.70 | Flugkategorien-Info-Modal (VFR / MVFR / IFR / LIFR) |
| v0.69 | Bewölkung-Link auf Windy, METAR-Wind mit °-Zeichen und Farbcodes |
| v0.68 | SkyAlarm-Link auf Landing-Page |
| v0.67 | Kartenstil-Button über Leaflet-Attribution gehoben (z-index Fix) |
| v0.66 | Tiefflieger-Overlay verschmälert, Kartenstil-Cycler in Hauptkarte |
| v0.65 | Fix: literale `\n`-Zeichen im HTML der METAR-Sektion |
| v0.64 | Neue Netlify Function `awc.js` als CORS-Proxy für NOAA AWC (METAR/TAF) |
| v0.63 | `fetchZones`-δ-Formel empirisch kalibriert, Default-Radius 100 m |
| v0.58 | Geozonen-Radius-Kopplung 5 m / 100 m |
| v0.57 | PWA-Install-Banner (`beforeinstallprompt`) |
| v0.54 | METAR/TAF-Integration, Flugplatz-Marker auf Karte, METAR-Card |
| v0.35 | Flugzeug-Alarm-View (Fullscreen, ADS-B, Haversine, Web Audio, Leaflet-Map) |
| v0.27 | Sprachumschalter DE/EN, vollständige I18N |
| v0.20 | `APP_VER`-Variable, KP-Messung Zeitstempel |
| v0.15 | GFZ async geladen, Netlify Function als primärer Proxy, Ladezeit ~1 s |
| v0.14 | Netlify Serverless Function `gfz.js` als zuverlässiger CORS-Proxy |
| v0.10 | GFZ Hp30 Balkengrafik (4 × Messung + Forecast) |

---

## Datenschutz

SkyCheck trackt oder speichert keine Nutzerdaten. Die App ist eine reine Web-Anwendung — auch die „Installation" als PWA legt nur ein App-Icon ab und installiert nichts dauerhaft. Daten werden nur temporär geladen und sind beim Verlassen der App wieder weg.

---

## Lizenz & Haftung

Nur für Deutschland · Betrieb in VLOS · Keine Haftung für Vollständigkeit oder Richtigkeit der angezeigten Daten. Die Nutzung der App ersetzt keine behördliche Genehmigung. SkyCheck ist eine **Orientierungshilfe** — die gesetzlich vorgeschriebene Genehmigung und finale Luftraumfreigabe erfolgen über die **DFS Aviation Services App** und weitere zugelassene Portale.

Datenquellen unterliegen ihren jeweiligen Lizenzen (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL).
