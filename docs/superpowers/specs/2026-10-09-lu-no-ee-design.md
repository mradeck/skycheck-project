# SkyCheck v117 — Luxemburg, Norwegen, Estland

Stand: 2026-10-09 · Branch `feature/v117-lu-no-ee` · Zielversion `v26.10.117.0`

## Ziel

Drei neue Länder-Varianten `skycheck-lu`, `skycheck-no`, `skycheck-ee`. Sie verhalten sich wie
die bestehenden Länder: Zonenliste mit Ampel am Standort, flächiges Karten-Overlay,
Quellenleiste, Eintrag in der Kachel „SkyCheck in anderen Ländern".

Erfolgskriterium: Am Flughafen Luxemburg (ELLX), Oslo-Gardermoen (ENGM) und Tallinn (EETN)
liefert der Check die amtlichen Zonen des jeweiligen Landes.

## Nicht im Umfang

- OSM-Zusatzebenen (Schutzgebiete, Autobahnen, Bahn, Strom) für die drei Länder.
- Eigene UI-Sprachen (Norwegisch, Estnisch, Luxemburgisch). Standard ist Englisch.
- Schweden, Belgien, Finnland (siehe `docs/ROADMAP.md`).
- Änderungen an `zones-at.js`, `zones-fr.js` oder den bestehenden Länder-Adaptern.
- Anlegen der Netlify-Projekte (erfolgt beim Release, nach ausdrücklicher Freigabe).

## Datenquellen

| Land | Quelle | URL | Format | Lizenz |
|---|---|---|---|---|
| LU | Direction de l'Aviation Civile | `https://drones.geoportail.lu/zones` | ED-269-JSON `{title, description, features[]}`, UTF-8-BOM, 43 Zonen | CC0 |
| NO | Luftfartstilsynet / dronesoner.no | `https://dronesoner.no/Downloads/NOR_ED269_compliant_geozones_<YYYY-MM-DD>.json` | ED-269-JSON, reines Array, 1394 Zonen, 2,9 MB | NLOD 2.0, Kreditierung „Kilde: Luftfartstilsynet / dronesoner.no" |
| NO (NOTAM) | dronesoner.no | `https://dronesoner.no/data/forbud_notam.geojson` | GeoJSON, Polygon/MultiPolygon, Felder `id, navn, name, upper_limit, lower_limit, remarks` | NLOD 2.0 |
| EE | EANS | `https://utm.eans.ee/avm/utm/uas.geojson` | GeoJSON-FeatureCollection, ED-269-Felder in `properties`, 244 Zonen, 5,1 MB | ungeklärt |

Beobachtungen, die das Design bestimmen:

- LU und NO senden keinen CORS-Header → kein Direktabruf aus dem Browser.
- Der NO-Dateiname trägt das Tagesdatum; die Datei des Vortags liefert 404. Der aktuelle Name
  steht als `Downloads/NOR_ED269_compliant_geozones_<Datum>.json` im HTML von `dronesoner.no`.
- Die NO-Datei enthält befristete NOTAM-Zonen (`applicability[].permanent === "NO"`).
- EE: `properties.geometry` ist ein einzelnes Objekt (kein Array), `properties.reason` ein
  String (kein Array). 213 der 244 Zonen haben `restriction: "NO_RESTRICTION"`.
- Restriktionswerte: `PROHIBITED`, `REQ_AUTHORISATION`, `CONDITIONAL`, `NO_RESTRICTION`.

## Architektur

### 1. Daten-Snapshots

Dateien im Repo, alle im selben kanonischen Format — ein reines JSON-Array von
ED-269-Zonen wie `data/uas-zones-at.json`:

- `data/uas-zones-lu.json` + `data/uas-zones-lu.version`
- `data/uas-zones-no.json` + `data/uas-zones-no.version`
- `data/uas-zones-ee.json` + `data/uas-zones-ee.version`

Erzeugt von **`scripts/build-eu-zones.mjs <lu|no|ee> <eingabedatei> <ausgabedatei>`** (Node,
keine Abhängigkeiten). Das Skript ist reine Transformation, kein Netzwerkzugriff:

- **Alle:** BOM entfernen, auf Array normalisieren, Zonen ohne Geometrie verwerfen,
  Koordinaten auf 5 Nachkommastellen runden, aufeinanderfolgende identische Punkte entfernen,
  kompakt schreiben. Abbruch mit Exit-Code ≠ 0, wenn 0 Zonen übrig bleiben.
