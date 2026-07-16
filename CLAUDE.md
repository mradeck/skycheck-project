# SkyCheck – Projekt-Kontextdatei für Claude-Sessions

---
## ⚠️ SESSION-START-PROTOKOLL — vor dem ersten Werkzeugaufruf bestätigen

1. **Umgebung erkennen:**
   - **Claude Code** (Terminal): Direkter Dateizugriff — sofort arbeitsfähig.
   - **Cowork** (Desktop-App): LLM-Wiki mounten (siehe unten), Overlay-Einschränkungen beachten.
2. **LLM-Wiki** (nur Cowork — Claude Code liest direkt):
   - **Mac-Pfad:** `~/Library/Mobile Documents/com~apple~CloudDocs/code/obsidian-claude-llm-wiki`
   - Falls in Cowork noch nicht gemountet → `request_cowork_directory` aufrufen.
   - Wiki-Dateien lesen (in dieser Reihenfolge):
     1. `claude-llm-wiki/CLAUDE.md` — Schema & Konventionen
     2. `claude-llm-wiki/wiki/index.md` — Inhaltsverzeichnis
     3. `claude-llm-wiki/wiki/projects/SkyCheck.md` — Projektübersicht
     4. `claude-llm-wiki/wiki/projects/skycheck-architektur.md` — Technische Architektur
     5. `claude-llm-wiki/wiki/projects/skycheck-arbeitsregeln.md` — Verbindliche Arbeitsregeln
     6. `claude-llm-wiki/wiki/projects/skycheck-changelog.md` — Versionshistorie
     7. `claude-llm-wiki/wiki/log.md` — Letzter Log-Eintrag (nächste Schritte)
3. **Projektpfad auf dem Mac:** `/Users/michaelradeck/Downloads/code/cowork/skycheck_project` — kein anderer Pfad ist korrekt.
4. **Version prüfen:** `grep APP_VER skycheck.html` — bei Abweichung zum Wiki:
   ```bash
   git fetch origin && git reset --hard origin/master
   ```
5. **Antwort-Titel:** Jede Antwort beginnt mit Datum, Uhrzeit und aktueller Versionsnummer (z. B. `## 2026-05-15 10:00 — SkyCheck v0.76`).

---

