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
3. **Projektpfad auf dem Mac:** `/Users/michaelradeck/Documents/skycheck_project` — kein anderer Pfad ist korrekt.
4. **Version prüfen:** `grep APP_VER skycheck.html` — bei Abweichung zum Wiki:
   ```bash
   git fetch origin && git reset --hard origin/master
   ```
5. **Antwort-Titel:** Jede Antwort beginnt mit Datum, Uhrzeit und aktueller Versionsnummer (z. B. `## 2026-04-17 14:30 — SkyCheck v0.54`).

---

**Datei:** `skycheck.html` (Single-File HTML/JS/CSS, ~4750 Zeilen)
**Live:** https://enchanting-stardust-f713da.netlify.app/skycheck.html
**Repo:** https://github.com/mradeck/skycheck-project.git
**Aktuell:** v0.54 — METAR/TAF-Integration (NOAA AWC API)
**Projektpfad (Mac):** `/Users/michaelradeck/Documents/skycheck_project`
**LLM-Wiki (Mac):** `~/Library/Mobile Documents/com~apple~CloudDocs/code/obsidian-claude-llm-wiki`

---

## Hybrid-Workflow (seit v0.54)

### Primär: Claude Code (CLI) — für alle Code-Aufgaben

Claude Code läuft direkt im Mac-Terminal mit vollem Dateisystem- und Git-Zugriff.
Kein Overlay, kein Clipboard-Transfer, kein index.lock-Problem.

```bash
# Start:
cd ~/Documents/skycheck_project && claude

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

**⚠️ Cowork-Einschränkung bei Code-Änderungen:**
Cowork Read/Edit-Tools arbeiten auf einem Overlay-Dateisystem. Änderungen über Edit/Write
sind in der Sandbox sichtbar, aber **nicht persistent auf dem Mac-Dateisystem**.
Für Code-Patches daher immer Claude Code verwenden.

### Fallback: Antigravity-Console

Nur noch nötig, wenn weder Claude Code noch Cowork-Bash funktionieren
(z. B. spezielle Mac-GUI-Interaktionen). Terminal-Fokus: `cmd+shift+p` → "Terminal: Focus Terminal".

---

## ⚠️ PFLICHT-REGEL: Versionsnummer erhöhen

**Jede Änderung an skycheck.html MUSS die Versionsnummer erhöhen.**
`const APP_VER` (Zeile ~2377) wird um 0.01 hochgezählt (z. B. 0.54 → 0.55).
Dies gilt auch für kleine Fixes. Keine Ausnahme. Commit-Message: `SkyCheck vX.XX`.

---

## Patch-Checkliste

1. `const APP_VER = 'X.XX';` aktualisieren (Zeile ~2377)
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
| `const APP_VER = '0.54';` | ~2377 | **Versionsvariable** – hier ändern für neue Version |
| `document.querySelectorAll('.l-ver, .f-ver')` | ~2378 | DOM-Updater für h1-sup (`.l-ver`) und Footer-span (`.f-ver`) |
| `const cfg = {` | nach `<script>` | Go/Warn/NoGo-Konfigurationsobjekt |
| `const DIPUL_ALL_LAYERS` | js_start+256 | Erster const im Script |
| `fetchKpGfz` | Mitte Script | KP-Datenabruf |
| `fetchMetar` | vor `[J-API-DIPUL]` | METAR-Datenabruf (NOAA AWC) |
| `renderMetarCard` | vor `renderFreezingRain` | METAR-Card Renderer |
| `renderMetarMarkers` | vor `renderAircraftMarkers` | Flugplatz-Marker auf Karte |
| `card('Kp-Index'` | Render-Bereich | KP-Index Render-Block |
| `<span class="f-ver"></span>` | HTML-Footer | Footer-Versionsspan |
| `<sup class="l-ver"></sup>` | HTML-Header | h1-sup Versionsanzeige |

---

## Wichtige Objekte

**`kpGfz`:** `.val` (Hp30-Wert), `.dt` (Timestamp), `.bars` [{v,label,ref,forecast}], `.stat`

**Bar-Flags:** `ref:true` → Deckkraft 1.0 + weißer Stroke | `forecast:true` → 0.75 + gestrichelt | default → 0.55

**`card(label, val, sub, url)`:** `sub` = innerHTML (HTML-Tags erlaubt)

---

## Bekannte Fallstricke

| Problem | Ursache | Fix |
|---|---|---|
| `const CFG` nicht gefunden | Config heißt `cfg` (lowercase) | `const cfg = {` |
| Netlify-URL falsch | Kein skycheck.netlify.app | `enchanting-stardust-f713da.netlify.app/skycheck.html` |
| `.git/index.lock` blockiert | Abgebrochener Git-Prozess | `rm -f .git/index.lock` (in Claude Code direkt möglich) |
| Cowork-Edits nicht persistent | Overlay-Dateisystem | Code-Änderungen immer über Claude Code |
| Gemountete Version veraltet | Lokales Repo nicht gefetcht | `git fetch origin && git reset --hard origin/master` |

---

## Versions-Historie (Auszug)

| Version | Änderungen |
|---|---|
| v0.54 | METAR/TAF-Integration: NOAA AWC API, Flugplatz-Marker auf Karte, METAR-Card, Ceiling-Cross-Check |
| v0.35 | Flugzeug-Alarm-View: Fullscreen-Overlay, ADS-B, Haversine, Web Audio, Leaflet-Map |
| v0.34 | Karten-Fullscreen-Toggle |
| v0.27 | Sprachumschalter DE/EN, vollständige I18N |
| v0.21 | Footer-Versionsanzeige via DOM-Updater |
| v0.20 | APP_VER-Variable, KP-Messung Zeitstempel |

Vollständige Historie: siehe Wiki (`skycheck-changelog.md`)