- **NO:** Zonen verwerfen, bei denen irgendein `applicability`-Eintrag `permanent === "NO"` hat.
- **EE:** jedes GeoJSON-Feature → ED-269-Zone: `properties` übernehmen, `geometry` (Objekt) in
  ein einelementiges Array legen, `reason` (String) in ein einelementiges Array, die
  Darstellungsfelder `strokeColor`, `fillColor`, `hidden`, `metaData`, `lower`, `lowerMeters`,
  `upper`, `upperMeters`, `airspacetype`, `airspaceclass` entfernen. Zonen mit `hidden === true`
  verwerfen.

Die `.version`-Datei enthält den SHA-256 der erzeugten Ausgabedatei. Sie dient der
Idempotenz (kein Commit ohne inhaltliche Änderung).

### 2. Update-Workflow

**`.github/workflows/update-eu-zones.yml`**

- Trigger: `schedule` wöchentlich (`0 4 * * 1`) und `workflow_dispatch` mit Eingabe `country`
  (`all|lu|no|ee`, Standard `all`).
- Ein Job, Schritte je Land nacheinander. LU und EE laufen im Zeitplan nur, wenn der
  Tag-im-Monat ≤ 7 ist (also einmal pro Monat); NO läuft jede Woche.
- Je Land: Rohdatei mit `curl` holen (NO: Dateiname zuerst per `grep` aus der Startseite
  lesen) → `build-eu-zones.mjs` → SHA mit `.version` vergleichen → bei Abweichung Datei und
  `.version` schreiben.
- Schlägt ein Land fehl, laufen die anderen weiter (`continue-on-error` je Schritt); der Job
  endet rot, wenn mindestens eines fehlschlug.
- Ein gemeinsamer Commit `data: EU UAS zones auto-update (<Länder>)`, Push auf `master`.
- `permissions: contents: write`, `concurrency`-Gruppe `update-eu-zones`. Kein
  `upload-artifact`, keine Caches.

### 3. Netlify Functions

**`netlify/functions/zones-ed269.js`** — generischer ED-269-Provider.

- `GET ?country=lu|no|ee&lat=&lon=&radius=&lang=` → `{ country, zones: [...] }`, höchstens
  50 Treffer, `Cache-Control: public, max-age=300`.
- `GET ?country=…&all=1` → `{ country, all: true, zones: [...] }` in schlanker Form (Name,
  Typ, Farbe, Geometrie), `Cache-Control: public, max-age=3600`.
- Unbekanntes oder fehlendes `country` → 400. Fehlende Datei → 500.
- Zonenform identisch zu `zones-at.js`:
  `{ name, type, lower, upper, legal, legalUrl, color, desc, geometry }`.
  - `name`: `f.name || f.identifier` (bei LU/NO/EE ist `message` ein Langtext, kein Name —
    Abweichung von AT, dort ist `message` der Kurzname).
  - `desc`: lokalisierte Meldung aus `extendedProperties.localizedMessages` passend zu `lang`,
    sonst `f.message`.
  - `legal`/`legalUrl`: `zoneAuthority[0].name` und `zoneAuthority[0].siteURL` (Fallback
    `'—'` / `''`).
  - `color`: wie AT (`PROHIBITED` rot, `REQ_AUTHORISATION` bernstein, `CONDITIONAL` orange,
    `NO_RESTRICTION` grün, sonst grau).
  - `geometry`: je ED-269-Volumen ein Eintrag `{type:'Polygon', coordinates}` oder
    `{type:'Circle', center, radius}`.
- Punktfilter in zwei Stufen: Bounding-Box-Überlappung, danach exakter Test
  (Punkt-in-Polygon bzw. Abstand zur Polygonkante ≤ Radius). Der exakte Test ist nötig, weil
  die großen norwegischen Schutzgebiete sonst über ihre Bounding-Box weit entfernte Standorte
  treffen.
- Datei je Land einmal pro warmer Instanz laden und cachen.

**`netlify/functions/notam-no.js`** — Live-Proxy für norwegische NOTAM-Sperrgebiete.

- `GET` ohne Parameter → `{ country: 'NO', fetchedAt: <ISO>, zones: [...] }`.
- Holt `https://dronesoner.no/data/forbud_notam.geojson`, 8 s Timeout (`AbortController`).
- Je Feature eine Zone in obiger Form: `name` = `navn || name || id`, `type` =
  `'PROHIBITED'`, `color` rot, `lower`/`upper` = `lower_limit`/`upper_limit` (Rohtext),
  `desc` = `remarks`, `legal` = `'NOTAM'`, `legalUrl` = `https://dronesoner.no/`,
  zusätzlich `notam: true`. MultiPolygon wird in mehrere Polygon-Geometrien zerlegt.