**Datei:** `skycheck.html` (Single-File HTML/JS/CSS, ~5290 Zeilen)
**Live:** https://enchanting-stardust-f713da.netlify.app/skycheck.html
**Repo:** https://github.com/mradeck/skycheck-project.git
**Aktuell:** v0.88 — Adressvorschläge (Photon-Geocoding) jetzt länderabhängig per Bounding-Box + passender Sprache (vorher fest auf Deutschland). Vorgänger v0.87 — Länder-Defaults: Suchfeld-Platzhalter zeigt ein Hauptstadt-Wahrzeichen des jeweiligen Landes, UI-Sprache wird beim Erstbesuch länderabhängig vorgewählt (fr→fr, es→es, sonst de). Vorgänger v0.86 — Spanien-Erweiterung (`skycheck-es`) nach CH/DE-Muster: ENAIRE-servAIS-WMS fürs Overlay + ArcGIS-Identify für die Detailliste, beide CORS-offen (keine Function/Datei/Workflow). Vorgänger v0.85 — Schweiz-Erweiterung (`skycheck-ch`) nach DE-Muster: geo.admin.ch-WMS fürs flächige Overlay + Identify-REST-API für die Detailliste, beide CORS-offen (keine Function/Datei/Workflow nötig). Vorgänger v0.84 — AT-Karten-Overlay zeigt jetzt ALLE 286 österreichischen Geozonen flächig (statt nur der punktgefilterten am Standort), analog DE-WMS; Details siehe Historie. Vorgänger v0.83 — **Österreich-Erweiterung (`skycheck-at`)**: neuer Country-Adapter `at` analog FR. Netlify-Function `zones-at.js` parst den Austro-Control-ED-269-Datensatz (`data/uas-zones-at.json`, 286 Zonen) direkt, filtert per Bbox und liefert normalisierte Zonen inkl. `restriction`→Ampel, Höhengrenzen, Rechtsgrundlage (RIS-URL) und lokalisierter Detailbeschreibung (`localizedMessages` de-AT/en). `COUNTRY='at'` via Hostname `skycheck-at.netlify.app` bzw. `?country=at`. **Auto-Update** via GitHub-Actions-Workflow `.github/workflows/update-at-zones.yml` (monatlich, idempotent): ermittelt den neuesten Produktions-Release auf austrocontrol.at, entpackt die JSON, committet `data/uas-zones-at.json` → Netlify-Auto-Deploy. Zonen sind reine Polygone (keine Kreise). Vorgänger: v0.78–v0.82 Code-Review-Umsetzung (`docs/code-review-2026-07-16.md`, Abgleich mit SkyAlarm-Fixes): v0.78 XSS-Escaping aller Fremddaten-Sinks (Callsigns, OSM-Ortsnamen inkl. Verlaufs-Persistenz, METAR/TAF, Zonen) + CSP-Header + Geocode-Stale-Guard; v0.79 METAR/TAF-Sichtweite-Einheit (statute miles → km); v0.80 Mehrsprachigkeit (hartkodierter dt. Alarmtext + binäre DE/EN-Zonen-/METAR-Texte → volle 5-Sprachigkeit, 18 neue i18n-Keys); v0.81 Alarm-Defekte (Doppel-Audio AV-View/Hauptalarm, Bodenverkehr-Fehlalarm); v0.82 Eis/Nebel/Sichtweite im Live-View. Bewusst NICHT portiert (kein SkyAlarm-Feature-Set): Wake Lock, AGL-Geländekorrektur, Poll-Backoff/Hysterese, Trail-Rendering-Umbau
**Projektpfad (Mac):** `/Users/michaelradeck/Downloads/code/cowork/skycheck_project`
**LLM-Wiki (Mac):** `~/Library/Mobile Documents/com~apple~CloudDocs/code/obsidian-claude-llm-wiki`
**Netlify-Funktionen:**
- `netlify/functions/awc.js` — Proxy für `aviationweather.gov/api/data/{metar,taf}` (CORS-Header, 10 s Timeout, 90 s Cache)
- `netlify/functions/gfz.js` — GFZ Potsdam Proxy für Kp-Index/Hp30
- `netlify/functions/zones-fr.js` — FR-Geozonen aus `data/uas-zones-fr.json` (bbox-Filter, 300 s Cache); inkludiert via `netlify.toml` → `[functions] included_files = ["data/**/*"]`

**`netlify.toml`-Routing:**
- `[functions] included_files = ["data/**/*"]` — bringt `data/uas-zones-fr.json` ins Function-Bundle
- `[[redirects]] from = "/" to = "/skycheck.html" status = 200` — Rewrite, damit die Domain-Wurzel (`skycheck-de.netlify.app/`, `skycheck-fr.netlify.app/`) ohne `/skycheck.html`-Suffix funktioniert; URL bleibt `/`; Hostname-basierte COUNTRY-Detection bleibt wirksam

---

## Hybrid-Workflow (seit v0.54)

### Primär: Claude Code (CLI) — für alle Code-Aufgaben

Claude Code läuft direkt im Mac-Terminal mit vollem Dateisystem- und Git-Zugriff.
Kein Overlay, kein Clipboard-Transfer, kein index.lock-Problem.

```bash
# Start:
cd ~/Downloads/code/cowork/skycheck_project && claude

# Typischer Ablauf innerhalb von Claude Code:
# 1. Sektion finden:
grep -n '\[J-RENDER-GRID\]' skycheck.html

# 2. Kontext lesen & Änderung vornehmen (direkte Datei-Edits)

# 3. JS-Syntaxcheck:
sed -n '/<script>$/,/<\/script>/p' skycheck.html | head -n -1 | tail -n +2 > /tmp/check.js && node --check /tmp/check.js

# 4. Commit & Push:
git add skycheck.html && git commit -m 'SkyCheck vX.XX' && git push

# 5. Netlify-Verifikation (~20s warten):
curl -s "https://enchanting-stardust-f713da.netlify.app/skycheck.html" | grep -o "APP_VER = '0\.[0-9]*'"
```

