# SkyCheck – Projekt-Kontextdatei für Claude-Sessions

---
## ⚠️ SESSION-START-PROTOKOLL — vor dem ersten Werkzeugaufruf bestätigen

1. **LLM-Wiki mounten:** Ordner `obsidian-claude-llm-wiki` als zusätzlichen Workspace einbinden.
   - **Mac-Pfad:** `~/Library/Mobile Documents/com~apple~CloudDocs/code/obsidian-claude-llm-wiki`
   - Falls noch nicht gemountet → `request_cowork_directory` mit obigem Pfad aufrufen.
   - Wiki-Dateien lesen (in dieser Reihenfolge):
     1. `claude-llm-wiki/CLAUDE.md` — Schema & Konventionen
     2. `claude-llm-wiki/wiki/index.md` — Inhaltsverzeichnis
     3. `claude-llm-wiki/wiki/projects/SkyCheck.md` — Projektübersicht
     4. `claude-llm-wiki/wiki/projects/skycheck-architektur.md` — Technische Architektur
     5. `claude-llm-wiki/wiki/projects/skycheck-arbeitsregeln.md` — Verbindliche Arbeitsregeln
     6. `claude-llm-wiki/wiki/projects/skycheck-changelog.md` — Versionshistorie
     7. `claude-llm-wiki/wiki/log.md` — Letzter Log-Eintrag (nächste Schritte)
2. **Projektpfad auf dem Mac:** `/Users/michaelradeck/Documents/skycheck_project` — kein anderer Pfad ist korrekt.
3. **Version prüfen & synchronisieren:** `grep APP_VER skycheck.html` — bei Abweichung zum Wiki:
   ```bash
   git fetch origin
   git show origin/master:skycheck.html > skycheck.html
   ```
   Falls `git reset --hard` durch `.git/index.lock` blockiert: Lockfile manuell auf dem Mac entfernen.
4. **Antwort-Titel:** Jede Antwort beginnt mit Datum, Uhrzeit und aktueller Versionsnummer (z. B. `## 2026-04-06 04:05 — SkyCheck v0.27`).

---

**Datei:** `skycheck.html` (Single-File HTML/JS/CSS, ~4000 Zeilen, ~126 kB)
**Live:** https://enchanting-stardust-f713da.netlify.app/skycheck.html
**Repo:** https://github.com/mradeck/skycheck-project.git
**Aktuell:** v0.37 — Sektions-Index mit 38 eindeutigen Tags
**Projektpfad (Mac):** `/Users/michaelradeck/Documents/skycheck_project`
**LLM-Wiki (Mac):** `~/Library/Mobile Documents/com~apple~CloudDocs/code/obsidian-claude-llm-wiki`

---

## Workflow

### Primär: Direkte Bearbeitung über Cowork Read/Edit-Tools

Seit dem Umzug nach `~/Documents/` ist der gemountete Ordner direkt beschreibbar.
Code-Änderungen erfolgen über Grep → Read → Edit auf `skycheck.html`.

```bash
# 1. Sektion finden (per Tag):
grep -n '\[J-RENDER-GRID\]' skycheck.html

# 2. Kontext lesen (Read-Tool, ca. 40 Zeilen um die Fundstelle)

# 3. Änderung vornehmen (Edit-Tool, ein Edit pro Änderung)

# 4. Verifizieren (Read-Tool, betroffene Stelle nochmals lesen)
```

### Git-Operationen (Commit & Push)

```bash
# Commit & Push (Sandbox-Bash):
git add skycheck.html && git commit -m 'SkyCheck vX.XX' && git push

# Netlify-Verifikation (~20s warten):
curl -s "https://enchanting-stardust-f713da.netlify.app/skycheck.html" | grep -o "APP_VER = '0\.[0-9]*'"
```

### Fallback: Antigravity-Console

Falls die Sandbox keine Schreibrechte auf `.git/` hat (z. B. `index.lock`-Problem), können
Git-Operationen über die Antigravity-Console ausgeführt werden (Full-Tier Terminal).
**Nie macOS Terminal.app verwenden** (nur Click-Tier, kein Tippen möglich).

### Git-Sync bei Versionsabweichung

Falls der gemountete Ordner eine ältere Version zeigt als das Remote-Repo:
```bash
git fetch origin
git show origin/master:skycheck.html > skycheck.html
# Optional, falls index.lock existiert: rm .git/index.lock && git reset --hard origin/master
```

---

## Code-Struktur & Anker-Map

