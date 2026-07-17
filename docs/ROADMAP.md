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

## Weitere Länder

- [ ] Prüfen, welche weiteren EU-Staaten ihre Geozonen gemäß Art. 15(3) VO (EU) 2019/947
      offen (ED-269/ED-318) bereitstellen und als neue `skycheck-<xx>`-Variante anbinden.
