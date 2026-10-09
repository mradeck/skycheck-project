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

## EU-Geozonen (LU/NO/EE/SE/BE)

Erzeugt die ED-269-Snapshots `data/uas-zones-{lu,no,ee,se,be}.json` aus den amtlichen Rohdateien. Reine Transformation, **ohne Netzwerkzugriff**:

```bash
node scripts/build-eu-zones.mjs <lu|no|ee|be> <eingabedatei> <ausgabe.json> [--min N]
node scripts/build-eu-zones.mjs se <eingabeverzeichnis> <ausgabe.json> [--min N]
```

- Schreibt `<ausgabe.json>` und daneben `<ausgabe>.version` (SHA-256 der Ausgabe).
- `--min N` setzt die Mindestanzahl Zonen; ohne Angabe gilt LU 20, NO 500, EE 100, SE 250, BE 300. Liegt die Zahl darunter (abgeschnittener Download), bricht das Skript mit Exit-Code 1 ab und lässt die Ausgabedatei unverändert.
- Erwartete Größenordnung 2026-10: LU 43, NO 1390, EE 241, SE 390, BE 582 Zonen.
- **Schweden (`se`) nimmt ein Verzeichnis**, keine Datei, mit genau acht Dateien: `RSTA.json`, `DNGA.json`, `ATZ.json`, `TIZ.json`, `CTR.json`, `HKP1K.json`, `RWY5K.json` und `uas_zones_ED318.json`. Fehlt eine Datei oder ist sie leer oder unlesbar, bricht das Skript ab (kein Teil-Snapshot).
- **Belgien (`be`) nimmt eine Datei** (WFS-GeoJSON) und setzt voraus, dass beim Abruf **jede** Abfrage einen `cql_filter` trägt, der `TIME_ZONE`, `NOTAM` und `TEMPORARY-NO-FLY-ZONE` ausschließt (der Layer enthält ungefiltert rund 149 MB Welt-Zeitzonen-Polygone). Das Skript selbst lässt zusätzlich Zonen mit Untergrenze über 120 m AGL weg (wie die Standardansicht der amtlichen Karte).
- Unbekannte Restriktionswerte oder Höhenangaben (SE und BE) brechen den Bau des Landes ab; Kennungen und Namen werden für alle Länder gemeinsam geprüft.

**Quellen:**

| Land | Quelle | URL | Lizenz |
|------|--------|-----|--------|
| 🇱🇺 Luxemburg | Direction de l'Aviation Civile („UAS Geographical Zones“) | `https://drones.geoportail.lu/zones` | CC0 |
| 🇳🇴 Norwegen | Luftfartstilsynet / dronesoner.no (ED-269-konform) | `https://dronesoner.no/Downloads/NOR_ED269_compliant_geozones_<YYYY-MM-DD>.json` | NLOD 2.0 |
| 🇪🇪 Estland | EANS (UAS-Karte) | `https://utm.eans.ee/avm/utm/uas.geojson` | vom Herausgeber nicht angegeben |
| 🇸🇪 Schweden | LFV (DAIM-GeoServer, sieben WFS-Layer) und Transportstyrelsen (ED-318-Zonendatei) | `https://daim.lfv.se/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&outputFormat=application/json&srsname=EPSG:4326&typename=<Layer>` mit den Layern `mais:RSTA`, `mais:DNGA`, `mais:ATZ`, `mais:TIZ`, `mais:CTR`, `DAIM_TOPO:HKP1K`, `DAIM_TOPO:RWY5K`; dazu `https://dronechart.lfv.se/data/uas_zones_ED318.json` | CC BY 4.0 |
| 🇧🇪 Belgien | BCAA (Herausgeber) über skeyes / Droneguide (WFS `geo_zone_fast`) | `https://map.droneguide.be/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=geo_zone_fast&srsName=EPSG:4326&outputFormat=application/json&cql_filter=type_code NOT IN ('TIME_ZONE','NOTAM','TEMPORARY-NO-FLY-ZONE')` (Pflichtfilter, URL-kodiert) | vom Herausgeber nicht angegeben; Weiterverwendung laut BCAA-Auskunft Az. G26-187 vom 2026-09-16 |

**Norwegischer Dateiname:** Der Dateiname trägt das Tagesdatum. Ältere Dateien liefern 404. Der Workflow liest deshalb den aktuellen Link von der Startseite `https://dronesoner.no/`, statt eine feste URL zu verwenden.

**Automatisches Update:** `.github/workflows/update-eu-zones.yml` läuft jeden Montag um 04:00 UTC für alle fünf Länder und lässt sich manuell per „Run workflow“ für ein Land oder alle starten. Committet wird nur bei inhaltlicher Änderung; Artefakte und Cache werden bewusst nicht verwendet. Schlägt ein Land fehl, bleibt sein bisheriger Snapshot erhalten, und der Workflow endet mit Fehler.

---

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