| Anker-String | Position (ca.) | Bedeutung |
|---|---|---|
| `const APP_VER = '0.21';` | ~1667 | **Versionsvariable** – hier ändern für neue Version |
| `document.querySelectorAll('.l-ver, .f-ver')` | ~1668 | DOM-Updater für h1-sup (`.l-ver`) und Footer-span (`.f-ver`) |
| `const cfg = {` | ~70254 | Go/Warn/NoGo-Konfigurationsobjekt |
| `const DIPUL_ALL_LAYERS` | js_start+256 | Erster const im Script |
| `fetchKpGfz` | ~60000 | KP-Datenabruf |
| `bars.push({ v: kpV, label: t, ref:` | ~60085 | Historische Bar-Schleife |
| `.push({ v: val, label: tsNow, ref: false, forecast: true })` | ~60663 | Nowcast-Bar |
| `if (!kpGfz) return '';` | ~74039 | KP-Messung Render-Block |
| `const ts = kpGfz.dt ?` | ~74100 | Zeitstempel KP-Messung (ohne UTC) |
| `${kpGfz.val.toFixed(1)}</span>` | ~75455 | KP-Messung val (Backtick-Template) |
| `card('Kp-Index'` | ~72700 | KP-Index Render-Block |
| `const kpTs =` | ~72710 | Zeitstempel KP-Index (mit UTC) |
| `<span class="f-ver"></span>` | ~886 | Footer-Versionsspan (via DOM-Updater gefüllt) |
| `<sup class="l-ver"></sup>` | ~715 | h1-sup (via DOM-Updater gefüllt) |

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
| Anker `'-'` nicht gefunden | Non-ASCII-Quotes | Backtick-positionaler Ansatz |
| `request_access` Timeout | Bildschirmsperre | Lock Screen → "Require password" → Never |
| Netlify-URL | Kein skycheck.netlify.app | enchanting-stardust-f713da.netlify.app/skycheck.html |
| Sandbox-Edits nicht in git sichtbar | Cowork-Mount hatte keine Schreibrechte (alter Pfad) | Seit Umzug nach ~/Documents/ gelöst — Read/Edit direkt verwenden |
| git-Pfad veraltet | Projekt umgezogen | Nur `/Users/michaelradeck/Documents/skycheck_project` verwenden (nicht `.gemini/antigravity/scratch/`) |
| Gemountete Version veraltet | Lokales Repo nicht gefetcht | `git fetch origin && git show origin/master:skycheck.html > skycheck.html` |
| `.git/index.lock` blockiert | Abgebrochener Git-Prozess | Lockfile manuell entfernen, ggf. via Antigravity-Console |
| `type()` überschreibt Clipboard | macOS-Verhalten | Reihenfolge: `type(cmd)` → `write_clipboard(b64)` → `key(Return)` |
| Terminal.app nicht nutzbar | Nur Click-Tier (kein Tippen) | Immer Antigravity-Console verwenden |

---

## Versions-Historie

| Version | Änderungen |
|---|---|
| v0.35 | Flugzeug-Alarm-View: Fullscreen-Overlay (`#alarm-view`), Live ADS-B (2s Poll, 10nm Radius), 2km Alarm-Radius (Haversine), Web Audio Beep + Vibration, Banner + Blink-Badge, Leaflet-Map mit 4 Tile-Styles, GPS-Button, Geozone-Toggle, Hell/Dunkel-Theme, Doppelklick-Relokation |
| v0.34 | Karten-Fullscreen-Toggle: ⛶/✕-Button unten links, `.map-wrap.map-fs` (position:fixed, 100dvh), body-overflow-Lock, `invalidateSize()` |
| v0.33 | Geozone-Namens-Fallback: `rawName\|\|type` statt `'Unbenannt'`; extRef nur bei echtem Namen angehängt |
| v0.32 | Windböen-Card URL: koordinatenbasiertes Template-Literal `windy.com/de/-Windböen-gust?gust,${S.lat},${S.lon},8` |
| v0.31 | Windböen-Card URL-Fix: `kachelmannwetter.com/…/boeen-ms.html` → `windy.com/de/?gust` (DE Böen-Layer) |
| v0.30 | Bugfix v0.29: JS-Syntaxfehler durch korrumpierten `$input`-String im Focus-Handler behoben (`node --check` als Verifikationsschritt) |
| v0.29 | Adressverlauf-Dropdown: `localStorage`-basierte History (max. 5), Anzeige bei Focus/< 3 Zeichen, `×`-Löschbutton pro Eintrag, DE/EN-Label |
| v0.28 | Kp-Messung-Card URL-Fix: `kp.gfz.de/` → `kp.gfz.de/hp30-hp60` (durch patch27.py NEW_KP_MEAS falsch gesetzt) |
| v0.27 | Back-Button: nur SVG-Pfeil (kein „Zurück"-Text); Sprachumschalter 🇩🇪/🇬🇧 in Navbar; vollständige EN-Übersetzung (I18N-Dict, `_t()`, `applyLang()`, DE-Default, localStorage-Persistenz, State-Cache) |
| v0.21 | Footer-Versionsanzeige: `v${APP_VER}`-Literal → `<span class="f-ver">` via DOM-Updater; querySelectorAll auf `.l-ver, .f-ver` erweitert |
| v0.20 | Sichtweite `<br>` vor CTR-D; KP-Messung letzter hist. Bar + Zeitstempel; APP_VER-Variable + DOM-Updater; h1-Version korrigiert |
| v0.19 | KP-Messung Balken (solid+dashed); KP-Index Zeitstempel; Sichtweite min-Subtext |

---

## Patch-Checkliste

1. `const APP_VER = 'X.XX';` aktualisieren
2. Anker-Eindeutigkeit vorab mit `Grep` prüfen (genau 1 Treffer)
3. Änderungen mit Read/Edit-Tools direkt vornehmen
4. **JS-Syntaxcheck:** `node --check` auf extrahiertem Script-Block (verhindert korrumpierte Strings)
5. `git add skycheck.html && git commit -m 'SkyCheck vX.XX' && git push`
6. `curl | grep APP_VER` → Netlify-Verifikation
7. Wiki-Updates: Changelog, Log, ggf. Architektur + Index