### Sekundär: Cowork (Desktop-App) — für Nicht-Code-Aufgaben

Cowork eignet sich für Aufgaben, die über reines Coding hinausgehen:
- **Dokumentenerstellung:** Word, PDF, Excel, PowerPoint
- **Recherche:** Websuche, API-Dokumentation lesen
- **Computer-Use:** Screenshots, App-Steuerung, visuelle Inspektion
- **MCP-Integrationen:** Google Drive, Slack, etc.

**⚠️ Cowork-Einschränkungen:**
- **Schreiben:** Read/Edit-Tools arbeiten auf einem Overlay-Dateisystem. Änderungen sind in der Sandbox sichtbar, aber **nicht persistent auf dem Mac**.
- **Lesen:** Das Overlay ist ein Snapshot vom Mount-Zeitpunkt. Jede Änderung via Claude Code macht das Overlay veraltet. **Vor Prompts immer die Live-Version prüfen:**
  ```bash
  curl -s "https://enchanting-stardust-f713da.netlify.app/skycheck.html" | grep -o "APP_VER = '0\.[0-9]*'"
  ```
- Für Code-Patches und aktuelle Code-Analyse immer Claude Code oder curl verwenden.

### Fallback: Antigravity-Console

Nur noch nötig, wenn weder Claude Code noch Cowork-Bash funktionieren
(z. B. spezielle Mac-GUI-Interaktionen). Terminal-Fokus: `cmd+shift+p` → "Terminal: Focus Terminal".

---

## ⚠️ PFLICHT-REGEL: Versionsnummer erhöhen

**Jede Änderung an skycheck.html MUSS die Versionsnummer erhöhen.**
`const APP_VER` (Zeile ~2488) wird um 0.01 hochgezählt (z. B. 0.76 → 0.77).
Dies gilt auch für kleine Fixes. Keine Ausnahme. Commit-Message: `SkyCheck vX.XX`.

---

## Patch-Checkliste

1. `const APP_VER = 'X.XX';` aktualisieren (Zeile ~2488)
2. Anker-Eindeutigkeit vorab mit `grep` prüfen (genau 1 Treffer)
3. Änderungen vornehmen (Claude Code: direkte Edits / Cowork: nur Analyse)
4. **JS-Syntaxcheck:** `node --check` auf extrahiertem Script-Block
5. `git add skycheck.html && git commit -m 'SkyCheck vX.XX' && git push`
6. `curl | grep APP_VER` → Netlify-Verifikation
7. Wiki-Updates: Changelog, Log, ggf. Architektur + Index

---

## Code-Struktur & Anker-Map