- `Cache-Control: public, max-age=300`. Upstream-Fehler oder Timeout → 502 mit JSON
  `{ error }`.

**`netlify.toml`**

- `included_files` für `zones-ed269`: die drei `data/uas-zones-{lu,no,ee}.json`.
- CSP unverändert: beide Functions sind same-origin.

### 4. Client (`skycheck.html`)

Länder-Verdrahtung für `lu`, `no`, `ee`:

| Tabelle | lu | no | ee |
|---|---|---|---|
| Hostname-Erkennung | `skycheck-lu` | `skycheck-no` | `skycheck-ee` |
| `COUNTRY_DEFAULT_LANG` | en | en | en |
| `COUNTRY_LANDMARK` | Place Guillaume II, Luxembourg | Rådhuset, Oslo | Raekoja plats, Tallinn |
| `COUNTRY_BBOX` | `5.7,49.4,6.6,50.2` | `4.0,57.8,31.5,71.4` | `21.5,57.4,28.3,59.8` |
| `COUNTRY_CC` | LU | NO | EE |
| `COUNTRY_NAMES` | Luxemburg / Luxembourg / Luxembourg / Luxemburgo / Luksemburg | Norwegen / Norway / Norvège / Noruega / Norwegia | Estland / Estonia / Estonie / Estonia / Estonia |
| `COUNTRY_ZONE_SOURCES` | „DAC Luxembourg (CC0)" → data.public.lu-Datensatz | „Luftfartstilsynet / dronesoner.no (NLOD)" → dronesoner.no | „EANS" → utm.eans.ee |
| `COUNTRY_VARIANTS` | 🇱🇺 | 🇳🇴 | 🇪🇪 |

Die Hostname-Erkennung folgt exakt der bestehenden Zeile für `at`. `?country=` funktioniert
für die neuen Codes wie für die bestehenden.

Zonen-Abruf, ein gemeinsamer Satz Funktionen statt drei Kopien:

- `const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };`
- `fetchZonesEd269(lat, lon, radiusM)` → `/.netlify/functions/zones-ed269?country=${COUNTRY}&…`
- `fetchAllZonesEd269()` → `…&all=1`
- Dispatcher `fetchZones` und `ensureAllZones` verzweigen über `ED269_COUNTRIES[COUNTRY]`.
- Lokaler Vorschau-Fallback (`IS_LOCAL_PREVIEW`) liest `data/uas-zones-${COUNTRY}.json`
  direkt; dafür werden die vorhandenen `atLocal…`-Helfer mit einem Dateinamen-Parameter
  wiederverwendet, nicht dupliziert. Der Namens-Unterschied (`name` vor `message`) wird über
  denselben Parameter gesteuert.

Overlay:

