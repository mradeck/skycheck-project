# scripts/ — Länder-Zusatzebenen (Kontext-Overlays)

Erzeugt die statischen GeoJSON-Snapshots für die **informativen** Zusatzebenen, die SkyCheck
über der amtlichen Geozonen-Karte anzeigen kann (Schutzgebiete, Autobahnen, Stromleitungen, Bahn).
Quelle: **OpenStreetMap** (ODbL) via Overpass. Diese Ebenen sind reiner Kontext (Abstandsregeln)
und fließen **nicht** in die Go/No-Go-Bewertung ein — verbindlich bleibt die nationale Geozonen-Quelle.
**Deutschland ist ausgenommen** (DiPUL liefert diese Zonen dort bereits als offizielle Geozonen).

## Dateien

- **`gen-context.mjs`** — kanonischer Generator. Fetch (Overpass, Mirror-Retry) + Vereinfachung
  (Douglas-Peucker, 5 Dezimalstellen) + Gruppierung (MultiLineString je ref/Spannungsklasse,
  MultiPolygon je Schutzkategorie). Kann auch eine vorab geladene Rohdatei verarbeiten (`--raw`).
- **`fetch-context.sh`** — robuster Treiber: holt die Rohdaten per `curl` (zuverlässiger als
  node-`fetch` bei ausgelasteten Mirrors), idempotent (überspringt vorhandene, valide Ausgaben),
  ruft dann `gen-context.mjs --raw` je Ebene auf. Für Frankreich wird eine Metropol-Bbox genutzt
  (die ISO-Fläche würde Überseegebiete mitziehen).
- **`build-fr-spatial-data.mjs`** — erzeugt aus den vier vollständigen Frankreich-Snapshots
  gebündelte 2°-Viewport-Kacheln unter `data/context/fr/` und zerlegt außerdem den französischen
  ED-269-Datensatz für die Netlify-Punktabfrage nach `data/fr-zones-tiles/`. Nach jeder Änderung
  einer französischen Quelldatei erneut ausführen.

## Neues Land hinzufügen (Checkliste)

1. Daten erzeugen — bequem über den Treiber (empfohlen, da resume-fähig):
   ```bash
   bash scripts/fetch-context.sh <cc>        # z. B. pl, be, nl, it …
   ```
   Alternativ direkt (fetcht selbst, kann bei Overpass-Last zäh sein):
   ```bash
   node scripts/gen-context.mjs <cc>
   # Große Länder ggf. gröber vereinfachen: --lines-eps 0.0002 --poly-eps 0.0003
   ```
   Ergebnis: `data/<cc>-{protected,motorways,powerlines,rail}.json`.
   Für Frankreich anschließend zusätzlich:
   ```bash
   node scripts/build-fr-spatial-data.mjs
   ```
2. In [`skycheck.html`](../skycheck.html) das Land zu **`CONTEXT_COUNTRIES`** hinzufügen
   (Anker `[J-CONFIG]`). Die Toggle-Gruppe erscheint dann automatisch für dieses Land.
3. Version bumpen, README/CLAUDE aktualisieren, committen, deployen, live prüfen.

## Hinweise

- **Einmaliger Snapshot** (kein Auto-Update). Wer die Daten aktuell halten will, kann den Treiber
  in einen monatlichen GitHub-Action-Job hängen (analog `.github/workflows/update-at-zones.yml`);
  siehe `docs/ROADMAP.md`.
- **Schutzgebiete** kommen aus OSM (`boundary=protected_area|national_park`, `leisure=nature_reserve`,
  Kategorisierung über `protection_title`/`protect_class`). Amtliche nationale Quellen (z. B.
  Umweltbundesamt AT) wären autoritativer — siehe Roadmap.
- **Größenordnung** (gzip, was Netlify ausliefert): pro Ebene meist 0,1–0,5 MB; lazy geladen erst
  bei Aktivierung des jeweiligen Toggles. Frankreich ist viewportgekachelt: Paris benötigt für
  alle vier Ebenen zusammen rund 0,25 MB gzip statt rund 4,1 MB für die vier Vollbestände.
