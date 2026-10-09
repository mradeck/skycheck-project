# SkyCheck v118 — Schweden und Belgien

Stand: 2026-10-09 · Branch `feature/v118-se-be` · Zielversion `v26.10.118.0`

## Ziel

Zwei neue Länder-Varianten `skycheck-se` und `skycheck-be` nach dem Norwegen-Muster:
dauerhafte Zonen als wöchentlicher Snapshot über die bestehende ED-269-Strecke, befristete
Gebiete (NOTAM u. ä.) live auf Knopfdruck. Beide erben die Ausfall-Anzeige aus v26.10.117.1.

Erfolgskriterium: An Stockholm-Arlanda (ESSA, 59.6519 / 17.9186) und Brüssel-Zaventem
(EBBR, 50.9010 / 4.4844) liefert der Check die amtlichen Zonen; der Live-Knopf lädt in
beiden Ländern befristete Gebiete.

## Nicht im Umfang

- OSM-Zusatzebenen, eigene UI-Sprachen (Schwedisch, Niederländisch).
- Die belgische CIS-Schnittstelle (nur dynamische Teilmenge, eigene ungeklärte Bedingungen).
- Anlegen der Netlify-Projekte `skycheck-se` / `skycheck-be` (macht der Nutzer).
- Änderungen an `zones-at.js`, `zones-fr.js`, an der Ausfall-Logik oder an anderen Ländern,
  außer der unten beschriebenen Verallgemeinerung des NOTAM-Knopfs.

## Quellen und Rechtslage

### Schweden — LFV / Transportstyrelsen, CC BY 4.0

Produktseite: `https://daim.lfv.se/echarts/dronechart/API/` (nennt die Lizenz CC BY 4.0 und
die Layer der amtlichen Drönarkartan `https://dronechart.lfv.se/`).

- WFS: `https://daim.lfv.se/geoserver/wfs?service=WFS&version=1.1.0&request=GetFeature&outputFormat=application/json&srsname=EPSG:4326&typename=<Layer>`
- UAS-Zonen (Transportstyrelsen, ED-318, 68 Zonen): `https://dronechart.lfv.se/data/uas_zones_ED318.json`
- Kein CORS-Header. Aktualisierung im AIRAC-Takt (28 Tage); NOTAM/SUP laufend.

| Layer | Inhalt | Geometrie | Einstufung (`restriction`) |
|---|---|---|---|
| `mais:RSTA` | Restriktionsområden (168; nur `LOWER === 'GND'` wird übernommen: 160) | Polygon | `REQ_AUTHORISATION` |
| `DAIM_TOPO:RWY5K` | 5 km um Flughäfen (47) | MultiPolygon | `REQ_AUTHORISATION` |
| ED-318-Datei | UAS-Zonen (68) | Polygon / Point + Kreis | aus dem Feld `type` (`REQ_AUTHORIZATION` → `REQ_AUTHORISATION`, `CONDITIONAL`, `PROHIBITED`) |
| `mais:CTR` | Kontrollzonen (43; ohne `POSITIONINDICATOR === 'ESGP'`, wie die amtliche Karte) | Polygon | `CONDITIONAL` |
| `mais:ATZ` | Trafikzoner (2; ohne `ESGP`) | Polygon | `CONDITIONAL` |
| `mais:TIZ` | Trafikinformationszoner (11) | Polygon | `CONDITIONAL` |
| `DAIM_TOPO:HKP1K` | 1 km um Heliports (38) | MultiPolygon | `CONDITIONAL` |
| `mais:DNGA` | Farliga områden (21) | Polygon | `CONDITIONAL` |

Live (nicht im Snapshot):

- `dynais:NOTAM` mit dem Filter der amtlichen Karte: `(CODE23 ilike 'R%' OR CODE23 ilike 'W%') AND CODE45 <> 'TT'`; zusätzlich nur `LOWER === 0` (ab Boden).
- `DAIM_TOPO:SUP` (AIP SUP, befristete Restriktionsgebiete), nur aktuell gültige (`FROM <= jetzt <= TO`).

### Belgien — BCAA (Herausgeber) über skeyes / Droneguide

- WFS (GeoServer, anonym): `https://map.droneguide.be/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=geo_zone_fast&srsName=EPSG:4326&outputFormat=application/json&cql_filter=<…>`
- Kein CORS-Header, `cache-control: private, max-age=300`, keine Angaben in `Fees`/`AccessConstraints`.
- Der Layer enthält 420 Welt-Zeitzonen-Polygone (`type_code = 'TIME_ZONE'`, ungefiltert 149 MB):
  **jede** Abfrage filtert sie serverseitig per `cql_filter` heraus.
