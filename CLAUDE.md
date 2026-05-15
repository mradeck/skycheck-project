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
5. **Antwort-Titel:** Jede Antwort beginnt mit Datum, Uhrzeit und aktueller Versionsnummer (z. B. `## 2026-05-15 10:00 — SkyCheck v0.74`).

---

**Datei:** `skycheck.html` (Single-File HTML/JS/CSS, ~5272 Zeilen)
**Live:** https://enchanting-stardust-f713da.netlify.app/skycheck.html
**Repo:** https://github.com/mradeck/skycheck-project.git
**Aktuell:** v0.74 — **Country-Adapter (Stufe 1, FR-Map-Overlay):** Polygone/Kreise für FR-Zonen werden jetzt direkt auf der Leaflet-Karte gezeichnet (Haupt + Aircraft-Alarm-View). `zones-fr.js` liefert Geometrie mit; `drawZoneOverlay()` rendert per `L.polygon` / `L.circle`. `S.layers.dipul` und `AV.dipulL` sind im FR-Modus `L.layerGroup()` (Zone-Toggle bleibt kompatibel)
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
`const APP_VER` (Zeile ~2488) wird um 0.01 hochgezählt (z. B. 0.74 → 0.75).
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
| `const APP_VER = '0.74';` | ~2488 | **Versionsvariable** – hier ändern für neue Version |
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