- LU und EE: in `OVERLAY_ALL` aufnehmen (einmal alles laden und zeichnen).
- NO: ebenfalls `OVERLAY_ALL`. Vor der Festlegung wird mit den echten Daten gemessen
  (Ladezeit, Größe der `all=1`-Antwort, Flüssigkeit beim Verschieben auf einem Handy-Viewport).
  Ist die gzip-Antwort größer als 1 MB oder ruckelt die Karte sichtbar, wird das Overlay für
  NO auf Zoomstufe ≥ 8 begrenzt (unterhalb: Hinweis „Zoom in to see zones"). Die Entscheidung
  und die Messwerte werden im Umsetzungsbericht festgehalten.

NOTAM-Knopf (nur `COUNTRY === 'no'`):

- Platz: im Standort-Panel an der Stelle des DiPUL-Links (Zeile mit `msOpenDipul`), als
  Button „Load NOTAM restrictions".
- Klick → `/.netlify/functions/notam-no`. Während des Ladens deaktiviert mit Ladetext.
- Erfolg: Gebiete als eigene Leaflet-Ebene `S.layers.notamNo`, rot gestrichelt; Gebiete, die
  den Standort treffen (gleicher exakter Test wie serverseitig, clientseitig nachgebildet),
  erscheinen zusätzlich oben in der Zonenliste mit Kennzeichnung „NOTAM". Der Button zeigt
  danach „NOTAM · as of HH:MM" und lädt bei erneutem Klick neu.
- Fehler: Meldung „NOTAM data unavailable" plus Link zu `https://dronesoner.no/`.
- Fester Hinweis unter der Zonenliste (nur NO): befristete NOTAM-Sperrgebiete sind nicht
  Teil der gespeicherten Zonen und erst nach dem Laden sichtbar.
- Ampel: Geladene NOTAM-Treffer am Standort gehen in die Zonenbewertung ein (rot). Nicht
  geladene NOTAMs beeinflussen die Ampel nicht.
- Standortwechsel: geladene NOTAM-Daten bleiben für die Sitzung im Speicher (5-Minuten-Frist
  wie der Server-Cache); die Treffer am neuen Standort werden neu berechnet.

Neue i18n-Schlüssel in allen fünf Sprachen (DE/EN/FR/ES/PL): `notamLoad`, `notamLoading`,
`notamAsOf`, `notamError`, `notamHint`, `notamBadge`, `zoomInForZones`.

Alle Fremddaten (Zonennamen, `remarks`, Behördennamen) laufen durch `escapeHtml`; URLs aus
den Daten durch die bestehende Legal-Link-Behandlung.

### 5. Dokumentation und Version

- `APP_VER = '26.10.117.0'`.
- `CLAUDE.md`: „Aktuell", History-Zeile, Netlify-Funktionen-Liste, `netlify.toml`-Routing.
- `README*.md` (5 Sprachen), `SkyCheck_API_Dokumentation.md`, `scripts/README.md`,
  `docs/ROADMAP.md` (LU/NO/EE als erledigt, SE/BE offen).
- `sw.js`: Cache-Version anheben, falls dort eine Versionskennung steht.

## Fehlerverhalten

| Fall | Verhalten |
|---|---|
| Function nicht erreichbar (Produktion) | leere Zonenliste, bestehende Fehleranzeige des Zonen-Abschnitts |
| Function nicht erreichbar (lokale Vorschau) | Fallback auf die statische Datei |
| Snapshot-Datei fehlt im Function-Bundle | HTTP 500, Client wie oben |
| Upstream beim Workflow nicht erreichbar | Schritt rot, alter Snapshot bleibt, andere Länder laufen weiter |
| NO-Dateiname nicht auf der Startseite gefunden | Schritt rot mit klarer Fehlermeldung |
| NOTAM-Proxy Timeout / Fehler | Meldung + Link, restliche Seite unberührt |

## Tests

Node-eigener Testrunner (`node --test`), keine neuen Abhängigkeiten. Fixtures sind kleine
Auszüge der echten Dateien unter `tests/fixtures/`.

- `tests/build-eu-zones.test.mjs`: BOM-Entfernung (LU), NOTAM-Filter (NO: befristete Zone
  fällt weg, dauerhafte bleibt), EE-Umwandlung (Geometrie-Array, `reason`-Array, entfernte
  Darstellungsfelder, `hidden` verworfen), Koordinatenrundung, Abbruch bei 0 Zonen.
- `tests/zones-ed269.test.mjs`: 400 bei unbekanntem Land; Punkt im Polygon trifft; Punkt in
  der Bounding-Box, aber außerhalb des Polygons und außerhalb des Radius trifft nicht;
  `all=1` liefert schlanke Form; Namenswahl `name` vor `message`; Farbzuordnung.
- `tests/notam-no.test.mjs` (mit gestubbtem `fetch`): Umwandlung Polygon und MultiPolygon,
  502 bei Upstream-Fehler, 502 bei Timeout.

Browserprüfung am Snapshot-Server (nicht am Dev-Server), jeweils `?country=lu|no|ee`:
Flughafen-Standort liefert Zonen, Overlay sichtbar, NOTAM-Knopf lädt und zeichnet (NO),
Quellenleiste und Länder-Kachel korrekt. Viewports: schmales Handy, breites Handy, Desktop,
Karte normal und im Vollbild. Zusätzlich JS-Syntaxcheck des Script-Blocks und ein echter
Ladetest (kein TDZ-Fehler, siehe Lehre aus v0.95).

## Offene Punkte vor dem Release

1. **Estland-Lizenz.** Nutzungsbedingungen von EANS für `uas.geojson` prüfen. Ohne
   belastbare Erlaubnis bleibt `skycheck-ee` unveröffentlicht (kein Eintrag in
   `COUNTRY_VARIANTS`, kein Netlify-Projekt) bis zur Entscheidung des Nutzers; Code und
   Tests bleiben im Branch.
2. **Netlify-Projekte.** `skycheck-lu`, `skycheck-no`, `skycheck-ee` anlegen und mit dem
   Repo (Branch `master`) verknüpfen — beim Release, nach ausdrücklicher Freigabe.
