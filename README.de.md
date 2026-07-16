**🌍 Sprache:** [English](README.md) · **Deutsch** · [Français](README.fr.md) · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Drohnenflugprüfung (DE · FR · AT · CH · ES)

**SkyCheck** ist eine kostenlose Single-Page Web-App zur schnellen Vorabprüfung von Drohnenflügen. Die App aggregiert Echtzeit-Daten aus mehreren offiziellen Quellen und gibt eine sofortige Flugempfehlung. Unser Verwendungszweck: Vermessung, Inspektion, Imagefilm, TV- & Filmproduktionen sowie Schulungen für den Drohnenführerschein A2/STS bei [www.multikopterschule.de](https://www.multikopterschule.de).

> 🔒 **Datenschutz zuerst · läuft im Browser · nichts zu installieren.**
> SkyCheck sammelt keine Daten, setzt kein Tracking und braucht weder Konto noch Anmeldung — die App kann Sie gar nicht ausspähen, weil es kein Backend gibt, das irgendetwas speichert. Alles läuft direkt in Ihrem Browser; die angezeigten Daten werden live geladen und sind in dem Moment weg, in dem Sie den Tab schließen. Zu installieren gibt es ebenfalls nichts: Das „Hinzufügen zum Startbildschirm" (als PWA) erzeugt lediglich eine Verknüpfung, die diese Webseite öffnet — im Grunde ein Lesezeichen mit Icon. Es wird kein App-Paket heruntergeladen, keine Berechtigungen werden erteilt, kein Hintergrundprozess läuft.

Wetter, Luftverkehr, METAR/TAF, Kp-Index und Geocoding sind überall identisch; nur die **Geozonen-Quelle** ist länderspezifisch und wird automatisch anhand des Hostnamens gewählt.

## 🌐 Live-Seiten

| Land | Live-App | Geozonen-Quelle |
|---|---|---|
| 🇩🇪 **Deutschland** | [skycheck-de.netlify.app](https://skycheck-de.netlify.app/) | DiPUL WMS — `uas-betrieb.de` |
| 🇫🇷 **Frankreich** | [skycheck-fr.netlify.app](https://skycheck-fr.netlify.app/) | ED-269-Datensatz (französische UAS-Zonen) |
| 🇦🇹 **Österreich** | [skycheck-at.netlify.app](https://skycheck-at.netlify.app/) | Austro Control ED-269 — monatlich automatisch aktualisiert |
| 🇨🇭 **Schweiz** | [skycheck-ch.netlify.app](https://skycheck-ch.netlify.app/) | BAZL / geo.admin.ch — WMS + Identify-API |
| 🇪🇸 **Spanien** | [skycheck-es.netlify.app](https://skycheck-es.netlify.app/) | ENAIRE servAIS — WMS + ArcGIS Identify |

> Alle fünf sind **dasselbe** Deployment von `skycheck.html` aus diesem Repo, jeweils auf einer eigenen Netlify-Site ausgeliefert. Länder-Erkennung: Hostname (`skycheck-<xx>.netlify.app`) oder der URL-Parameter `?country=de|fr|at|ch|es`. Default: `de`. Jede Länder-Variante setzt zusätzlich die **UI-Sprache**, einen **Hauptstadt-Wahrzeichen-Suchhinweis** sowie eine **länderabhängige Adresssuche** voreingestellt.

📦 **Aktuelle Version:** v0.89

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
| **Flugzeug-Alarm-View** | Vollbild-Karte mit akustischem Fluggeräusch-Alarm: meldet anfliegende Maschinen im einstellbaren Radius akustisch |
| **Luftraumkarte** | Länderspezifische Drohnen-Geozonen (DE: DiPUL · FR/AT: ED-269 · CH: geo.admin.ch · ES: ENAIRE) — Flugverbotszonen, Kontrollzonen, Naturschutzgebiete; Suchradius zwischen 5 m und 100 m umschaltbar |
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
| [Photon (Komoot)](https://photon.komoot.io/) | Geocoding / Ortssuche | ✅ |
| [Windy.com](https://www.windy.com/) | Externer Link für detaillierte Bewölkungsansicht | — |
| **Geozonen 🇩🇪** [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Drohnen-Luftraumzonen (WMS + GetFeatureInfo) | ✅ |
| **Geozonen 🇫🇷** ED-269-Datensatz | Französische UAS-Zonen (`data/uas-zones-fr.json`) | via `zones-fr.js` |
| **Geozonen 🇦🇹** [Austro Control / dronespace.at](https://www.dronespace.at/) | Österreichische UAS-Zonen, ED-269 (`data/uas-zones-at.json`) | via `zones-at.js` |
| **Geozonen 🇨🇭** [BAZL / geo.admin.ch](https://www.geo.admin.ch/) | Schweizer UAS-Zonen `ch.bazl.einschraenkungen-drohnen` (WMS + Identify) | ✅ |
| **Geozonen 🇪🇸** [ENAIRE servAIS](https://www.enaire.es/) | Spanische UAS-Zonen `SRV_UAS_ZG_V0` (WMS + ArcGIS Identify) | ✅ |

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
    zones-at.js             ← Österreich UAS-Zonen (liest data/uas-zones-at.json; ?all=1 = vollständiges Overlay)
data/
  uas-zones-fr.json         ← ED-269 Frankreich UAS-Zonen (monatlicher Snapshot, austauschbar)
  uas-zones-at.json         ← ED-269 Österreich UAS-Zonen (286 Zonen, automatisch aktualisiert)
  uas-zones-at.version      ← Marker des zuletzt importierten Austro-Control-Release (Idempotenz)
.github/
  workflows/
    update-at-zones.yml     ← monatlicher Job: neuestes Austro-Control-ED-269 abrufen → Datendatei committen
redirect.html               ← optionale Weiterleitungsseite
```

> 🇨🇭 **CH braucht nichts davon** — das Karten-Overlay ist der geo.admin.ch-WMS-Layer und das Zonen-Detail kommt aus der geo.admin.ch-Identify-REST-API, beide direkt aus dem Browser aufgerufen (CORS-offen). Keine Netlify-Function, keine gehostete Datendatei, kein Update-Workflow.

### Multi-Country-Support (seit v0.73)

SkyCheck nutzt ein **Adapter-Pattern** für länderspezifische Geozonen-Quellen. Das Land wird aus dem Hostname (z. B. `skycheck-ch.netlify.app`) oder dem URL-Parameter `?country=de|fr|at|ch|es` erkannt. Default: `de`. Wetter, ADS-B, METAR/TAF und Kp-Index sind global; die **UI-Sprache, das Suchhinweis-Wahrzeichen und die Geocoding-Bounding-Box** werden pro Land gesetzt.

| Land | Geozonen-Quelle | Overlay | Detailliste / Status | Daten & Updates |
|---|---|---|---|---|
| 🇩🇪 **DE** (Default) | DiPUL WMS (`uas-betrieb.de`) | WMS-Kacheln | WMS GetFeatureInfo | Live-Dienst (offiziell, stets aktuell) |
| 🇫🇷 **FR** | ED-269-Datensatz | client-seitige Polygone/Kreise | `zones-fr.js` (bbox-Filter) | `data/uas-zones-fr.json` (~3,6k Zonen, austauschbar) |
| 🇦🇹 **AT** | Austro Control ED-269 | alle Zonen client-seitig gezeichnet (286) | `zones-at.js` (bbox-Filter) | `data/uas-zones-at.json` — **monatlich automatisch aktualisiert** via GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | WMS-Kacheln | geo.admin.ch **Identify** REST-API | Live-Dienst (CORS-offen) — **keine Function, keine Datei, kein Workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | WMS-Kacheln | ArcGIS **Identify** REST-API | Live-Dienst (CORS-offen) — **keine Function, keine Datei, kein Workflow** |

Zwei Integrationsstile: **WMS + Punktabfrage** (DE, CH, ES — offizielle Live-Dienste rendern das ganze Land und beantworten Punktabfragen direkt) und **gehostete ED-269-Datei + Netlify-Function** (FR, AT — ein JSON-Datensatz im Repo, server-seitig bbox-gefiltert; AT aktualisiert sich monatlich selbst).

### Wie viele Geozonen pro Land?

Zonen-Anzahlen direkt aus der jeweiligen Live-Quelle des Landes gezogen (DE via DiPUL WFS über alle 31 Kategorien; ES via ENAIRE ArcGIS; FR/AT aus den ED-269-Datensätzen; CH aus dem geo.admin.ch-GeoJSON), normalisiert auf die Landesfläche:

| Land | Geozonen | Fläche (km²) | Zonen pro 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Deutschland** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 Spanien | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Schweiz | 1 232 | 41 285 | ≈ 30 |
| 🇫🇷 Frankreich | 3 642 | 551 695 | ≈ 6,6 |
| 🇦🇹 Österreich | 286 | 83 879 | ≈ 3,4 |

**Deutschland sticht drastisch hervor** — rund **5,6×** die absolute Menge des nächsten Landes (Spanien) und etwa **8×** die Zonendichte von Spanien/Schweiz, **37×** die von Frankreich und **73×** die von Österreich. Der Grund ist Deutschlands einzigartig feingranulare Verzonung: Es weist Zonen für Kategorien aus, die die anderen weitgehend nicht verzonen — z. B. **Industrieanlagen (24 482), Wohngrundstücke (10 793), Bahnanlagen (9 819), Naturschutzgebiete (9 012), sogar Freibäder (6 600)**. (Die Zählgranularität unterscheidet sich zwischen den nationalen Datensätzen, was selbst der Punkt ist: Deutschland verzont weit mehr Kategorien in weit feinerer Auflösung.)

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
| v0.89 | Adresssuche auf das aktive Land beschränkt via Photon-`countrycode`-Filter (entfernt grenznahe Nachbarn, die die Bounding-Box durchgelassen hatte) |
| v0.88 | **Länderabhängige Adresssuche**: `geocode()` war fest auf Deutschland verdrahtet (`lang=de` + eine deutsche Bounding-Box) — jede Länder-Variante lieferte nur deutsche Vorschläge. Jetzt werden eine länderspezifische Bounding-Box + UI-Sprache verwendet |
| v0.87 | **Länder-spezifische Defaults**: Hauptstadt-Wahrzeichen als Such-Placeholder (DE Brandenburger Tor, FR Eiffelturm, AT Stephansdom, CH Bundeshaus, ES Puerta del Sol) und länderbasierte Standard-UI-Sprache beim Erstbesuch |
| v0.86 | 🇪🇸 **Spanien** (`skycheck-es`): neuer Länder-Adapter nach dem DE/CH-Muster — ENAIRE-servAIS-**WMS**-Layer für das Overlay + ENAIRE-**ArcGIS-Identify** für Detailliste/Status (strukturierte Höhenlimits, Rechtslinks). CORS-offen, keine Function/Datei/Workflow |
| v0.85 | 🇨🇭 **Schweiz** (`skycheck-ch`): neuer Länder-Adapter nach dem DE-Muster — geo.admin.ch-**WMS**-Layer für das Karten-Overlay + geo.admin.ch-**Identify**-REST-API für Detailliste/Status. Beide CORS-offen, daher werden keine Netlify-Function, keine gehostete Datei und kein Update-Workflow benötigt |
| v0.84 | 🇦🇹 AT-Karten-Overlay zeichnet jetzt **alle** österreichischen Zonen (vollständiges Landes-Overlay via `?all=1`, wie das DE-WMS) statt nur der punktgefilterten Zonen am markierten Standort |
| v0.83 | 🇦🇹 **Österreich** (`skycheck-at`): neuer Länder-Adapter. `zones-at.js` parst den Austro-Control-ED-269-Datensatz; `data/uas-zones-at.json` wird durch einen GitHub-Actions-Workflow (`update-at-zones.yml`) **monatlich automatisch aktualisiert** |
| v0.78–v0.82 | Security- & Qualitäts-Durchgang (XSS-Escaping + CSP, METAR-Sichtweiten-Einheitenfix, Vollständigkeit der 5 Sprachen, Alarm-Defekt-Fixes, Eis/Nebel/Sicht in der Live-Ansicht) — siehe `docs/code-review-2026-07-16.md` |
| v0.76 | Fix Race Condition: FR-Zonen-Overlay (Polygone / Kreise) erscheint jetzt direkt beim Erstaufruf (vorher nur nach Doppelklick mit Re-Fetch). Der `drawZoneOverlay`-Aufruf lief vor der Map-Erstellung; nach Map-Init wird jetzt einmal mit dem `lastZones`-Cache nachgezeichnet |
| v0.75 | Country-Name-i18n: Landing-Page-Badge und Footer zeigen den aktiven Country-Namen in der gewählten UI-Sprache (z. B. FR-Domain + ES-UI → „Verificación de vuelo de dron · Francia"). Neue `COUNTRY_NAMES`-Lookup-Tabelle, `_country()`-Helper, `{country}`-Placeholder durch `_t()` interpoliert. `fltcatDisclaimer` entcountrifiziert (EU-weite Regelung, kein Country-Bezug nötig) |
| v0.74 | FR-Map-Overlay: Geozonen im FR-Modus werden jetzt zusätzlich zur Liste als Leaflet-Polygone / -Kreise auf der Karte gezeichnet. `zones-fr.js` liefert Geometrie mit; `drawZoneOverlay()` rendert client-seitig. Zone-Toggle bleibt kompatibel |
| v0.73 | Country-Adapter-Architektur (Stufe 1): Multi-Country-Support für Geozonen. Country-Detection via URL-Param (`?country=fr`) oder Hostname; neue Netlify-Function `zones-fr.js` liest ED-269-JSON für Frankreich (`data/uas-zones-fr.json`, ~3,6k Zonen), DE behält DiPUL-WMS |
| v0.72 | Info-Modal-Text korrigiert (Zielgruppe, Spezifische Kategorie, neuer Datenschutz-Abschnitt); README von nur Deutsch → 5 Sprachen umgestellt |
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
| v0.20 | `APP_VER`-Variable, Kp-Messung Zeitstempel |
| v0.15 | GFZ async geladen, Netlify Function als primärer Proxy, Ladezeit ~1 s |
| v0.14 | Netlify Serverless Function `gfz.js` als zuverlässiger CORS-Proxy |
| v0.10 | GFZ Hp30 Balkengrafik (4 × Messung + Forecast) |

---

## Datenschutz

SkyCheck trackt oder speichert keine Nutzerdaten. Die App ist eine reine Web-Anwendung — auch die „Installation" als PWA legt nur ein App-Icon ab und installiert nichts dauerhaft. Daten werden nur temporär geladen und sind beim Verlassen der App wieder weg.

---

## Lizenz & Haftung

Deutschland, Frankreich, Österreich, Schweiz & Spanien · Betrieb in VLOS · Keine Haftung für Vollständigkeit oder Richtigkeit der angezeigten Daten. Die Nutzung der App ersetzt keine erforderliche behördliche Genehmigung. SkyCheck ist eine **Orientierungshilfe** — die gesetzlich vorgeschriebene Genehmigung und finale Luftraumfreigabe erfolgen über die zuständigen nationalen Portale (z. B. **DFS Aviation Services** für DE, **Austro Control Dronespace** für AT, **skyguide** für CH).

Datenquellen unterliegen ihren jeweiligen Lizenzen (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch, ENAIRE).
