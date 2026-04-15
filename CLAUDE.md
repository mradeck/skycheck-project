# SkyCheck – Projekt-Kontextdatei für Claude-Sessions

**Datei:** `skycheck.html` (Single-File HTML/JS/CSS, ~100 kB)
**Live:** https://enchanting-stardust-f713da.netlify.app/skycheck.html
**Repo:** https://github.com/mradeck/skycheck-project.git
**Aktuell:** v0.35
**Lokaler Pfad:** `~/Documents/skycheck_project/` (Cowork-Ordner, direkt mountbar)

---

## Projektstruktur-Hinweis

Das Projekt lag ursprünglich in einem versteckten Verzeichnis
(`~/.gemini/antigravity/scratch/skycheck_project/`), das Cowork nicht
mounten kann. Deshalb wurden in früheren Sessions Umwege benötigt:
base64-kodierte Python-Patches über das Antigravity-Terminal.

Seit dem Umzug nach `~/Documents/skycheck_project/` (2026-04-05) ist
der Ordner direkt mountbar. Claude kann `skycheck.html` jetzt mit den
`Read`/`Edit`-Tools direkt bearbeiten — kein Antigravity, kein base64
mehr nötig.

---

## Workflow (aktuell, mit gemountetem Ordner)

```bash
# Änderungen direkt via Read/Edit-Tools in skycheck.html vornehmen,
# dann git über das Bash-Tool:
cd ~/Documents/skycheck_project
git add skycheck.html && git commit -m 'SkyCheck vX.XX' && git push

# Netlify-Verifikation:
curl -s "https://enchanting-stardust-f713da.netlify.app/skycheck.html" | grep -o "APP_VER = '0\.[0-9]*'"
```

---

## Code-Struktur & Anker-Map

| Anker-String | Position (ca.) | Bedeutung |
|---|---|---|
| `const APP_VER = '0.20';` | ~70252 | **Versionsvariable** – hier ändern für neue Version |
| `document.querySelectorAll('.l-ver')` | ~70252+1 | DOM-Updater für h1 `<sup class="l-ver">` |
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
| `SkyCheck v${APP_VER}` | ~37844 | Footer-Versionsstring |
| `<sup class="l-ver"></sup>` | ~29858 | h1-sup (via DOM-Updater gefüllt) |

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
| Anker `'-'` nicht gefunden | Non-ASCII-Quotes im Template | Backtick-positionaler Ansatz: `src.find('`', src.find("card('Kp-Index'"))` |
| `request_access` Timeout | Bildschirmsperre aktiv | Lock Screen → "Require password" → Never |
| Netlify-URL | Kein skycheck.netlify.app | enchanting-stardust-f713da.netlify.app/skycheck.html |
| Cowork kann Ordner nicht mounten | Pfad in verstecktem Verzeichnis (`.gemini/`) | Projekt liegt jetzt in `~/Documents/skycheck_project/` |

---

## Versions-Historie

| Version | Änderungen |
|---|---|
| v0.20 | Sichtweite `<br>` vor CTR-D; KP-Messung letzter hist. Bar + Zeitstempel; APP_VER-Variable + DOM-Updater; h1-Version korrigiert |
| v0.19 | KP-Messung Balken (solid+dashed); KP-Index Zeitstempel; Sichtweite min-Subtext |

---

## Patch-Checkliste

1. `const APP_VER = 'X.XX';` in `skycheck.html` aktualisieren (einzige Stelle)
2. Änderungen mit `Read` + `Edit` direkt in der Datei vornehmen
3. Anker-Eindeutigkeit vorab mit `Grep` prüfen
4. `git add skycheck.html && git commit -m 'SkyCheck vX.XX' && git push` (Bash-Tool)
5. `curl | grep APP_VER` → Netlify-Verifikation