| Anker-String | Position (ca.) | Bedeutung |
|---|---|---|
| `const APP_VER = '0.88';` | ~2488 | **Versionsvariable** – hier ändern für neue Version |
| `const COUNTRY_NAMES = {` | nach `_t()` | Lookup-Tabelle pro UI-Sprache × Country (nominativ); neuen Country: neue Zeile, neue UI-Sprache: neue Spalte |
| `function _country()` | nach `COUNTRY_NAMES` | Liefert lokalisierten Country-Namen für aktuellen `COUNTRY`/`LANG` |
| `function drawZoneOverlay(zones, layerGroup)` | nach `renderZones` | Zeichnet FR-Geozonen (Polygon/Circle) auf Leaflet-Map; DE-Zonen ohne `geometry`-Feld werden übersprungen |
| `const COUNTRY = (() => {` | ~2490 | **Country-Detection** (URL-Param `?country=fr` oder Hostname `skycheck-fr.*`); Default `'de'` |
| `async function fetchZones(` | `[J-API-ZONES]` | **Dispatcher** — leitet an `fetchZonesDE` (DiPUL-WMS) oder `fetchZonesFR` (Netlify-Function) |
| `async function fetchZonesFR(` | `[J-API-ZONES]` | Ruft `/.netlify/functions/zones-fr?lat=…&lon=…&radius=…` auf |
| `async function fetchZonesDE(` | `[J-API-DIPUL]` | Bisheriges DiPUL-WMS-GetFeatureInfo (umbenannt aus `fetchZones`) |
| `document.querySelectorAll('.l-ver, .f-ver')` | ~2500 | DOM-Updater für h1-sup (`.l-ver`) und Footer-span (`.f-ver`) |
| `<div id="info-modal"` | ~2361 | Landing-Page Info-Modal (deutscher Text, kein i18n im Body) |
| `const cfg = {` | nach `<script>` | Go/Warn/NoGo-Konfigurationsobjekt |
| `const DIPUL_ALL_LAYERS` | js_start+256 | Erster const im Script |
| `const NOAA_AWC = '/.netlify/functions/awc'` | `[J-FETCH-METAR]` | CORS-Proxy-Endpoint (seit v0.64) |
| `fetchKpGfz` | Mitte Script | KP-Datenabruf |
| `fetchMetar` | vor `[J-API-DIPUL]` | METAR-Datenabruf über AWC-Proxy |
| `fetchZones` | `[J-API-DIPUL]` | Geozonen-Abruf; δ-Formel `radiusM * 101 / (4 * 111320)` |
| `renderMetarCard` | vor `renderFreezingRain` | METAR-Card Renderer |
| `renderMetarMarkers` | vor `renderAircraftMarkers` | Flugplatz-Marker auf Karte |
| `card('Kp-Index'` | Render-Bereich | KP-Index Render-Block |
| `.pwa-banner` (CSS) | ~667 | PWA-Install-Banner (seit v0.57) |
| `<div id="metar-section"` | ~2314 | METAR/TAF-Render-Container |
| `<span class="f-ver"></span>` | HTML-Footer | Footer-Versionsspan |
| `<sup class="l-ver"></sup>` | HTML-Header | h1-sup Versionsanzeige |

---

## Wichtige Objekte

**`kpGfz`:** `.val` (Hp30-Wert), `.dt` (Timestamp), `.bars` [{v,label,ref,forecast}], `.stat`

**Bar-Flags:** `ref:true` → Deckkraft 1.0 + weißer Stroke | `forecast:true` → 0.75 + gestrichelt | default → 0.55

**`card(label, val, sub, url)`:** `sub` = innerHTML (HTML-Tags erlaubt)

---

## WMS GetFeatureInfo — δ-Formel (empirisch, 2026-04-17)

**Server:** `https://uas-betrieb.de/geoservices/dipul/wms` (GeoServer, WMS 1.3.0)

**Mechanismus:** GetFeatureInfo rendert intern ein virtuelles Pixelraster (WIDTH×HEIGHT) über die BBOX. Der Parameter `I,J` wählt das Zentrumspixel. Features werden erkannt, wenn sie dieses Pixel geometrisch schneiden. Die Erkennungsreichweite hängt daher von der **Pixelgröße** ab — nicht vom BBOX-Radius.

**Formeln:**
```
pixel_size  = 2 × δ × 111320 / WIDTH          (in Metern, Breitengrad-Richtung)
detection   ≈ 2–2.5 × pixel_size               (empirisch bestätigt)
```

**Korrekte δ-Berechnung für `fetchZones`:**
```javascript
// radiusM = gewünschter Suchradius in Metern (5 oder 100)
// WIDTH = 101 (Pixelraster, wie in der URL)
// 111320 = Meter pro Grad Breite
const δ = Math.max(0.001134, radiusM * 101 / (4 * 111320));
```

**Empirische Verifikation (CTR München, Grenze bei lat ≈ 48.43553):**

| δ-Formel | δ | BBOX | Pixel | Erkennt bis | Verfehlt ab |
|---|---|---|---|---|---|
| Alt: fest 0.01 | 0.010000 | 2226 m | 22 m | ~50 m | 100 m |
| Neu: radius=5 m | 0.001134 | 252 m | 2.5 m | ~5 m | 10 m |
| Neu: radius=100 m | 0.022682 | 5050 m | 50 m | ~120 m | 150 m |

**Wichtig:** Das alte feste δ=0.01 entsprach einem effektiven Suchradius von ~50 m. Die Formel `radiusM * 101 / (4 * 111320)` skaliert korrekt für beliebige Radien. Der `Math.max(0.001134, ...)` stellt sicher, dass die BBOX nie kleiner als ~252 m wird (Minimum für stabile Serverergebnisse).