- Rechtslage: Laut einer öffentlich dokumentierten Antwort der BCAA (Az. G26-187, 2026-09-16,
  wiedergegeben in github.com/CallMarcus/dji-drone-metadata-embedder/issues/562) ist für die
  Weiterverwendung keine Einzelgenehmigung nötig; Droneguide ist einer der amtlichen Kanäle.
  Die BCAA empfiehlt vier dauerhaft sichtbare Hinweise (siehe „Belgien-Hinweis"). Eine Lizenz
  ist nicht benannt → Doku: „vom Herausgeber nicht angegeben".

Felder: `unique_identifier`, `name` (JSON-String `{"de":…,"en":…,"fr":…,"nl":…}` oder
Klartext), `code`, `description`, `type_code`, `restriction`
(`PROHIBITED` / `REQ_AUTHORISATION` / `CONDITIONAL`), `lower/upper_limit_altitude_meter_agl`
(serverseitig umgerechnet; 35 Zonen ohne unteren Wert), Roh-Höhen mit Einheit und Bezug.

Snapshot: alle Zonen außer `TIME_ZONE`, `NOTAM`, `TEMPORARY-NO-FLY-ZONE`, und ohne Zonen mit
`lower_limit_altitude_meter_agl > 120` (wie die Standardansicht der amtlichen Karte);
fehlender unterer Wert zählt als 0. Stand 2026-10-09: 582 Zonen.

Live: `type_code IN ('NOTAM','TEMPORARY-NO-FLY-ZONE')`, ebenfalls ohne Zonen, die über 120 m
beginnen (Stand: 113).

## Architektur

### 1. Snapshots (`scripts/build-eu-zones.mjs`)

Zwei neue Länder im selben kanonischen ED-269-Array wie LU/NO/EE.

- `be`: Eingabe = eine WFS-GeoJSON-Datei. Regeln wie oben. `name` = `en`, sonst `nl`, `fr`,
  erster Wert, sonst Klartext; alle Sprachfassungen nach
  `extendedProperties.localizedMessages` nur, wenn `description` mehrsprachig ist (sonst
  `message = description || ''`). Höhen aus den `*_meter_agl`-Feldern (gerundet, `M`, `AGL`).
  `typeCode` = `type_code` als Zusatzfeld. `zoneAuthority = [{ name: 'BCAA / skeyes (Droneguide)', siteURL: 'https://map.droneguide.be/' }]`.
  Mindestanzahl 300.
- `se`: Eingabe = ein **Verzeichnis** mit den Dateien `RSTA.json`, `DNGA.json`, `ATZ.json`,
  `TIZ.json`, `CTR.json`, `HKP1K.json`, `RWY5K.json`, `uas_zones_ED318.json`. Fehlt eine
  Datei oder ist eine leer/unlesbar → Abbruch (kein Teil-Snapshot). Mindestanzahl 250.
  - Name: RSTA/DNGA/CTR/ATZ/TIZ `LOCATION || NAMEOFAREA`; RWY5K `Airport 5 km: <NAMEOFAREA>`;
    HKP1K `Heliport 1 km: <LOCATION>`; ED-318 englischer Text aus `name[]`, sonst erster.
  - Beschreibung (`message`): RSTA/DNGA `COMMENT_2` (schwedisch, aus den Daten); ED-318
    englische `message`, schwedische zusätzlich in `localizedMessages`; für CTR, ATZ, TIZ,
    RWY5K, HKP1K je ein fester neutraler englischer Satz, der die Zonenart nennt und auf die
    amtlichen Regeln verweist (kein eigener Regeltext), z. B. CTR:
    „Control zone. Conditions for drone flights apply — see dronechart.lfv.se and the rules of Transportstyrelsen."
  - Höhen: `LOWER` `GND` → 0 AGL; `UPPER` Zahl → Fuß AMSL (`FT`, `AMSL`); `FL nnn` → nnn×100
    Fuß, Bezug `STD`; `UNL`/leer → kein oberer Wert. ED-318: aus `geometry.layer`.
    RWY5K/HKP1K ohne Höhen.
  - Geometrie: Polygon; MultiPolygon → ein Volumen je Teilpolygon; ED-318 Point + `extent`
    Kreis → `Circle` mit `center` und `radius`.
  - `identifier`: stabil und eindeutig (`SE-<Layer>-<Schlüssel>`); `country: 'SWE'`;
    `zoneAuthority = [{ name: 'LFV / Transportstyrelsen (CC BY 4.0)', siteURL: 'https://dronechart.lfv.se/' }]`.

### 2. Workflow (`.github/workflows/update-eu-zones.yml`)

Zwei weitere Länder-Schritte (`se`, `be`) nach dem bestehenden Muster, wöchentlich, in der
Eingabe-Auswahl ergänzt, im Commit- und Fehler-Schritt berücksichtigt. Schweden lädt acht
Dateien in ein Temp-Verzeichnis; scheitert ein Abruf, scheitert der Schritt.

### 3. Functions

- `zones-ed269.js`: `se` und `be` in `COUNTRIES`; `netlify.toml` `included_files` ergänzt.
- `notam-se.js` und `notam-be.js`: Live-Proxys in der Form von `notam-no.js`
  (`200 { country, fetchedAt, zones[] }`, jede Zone mit `notam: true`; Fehler → `502 { error }`;
  Zeitlimit 12 s; `Cache-Control: public, max-age=300`, Fehler `no-store`).
  - SE: zwei Abrufe (NOTAM, SUP). NOTAM: `name` „NOTAM <SERIES><NO>/<YEAR>", `desc` `ITEM_E`,
    `lower`/`upper` `ITEM_F`/`ITEM_G`, `type` `PROHIBITED` bei `CODE23` mit `R`, sonst
    `CONDITIONAL`. SUP: `name` „<DESIG> <NAME>", `desc` `COM_EN || COM_SE` plus `SCHEDULE`,
    `type` `PROHIBITED`. Scheitert einer der beiden Abrufe → 502 (kein Teilergebnis).
  - BE: ein Abruf mit `cql_filter`; `type` = `restriction`, `desc` = `description`, Höhen
    aus den `*_meter_agl`-Feldern.
  - Farben nach `type` wie überall (`PROHIBITED` rot, `REQ_AUTHORISATION` bernstein,
    `CONDITIONAL` orange).

### 4. Client (`skycheck.html`)

- Länder-Verdrahtung `se`/`be`: Hostname, `COUNTRY_DEFAULT_LANG` (en), Wahrzeichen
  („Stadshuset, Stockholm", „Grand-Place, Bruxelles"), `COUNTRY_BBOX`
  (`10.5,55.2,24.3,69.1` / `2.5,49.4,6.5,51.6`), `COUNTRY_CC`, `COUNTRY_NAMES`
  (Schweden/Sweden/Suède/Suecia/Szwecja; Belgien/Belgium/Belgique/Bélgica/Belgia),
  `COUNTRY_ZONE_SOURCES` („LFV / Transportstyrelsen (CC BY 4.0)" → dronechart.lfv.se;
  „BCAA / skeyes Droneguide" → map.droneguide.be), `COUNTRY_VARIANTS` (🇸🇪, 🇧🇪).
- `ED269_COUNTRIES` und `OVERLAY_ALL` um `se`, `be`.
- **NOTAM-Knopf verallgemeinert:** eine Tabelle `LIVE_NOTAM = { no, se, be }` mit Function-URL
  und Quellen-Link je Land; Zustand, Abruf, Overlay, Treffer, Hinweis und 5-Minuten-Frist
  gelten je Land. Verhalten für Norwegen bleibt unverändert. Das Overlay nutzt die Farbe der
  Zone. Bestehende i18n-Texte `notam*` werden wiederverwendet.
- **Belgien-Hinweis:** fester, immer sichtbarer Text unter der Zonenliste (neuer i18n-Schlüssel
  `beNotice` ×5), sinngemäß: „Quelle: Droneguide (skeyes, im Auftrag der BCAA). Keine
  offizielle Anwendung der BCAA oder belgischer Behörden. Maßgeblich sind allein die amtlichen
  Kanäle (Droneguide, AIP/NOTAM, CIS). Die Verantwortung für die Einhaltung der Vorschriften
  bleibt beim Fernpiloten und beim UAS-Betreiber." Er steht dort, wo auch der Estland-Hinweis
  steht, und zusätzlich im Hinweiskasten der Zonenliste nicht — ein Ort genügt.

### 5. Version und Doku

`APP_VER = '26.10.118.0'`, `sw.js`, `CLAUDE.md`, fünf READMEs (Tabellen, Parameterlisten,
Architekturbaum, Historie, „zwölf" → „vierzehn"), `SkyCheck_API_Dokumentation.md`,
`scripts/README.md`, `docs/ROADMAP.md`; Wiki zusammen mit dem Push.

## Fehlerverhalten

Wie LU/NO/EE: fehlgeschlagener Punktabruf → Platzhalter „Zonendaten nicht verfügbar" (v117.1).
Live-Knopf: Fehlermeldung plus Link zur amtlichen Karte des Landes; restliche Seite unberührt.
Workflow: scheitert ein Land, bleibt sein alter Snapshot, die anderen laufen weiter.

## Tests

`node --test "tests/*.test.mjs"`. Neu: Umwandlung `se` (je Layer ein Fall, Kreis, MultiPolygon,
Höhen-Parsing, `ESGP`-Filter, fehlende Datei → Abbruch) und `be` (TIME_ZONE/NOTAM/temporär
raus, >120 m raus, Namens-JSON, fehlender unterer Wert); `zones-ed269` für `se`/`be`;
`notam-se`/`notam-be` mit gestubbtem `fetch` (Erfolg, Filter in der URL, Teilausfall → 502,
Nicht-JSON → 502, Zeitlimit); Client: verallgemeinerter Knopf (Norwegen unverändert,
`se`/`be` nutzen ihre URL). Browserprüfung am Snapshot-Server: Arlanda, Zaventem, Live-Knopf,
Belgien-Hinweis, Handy und Desktop.
