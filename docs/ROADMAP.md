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