---

## Bekannte Fallstricke

| Problem | Ursache | Fix |
|---|---|---|
| `const CFG` nicht gefunden | Config heißt `cfg` (lowercase) | `const cfg = {` |
| Netlify-URL falsch | Kein skycheck.netlify.app | `enchanting-stardust-f713da.netlify.app/skycheck.html` |
| `.git/index.lock` blockiert | Abgebrochener Git-Prozess | `rm -f .git/index.lock` (in Claude Code direkt möglich) |
| Cowork-Edits nicht persistent | Overlay-Dateisystem | Code-Änderungen immer über Claude Code |
| Gemountete Version veraltet | Lokales Repo nicht gefetcht | `git fetch origin && git reset --hard origin/master` |
| Cowork-Overlay veraltet | Snapshot vom Mount-Zeitpunkt, danach entkoppelt vom Mac | Vor jedem Prompt: `curl -s "https://enchanting-stardust-f713da.netlify.app/skycheck.html" \| grep ...` statt lokales Grep |

---

## Versions-Historie (Auszug)

| Version | Änderungen |
|---|---|
| v0.88 | **Adressvorschläge länderabhängig:** `geocode()` war fest auf Deutschland verdrahtet (`&lang=de&bbox=5.5,47.2,15.5,55.1`) → auf allen Länder-Sites nur deutsche Treffer. Fix: `COUNTRY_BBOX` pro Land (DE/FR/AT/CH/ES, ES großzügig inkl. Balearen+Kanaren) + Photon-Sprache aus UI-`LANG` (`_photonLang`, Photon kann de/en/fr/it → sonst en). Betrifft `geocode` + `reverseGeocode` |
| v0.87 | **Länder-Defaults für Suchfeld & Sprache:** pro Land ein Hauptstadt-Wahrzeichen als Suchfeld-Platzhalter (DE Brandenburger Tor/Berlin, FR Tour Eiffel/Paris, AT Stephansdom/Wien, CH Bundeshaus/Bern, ES Puerta del Sol/Madrid) via `COUNTRY_LANDMARK` + sprachliches `SEARCH_PREFIX` (`searchPlaceholder()` in `applyLang`). UI-Sprache wird beim Erstbesuch länderabhängig vorgewählt (`COUNTRY_DEFAULT_LANG`: fr→fr, es→es, sonst de) — eine gespeicherte `skycheck-lang`-Wahl hat weiterhin Vorrang |
| v0.86 | **Spanien-Erweiterung (`skycheck-es`) nach CH/DE-Muster (WMS + Identify):** neuer Country-Adapter `es`. Karten-Overlay = ENAIRE-servAIS-**WMS**-Layer (`.../SRV_UAS_ZG_V0/MapServer/WMSServer`, LAYERS `0,1,2` = Infra/Urbano/Aero). Detailliste/Status = ENAIRE-**ArcGIS-Identify** (`.../MapServer/identify`, Envelope-Abfrage). **Beide CORS-offen (reflektiert) → keine Netlify-Function/Datei/Workflow** (ENAIRE hostet die AIP-Produktivdaten, AIRAC-Update alle 28 Tage). `fetchZonesES` mappt ED-318-Felder: `name`/`identifier`, `type`→Ampel (`REQ_AUTHORIZATION`/`PROHIBITED`→rot, `CONDITIONAL`→orange, `NO_RESTRICTION`→grün; deckt `AUTHORISATION`+`AUTHORIZATION`), **strukturierte Höhen** (`lower`/`upper`+`Reference`+`uom`), `siteURL`→Rechtslink, `message`→`desc` (HTML-Freitext wird per `_stripHtml` bereinigt, `'Nulo'`→leer). Konstanten `ENAIRE_WMS_URL`/`ENAIRE_IDENTIFY_URL`/`ES_WMS_LAYERS`; `COUNTRY='es'` via Hostname/`?country=es`. CSP um `servais.enaire.es` (img+connect) erweitert |
| v0.85 | **Schweiz-Erweiterung (`skycheck-ch`) nach DE-Muster (WMS + Identify):** neuer Country-Adapter `ch`. Karten-Overlay = geo.admin.ch-**WMS**-Layer `ch.bazl.einschraenkungen-drohnen` (flächig, wie DiPUL für DE). Detailliste/Status = geo.admin.ch-**Identify-REST-API** (`api3.geo.admin.ch/.../identify`, Envelope-Abfrage um den Standort). **Beide CORS-offen → keine Netlify-Function, keine gehostete Datei, kein Update-Workflow** (BAZL/geo.admin.ch hosten die Produktivdaten, tägliche Aktualisierung). `fetchZonesCH` mappt die viersprachigen Felder (de/fr/it/en): `zone_name`, `zone_restriction_id`→Ampel/Typ (`.CTR` etc. greifen in `evalZoneStatus`), Höhengrenzen (`air_vol_*`), `auth_url`→Rechtslink, `zone_restriction_<lang>`→`desc`. Konstanten `GEOADMIN_WMS_URL`/`GEOADMIN_IDENTIFY_URL`/`CH_ZONE_LAYER`; `COUNTRY='ch'` via Hostname/`?country=ch`; DiPUL-Layer-Mode-`setParams` auf DE beschränkt (sonst würde es die CH-WMS überschreiben). CSP um `wms.geo.admin.ch` (img) + `api3.geo.admin.ch` (connect) erweitert |
| v0.84 | **AT-Karten-Overlay flächig (alle Zonen):** Im AT-Modus zeigte die Karte nur die punktgefilterten Zonen des Standorts (wie die Detailliste) — beim Herauszoomen fehlten die übrigen. Jetzt lädt `zones-at.js` per `?all=1` alle 286 Zonen schlank (nur Geometrie/Label, ~469 KB, 1 h gecacht) und der Client zeichnet sie einmalig flächig (`ensureAllZonesAT`/`drawAllZonesAT`, Promise-gecacht) — analog zum DE-WMS. Die punktbasierten Zonen (`fetchZonesAT`) speisen weiterhin nur Detailliste + Flugstatus. Neuer Dispatcher `updateZoneOverlay`: DE→WMS, AT→alle Zonen (einmal, bleibt), FR/übrige→punktbasiert (3642 FR-Zonen wären für „alles zeichnen" zu groß) |
| v0.83 | **Österreich-Erweiterung (`skycheck-at`):** neuer Country-Adapter `at`. `netlify/functions/zones-at.js` parst Austro-Control-ED-269 (`data/uas-zones-at.json`, 286 Zonen, reine Polygone) direkt, Bbox-Filter, `restriction`→Ampel (`PROHIBITED`/`REQ_AUTHORISATION`→rot, `CONDITIONAL`→orange, `NO_RESTRICTION`→grün), Höhengrenzen, `legalBasis`/`legalBasisURL` (RIS), lokalisierte Detailtexte (`localizedMessages` de-AT/en, `?lang=`). Frontend: `COUNTRY='at'` (Hostname `skycheck-at`/`?country=at`), Dispatcher-Zweig `fetchZonesAT`, `renderZones` nutzt `z.legalUrl` + optionale `z.desc`-Zeile, `COUNTRY_NAMES.at`. `drawZoneOverlay` (Nicht-DE-Pfad) rendert die Polygone. **Auto-Update:** `.github/workflows/update-at-zones.yml` (monatlich, `workflow_dispatch`, idempotent via `data/uas-zones-at.version`) holt den neuesten `*-full-production`-Release von austrocontrol.at, entpackt, committet → Netlify-Deploy. Kostenlos (öffentliches Repo, `GITHUB_TOKEN`-Push) |
| v0.82 | **Eis/Nebel/Sichtweite im Live-View:** `renderMapStatus` zeigt zusätzlich zur Zonen-/Wind-Anzeige eine kompakte Vereisungs- (50 m AGL, Magnus-Taupunkt + Lapse-Rate, Band −20…0 °C), Nebel- und Sichtweiten-Angabe aus dem BrightSky-`now`-Record — analog SkyAlarm. Nutzt vorhandene 5-sprachige Keys (`dpCrit`/`dpFog`/`dpClear`/`metarVis`/`fogWarn`), keine neuen i18n-Strings |
| v0.81 | **Alarm-Defekte:** (a) Doppel-Audio verhindert — `avOpen` pausiert den Hauptansicht-Glockenalarm (`S.alarm.intervalId`), solange die Live-Alarm-View mit eigenem Beep offen ist. (b) Bodenverkehr-Fehlalarm behoben — `alt_baro==='ground'`/fehlend ergibt jetzt `null` statt `0` (AV-View `altFt` + `fetchAircraft`-Normalisierung), sodass parkende/rollende Maschinen und höhenlose Targets nicht mehr als Tiefflieger alarmieren |
| v0.80 | **Mehrsprachigkeit (Review I1/I3):** hartkodierter deutscher Alarm-Banner-/Live-View-Text und binäre `LANG==='de' ? DE : EN`-Zonen-/METAR-Sicherheitstexte auf volle 5-Sprachigkeit umgestellt; 18 neue i18n-Keys (`alarmMsg`/`alarmCraftCount`/`avWatch`/`avLowAltHdr`, 13× `zone…`, `metarCeilingMsg`) in DE/EN/FR/ES/PL. Kein German-/English-Fallback mehr für FR/ES/PL-Nutzer bei sicherheitsrelevanten Texten |
| v0.79 | **Fix METAR/TAF-Sichtweite-Einheit:** Das AWC-JSON-Feld `visib` liefert statute miles (`'6+'`/`'P6SM'` sind sm-Idiome), wurde in `metarVisKm`/TAF-Kompaktanzeige aber direkt als km angezeigt und gegen km-Schwellen (1,5/3) geprüft → Faktor-1,61-Fehler (z. B. 4 sm = 6,4 km als „4 km"). Fix: `× 1,60934`, Meter-Fallback für durchgereichte Rohwerte (`> 15`). Verifiziert an EDDM/EDDF/KJFK |
| v0.78 | **Sicherheit (Review X1–X3):** zentraler `escapeHtml`-Helfer auf alle Fremddaten-HTML-Sinks — ADS-B/OGN-Callsigns (Popup/permanenter Tooltip/Liste), **Photon/OSM-Ortsnamen** in Autocomplete + `data-name` + Pin-Popup + localStorage-Verlauf (öffentlich editierbar → persistentes Stored-XSS), METAR/TAF-Rohtext, DiPUL-Zonennamen/-felder + FR-Zonen-Tooltip; Legal-Link `encodeURI`+`rel=noopener`. CSP-Header in `netlify.toml` (restriktives `connect-src`/`img-src` gegen Exfiltration) + `X-Content-Type-Options`/`Referrer-Policy`. Zusätzlich Geocode-Stale-Response-Guard (`acSeq`) |
| v0.77 | DiPUL-WMS-Härtung gegen defekten-Layer-ServiceException (Per-Layer-Recovery + Session-Blockliste) |
| v0.76 | **Fix Race Condition FR-Overlay:** Im FR-Modus erschienen die Geozonen-Polygone/Kreise beim ersten Aufruf nicht — `drawZoneOverlay` lief schon, bevor die Karte und damit `S.layers.dipul` existierte. Fix: nach Map-Erstellung einmaliger Nachzeichen-Aufruf mit dem bereits gefüllten `lastZones`-Cache |
| v0.75 | **Country-Name-i18n:** Badge (Landing-Page-Titel) und Footer zeigen den aktiven Country-Namen in der jeweiligen UI-Sprache. `COUNTRY_NAMES`-Tabelle (DE/EN/FR/ES/PL × DE/FR), `_country()`-Helper, `{country}`-Placeholder wird von `_t()` interpoliert. 10 i18n-Strings angepasst (5×badge + 5×footerText); `fltcatDisclaimer` entcountrifiziert (EU-weite Regelung). Hostname-Wechsel zu `skycheck-fr.netlify.app` reicht für komplettes FR-Branding |
| v0.74 | **FR-Map-Overlay:** Geozonen werden im FR-Modus jetzt direkt auf der Karte gezeichnet (Polygone und Kreise via `L.polygon` / `L.circle`). `zones-fr.js` liefert Geometrie mit, `drawZoneOverlay(zones, layerGroup)` rendert. `S.layers.dipul` + `AV.dipulL` sind im FR-Modus `L.layerGroup()` (Zone-Toggle bleibt kompatibel). `setParams`-Aufruf null-safe via typeof-Check |
| v0.73 | **Country-Adapter-Architektur (Stufe 1):** Multi-Country-Support für Geozonen. `COUNTRY`-Detection via URL-Param oder Hostname; Dispatcher `fetchZones` → DE: DiPUL-WMS, FR: neue Netlify-Function `zones-fr.js` mit ED-269-JSON (`data/uas-zones-fr.json`, 8,4 MB, 3642 Zonen, bbox-Filter, monatlich austauschbar). DiPUL-WMS-Karten-Layer nur noch für DE aktiv. `netlify.toml` mit `included_files` für FR-Daten |
| v0.72 | Info-Modal-Text korrigiert (Zielgruppe Hobby/kommerziell/FPV, Spezifik-Kategorie, neuer Datenschutz-Abschnitt); README inhaltlich auf v0.72 gebracht und in 5 Sprachen aufgesetzt (EN default + DE/FR/ES/PL mit Sprach-Switcher) |
| v0.71 | 5 Sprachen (DE/EN/FR/ES/PL), Sprachbutton auf Landing-Page |
| v0.70 | Flugkategorien-Info-Modal (VFR/MVFR/IFR/LIFR), zweisprachig DE/EN |
| v0.69 | Bewölkung-Link auf Windy, METAR-Wind °-Zeichen + Farbcodes |
| v0.68 | SkyAlarm-Link auf Landing-Page (Sky in --accent, Alarm in #ef4444) |
| v0.67 | Kartenstil-Button über Leaflet-Attribution anheben |
| v0.66 | Tiefflieger-Overlay verschmälert, Kartenstil-Cycler in Hauptkarte |
| v0.65 | Fix: literale `\n` im HTML-Markup der METAR-Sektion durch reale Zeilenumbrüche ersetzt |
| v0.64 | CORS-Fix für NOAA AWC: neue Netlify-Function `awc.js` als Proxy; `NOAA_AWC` auf `/.netlify/functions/awc` umgestellt |
| v0.63 | `fetchZones`-δ-Formel mit Default-Radius 100 m; empirisch kalibrierte Detektionsreichweite |
| v0.62 | `fetchZones` BBOX = exakt Suchradius (festes 101×101-Raster bei `WIDTH/HEIGHT`, Zentrum `I=J=50`) |
| v0.61 | `fetchZones`: dynamisches 3×3-Pixel-Raster exakt am Suchradius (später durch v0.62 verworfen) |
| v0.60 | δ-Formel korrigiert: proportional `radiusM * 0.0001` (Zwischenschritt auf Weg zu v0.63) |
| v0.59 | Geozonen-δ-Fix + Suchradius-Kreis im Aircraft-Alarm-View (`AV.scanCirc`) |
| v0.58 | Geozonen-Radius-Kopplung: `fetchZones` nutzt `S.searchRadius` aus AV-Kontext und GPS-Callback |
| v0.57 | PWA-Install-Banner (CSS `.pwa-banner`, `beforeinstallprompt`-Handler) |
| v0.56 | I18N-Schlüssel `weatherOk/Warn/Nogo`; Status-Banner differenziert nach Wetter- und Zonenstatus |
| v0.55 | I18N-Schlüssel `zoneNogo`; Status-Banner berücksichtigt Zonenstatus auch bei wetter-seitig grünem Ergebnis |
| v0.54 | METAR/TAF-Integration: NOAA AWC API, Flugplatz-Marker auf Karte, METAR-Card, Ceiling-Cross-Check |
| v0.35 | Flugzeug-Alarm-View: Fullscreen-Overlay, ADS-B, Haversine, Web Audio, Leaflet-Map |
| v0.34 | Karten-Fullscreen-Toggle |
| v0.27 | Sprachumschalter DE/EN, vollständige I18N |
| v0.21 | Footer-Versionsanzeige via DOM-Updater |
| v0.20 | APP_VER-Variable, KP-Messung Zeitstempel |

Vollständige Historie: siehe Wiki (`skycheck-changelog.md`)
