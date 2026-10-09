# SkyCheck — Roadmap

Offene Ideen und geplante Verbesserungen. Kein festes Datum; Priorität nach Bedarf.

## Datenquellen

- [ ] **Frankreich — präzisere Geozonen-Quelle.** Aktuell verlinkt die Quellenleiste
      (`COUNTRY_ZONE_SOURCES.fr`) generisch auf „Géoportail Drones"
      (https://www.geoportail.gouv.fr/donnees/restrictions-pour-drones-de-loisir).
      Die tatsächlich verarbeiteten Zonendaten stammen aus einem ED-269-Snapshot
      (`data/uas-zones-fr.json`). Ziel: die **autoritative Bezugsquelle** ermitteln und
      verlinken (SIA/DGAC bzw. der offizielle ED-269-Feed der französischen
      Luftfahrtbehörde) und — analog zu Österreich (`.github/workflows/update-at-zones.yml`) —
      ein **monatliches Auto-Update** einrichten, damit der FR-Datensatz nicht manuell
      gepflegt werden muss. (Notiert 2026-07-17 auf Nutzerwunsch.)

## Österreich-Zusatzebenen (v0.96)

- [ ] **Schutzgebiete aus offizieller UBA-Quelle statt OSM.** v0.96 bezieht die AT-Schutzgebiete
      (wie Autobahnen/Stromleitungen/Bahn) aus **OpenStreetMap** — zuverlässig via Overpass, aber
      nicht die amtliche Quelle. Das **Umweltbundesamt** (data.gv.at / INSPIRE-WFS) wäre autoritativer
      und sauberer kategorisiert; die Endpoints waren aus der Build-Umgebung nicht erreichbar
      (`gis.umweltbundesamt.at` DNS-Fehler). Ziel: UBA-Schutzgebiete anbinden, sobald erreichbar.
- [ ] **Optional: Auto-Update der AT-Zusatzebenen** (derzeit einmaliger Snapshot). Analog zur
      AT-ED-269-Pipeline ein monatlicher GitHub-Action-Refresh der `data/at-*.json` aus Overpass.
- [ ] Dieselben Zusatzebenen ggf. auf weitere Länder ausrollen (OSM ist länderübergreifend).

## Weitere Länder

- [ ] Prüfen, welche weiteren EU-Staaten ihre Geozonen gemäß Art. 15(3) VO (EU) 2019/947
      offen (ED-269/ED-318) bereitstellen und als neue `skycheck-<xx>`-Variante anbinden.

- [ ] **Tschechien (skycheck-cz) — offizielle ŘLP-ED-269-Quelle.** Recherche 2026-08:
      Die offizielle CZ-Drohnenkarte ist **dronemap.gov.cz** (früher DronView / dron.rlp.cz),
      betrieben von der Flugsicherung **ŘLP ČR**, GIS-Backend **`aimgis.rlp.cz`** (ArcGIS,
      WMS/WFS, ohne Auth). Problem: Die zusammengesetzte „alle Geozonen"-Geometrie holt DronMap
      über `getGJ.php` mit **AES-verschlüsselten** Requests/Responses (Obfuskation) — kein sauberer
      Endpoint. Die offenen `aimgis`-WMS-Dienste sind **fragmentiert** (ein Layer je Service:
      `zony`/AD_inner_zones, `Gridy`/GRID_CTR+GRID_ATZ, `ODOS`, …) — kein einzelner Geozonen-Layer
      wie DiPUL. Der kommerzielle „Dronecharts"-WMS (`gis.lagunasolutions.cz/geoserver/dronecharts/wms`,
      Layer `dronecharts:dronecharts_cz`, anonymes GetMap möglich) ist © Dronecharts/CopterShop.cz →
      Weiterverwendung nur mit Erlaubnis.
      **Amtliche Quelle gefunden (Update 2026-08):** ŘLP AIM publiziert die UAS-Geozonen offiziell im
      **ED-318-Format** — Seite **`aim.rlp.cz/?lang=en&p=uas-gz`** (UAS – Geo zones). Zwei ZIP-Pakete
      **`ed_318_a1_a2.zip`** (Kategorien A1/A2, inkl. HOP „dicht besiedeltes Gebiet") und
      **`ed_318_a3.zip`** (Kategorie A3, inkl. „Settled Area"), plus **`.geojson`-Referenzdateien** mit
      den exakten, rechtsverbindlichen Grenzen (die ED-318-ZIPs sind für Geoawareness generalisiert;
      in nummerierte Kacheln mit 2,3 km Überlappung zerlegt; AIRAC-Update). **Aber:** Die Download-
      Tabelle auf der Seite ist **derzeit leer** — ŘLP baut die Website gerade um („changes to the
      website structure … easier access to published data packages"); Datei-Links weder im DOM noch im
      Web-Archiv, geratene Pfade 404. Gelände-/Hindernisdaten laufen dort ohnehin „On Request"
      (`aim@ans.cz`). **Nächster Schritt:** nach Abschluss des Umbaus die `.geojson`-Referenzdateien
      (bzw. `ed_318_*.zip`) von `aim.rlp.cz/?p=uas-gz` ziehen und wie FR/AT als Datei bündeln — ODER
      direkt bei `aim@ans.cz` anfragen. Damit wäre skycheck-cz sauber und lizenzkonform baubar.
      (Notiert 2026-08 auf Nutzerwunsch; NL + PT via EASA bereits umgesetzt.)

- [ ] **Lücken gegenüber Hoverpoint (LU, NO, EE, SE, BE) — Quellenrecherche 2026-10-09.**
      Anlass: web.hoverpoint.info bindet 13 Länder an (DE, CH/LI, LU, NL, BE, FR, ES, DK, SE, NO,
      EE, IE; FI gelistet, aber inaktiv), jeweils direkt bei der nationalen Stelle (Quellenliste
      auf `web.hoverpoint.info/status`; die Abfragen laufen dort serverseitig, die konkreten URLs
      sind nicht einsehbar). SkyCheck hat 9 (DE, FR, AT, CH, ES, DK, IE, NL, PT). Das EASA Common
      Repository (`services-eu1.arcgis.com/71Lfb7umh2boMcWI`) enthält nur PT, NL, DK, IE, ES —
      für die fünf Lücken hilft es nicht. Stand je Land (Endpunkte per HTTP-Abruf geprüft):
  - [x] **Luxemburg (skycheck-lu).** Direction de l'Aviation Civile, Datensatz „UAS Geographical
        Zones" auf data.public.lu, Lizenz **CC0**. Datei: `https://drones.geoportail.lu/zones`
        (ED-269-JSON mit UTF-8-BOM, ~80 KB, 43 Zonen, Polygone in `geometry[].horizontalProjection`).
        Kein CORS-Header → wie AT als Datei bündeln (`data/uas-zones-lu.json` + Function/Workflow) — **umgesetzt in v26.10.117.0**
  - [x] **Norwegen (skycheck-no).** Luftfartstilsynet / dronesoner.no, Lizenz **NLOD 2.0**
        (Weiterverwendung auch in Drittanwendungen erlaubt; Kreditierung „Kilde: Luftfartstilsynet /
        dronesoner.no"). Tagesaktuelle Dateien mit Datum im Namen:
        `https://dronesoner.no/Downloads/NOR_ED269_compliant_geozones_<YYYY-MM-DD>.json` (~2,9 MB,
        1394 Zonen) und `NOR_ED318_compliant_geozones_<YYYY-MM-DD>.json`. Enthält auch die zum
        Bauzeitpunkt aktiven NOTAM-Zonen. Kein CORS-Header → bündeln; wegen Größe wie FR kacheln — **umgesetzt in v26.10.117.0**
  - [ ] **Estland (skycheck-ee).** EANS: `https://utm.eans.ee/avm/utm/uas.geojson`
        (GeoJSON-FeatureCollection, ohne Key). Offen: Lizenz/Nutzungsbedingungen und CORS — **technisch umgesetzt in v26.10.117.0, Veröffentlichung wartet auf Lizenzklärung**
  - [ ] **Schweden (skycheck-se).** LFV-GeoServer `https://daim.lfv.se/geoserver/ows` (offener WFS).
        Kein einzelner Geozonen-Layer, sondern Luftraum-Layer (`mais:CTR`, `mais:ATZ`, `mais:RSTA`,
        `mais:DNGA`, `mais:TIZ`, `mais:TIA` …) → Zonen müssen zusammengesetzt werden; Referenzkarte
        `dronechart.lfv.se`. Offen: Lizenz und welche Layer drohnenrelevant sind.
  - [ ] **Belgien (skycheck-be).** Amtliche Karte `map.droneguide.be` (skeyes/BCAA, Unifly-Plattform).
        Kein offener Endpunkt gefunden: die Karten-API verlangt Login + Annahme der Lizenzvereinbarung;
        der 2021 angekündigte Geozonen-Download liegt hinter dieser Anmeldung. Nächster Schritt:
        Download-Format und Weiterverwendungsbedingungen nach Anmeldung prüfen oder bei skeyes/BCAA
        anfragen.
