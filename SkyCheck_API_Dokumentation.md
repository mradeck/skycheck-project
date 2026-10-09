# SkyCheck — API-Dokumentation

Übersicht aller Datenschnittstellen, die in SkyCheck für die Drohnenflugprüfung eingesetzt werden. Geeignet als Referenz für die Entwicklung eigener Tools.

---

## 1. Geocoding — Photon (Komoot)

**Zweck:** Ortssuche (Freitext → Koordinaten) und Reverse Geocoding (Koordinaten → Ortsname)

**Basis-URL:** `https://photon.komoot.io`

**Kein API-Key erforderlich · CORS erlaubt · kostenlos**

### Vorwärts-Geocoding (Freitext-Suche)

```
GET https://photon.komoot.io/api/?q={suchbegriff}&lang=de&limit=5
```

| Parameter | Typ    | Beschreibung                        |
|-----------|--------|-------------------------------------|
| `q`       | string | Suchbegriff (URL-encoded)           |
| `lang`    | string | Sprache der Ergebnisse (`de`, `en`) |
| `limit`   | int    | Maximale Anzahl Treffer             |

**Antwort (GeoJSON FeatureCollection):**
```json
{
  "features": [
    {
      "geometry": { "coordinates": [11.5755, 48.1374] },
      "properties": {
        "name": "München",
        "country": "Deutschland",
        "state": "Bayern",
        "type": "city"
      }
    }
  ]
}
```

**Verwendung in SkyCheck:** `features[0].geometry.coordinates` → `[lon, lat]`

### Reverse Geocoding

```
GET https://photon.komoot.io/reverse?lat={lat}&lon={lon}&lang=de
```

**Antwort:** Gleiche Struktur wie oben — `features[0].properties.name` liefert den Ortsnamen.

---

## 2. Wetterdaten — DWD BrightSky

**Zweck:** Stündliche Wetterdaten (aktuell + 7 Tage Vorschau) vom Deutschen Wetterdienst

**Basis-URL:** `https://api.brightsky.dev/weather`

**Kein API-Key erforderlich · CORS erlaubt · kostenlos (DWD Open Data)**

### Endpunkt

```
GET https://api.brightsky.dev/weather?lat={lat}&lon={lon}&date={YYYY-MM-DD}&last_date={YYYY-MM-DD}&units=si
```

| Parameter   | Typ    | Beschreibung                                            |
|-------------|--------|---------------------------------------------------------|
| `lat`       | float  | Breitengrad                                             |
| `lon`       | float  | Längengrad                                              |
| `date`      | string | Startdatum `YYYY-MM-DD`                                 |
| `last_date` | string | Enddatum `YYYY-MM-DD` (max. 10 Tage in der Zukunft)    |
| `units`     | string | `si` = m/s für Wind; **Achtung: Temperatur in Kelvin** |

**Antwort:**
```json
{
  "weather": [
    {
      "timestamp": "2026-04-04T10:00:00+00:00",
      "temperature": 283.15,
      "dew_point": 276.15,
      "wind_speed": 4.2,
      "wind_gust_speed": 7.1,
      "wind_direction": 225,
      "precipitation": 0.0,
      "cloud_cover": 80,
      "visibility": 15000,
      "pressure_msl": 1015.3,
      "condition": "cloudy",
      "icon": "cloudy"
    }
  ]
}
```

**Wichtige Hinweise:**
- `units=si` liefert Temperatur in **Kelvin** → Umrechnung: `°C = K − 273.15`
- `cloud_cover` in Prozent (0–100)
- `visibility` in Metern
- `wind_gust_speed` ist der entscheidende Wert für Drohnenflug (Grenzwert: 10 m/s)
- Aktuellen Stundenwert ermitteln: Eintrag mit `timestamp` am nächsten zu `Date.now()` per `reduce()`

---

## 3. Geomagnetischer Index — GFZ Potsdam

**Zweck:** Kp-Index und Hp30-Index (30-Minuten-Auflösung) für GPS-Zuverlässigkeitsbewertung

**Basis-URL:** `https://kp.gfz.de/app/json/`

**Kein API-Key erforderlich · kostenlos · ⚠️ kein CORS-Header** (Browser-Fetch nur über Proxy möglich)

### Endpunkt

```
GET https://kp.gfz.de/app/json/?start={ISO8601Z}&end={ISO8601Z}&index={Kp|Hp30|Hp60}&status=nowcast
```

| Parameter | Typ    | Beschreibung                                                    |
|-----------|--------|-----------------------------------------------------------------|
| `start`   | string | Startzeitpunkt, Format: `2026-04-04T10:00:00Z`                  |
| `end`     | string | Endzeitpunkt, Format: `2026-04-04T12:00:00Z`                    |
| `index`   | string | `Kp` (3h-Index), `Hp30` (30-min), `Hp60` (60-min)              |
| `status`  | string | `nowcast` (aktuelle Messung) oder `definitive` (archiviert)     |

**Antwort:**
```json
{
  "datetime": ["2026-04-04T10:00:00Z", "2026-04-04T10:30:00Z"],
  "Hp30":     [2.333, 3.0],
  "status":   ["nowcast", "nowcast"],
  "meta": { "source": "GFZ Potsdam", "license": "CC BY 4.0" }
}
```

**Bewertungsskala:**

| Kp / Hp30  | Bedeutung                    | GPS-Auswirkung             |
|------------|------------------------------|----------------------------|
| 0 – 3.3    | Ruhig                        | Keine                      |
| 3.3 – 5.0  | Leicht erhöht                | GPS leicht beeinträchtigt  |
| > 5.0      | Erhöht / Sturm               | GPS unzuverlässig          |

### CORS-Problem und Lösungsstrategien

Da die GFZ-API keine CORS-Header sendet, schlägt `fetch()` direkt aus dem Browser fehl. SkyCheck verwendet eine 3-stufige Fallback-Kette:

```
1. Direkt (schlägt in Browsern fehl, klappt in Node.js/Server)
2. /.netlify/functions/gfz  (eigene Serverless-Function als Proxy)
3. https://api.allorigins.win/raw?url={encoded_url}  (öffentlicher CORS-Proxy, instabil)
```

**Netlify Serverless Function** (`netlify/functions/gfz.js`; der folgende Ausschnitt ist vereinfacht, die echte Function enthält zusätzlich Validierung, Fehlerbehandlung und Caching):
```javascript
exports.handler = async (event) => {
  const { start, end, index } = event.queryStringParameters;
  const url = `https://kp.gfz.de/app/json/?start=${start}&end=${end}&index=${index}&status=nowcast`;
  const r = await fetch(url);
  const data = await r.json();
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data)
  };
};
```

**Typische Zeitfenster in SkyCheck:**
- Letzter Kp3h-Wert: `now − 9h` bis `now`, `index=Kp`
- Letzte 4 × Hp30-Werte: `now − 2.5h` bis `now`, `index=Hp30`

---

## 4. Luftverkehr — Airplanes.live (ADS-B)

**Zweck:** Echtzeit-Flugbewegungen im Umkreis (Transponder-Daten)

**Basis-URL:** `https://api.airplanes.live/v2/point`

**Kein API-Key erforderlich · CORS erlaubt · kostenlos**

### Endpunkt

```
GET https://api.airplanes.live/v2/point/{lat}/{lon}/{radius_nm}
```

| Parameter   | Typ   | Beschreibung                                     |
|-------------|-------|--------------------------------------------------|
| `lat`       | float | Breitengrad (4 Dezimalstellen)                   |
| `lon`       | float | Längengrad (4 Dezimalstellen)                    |
| `radius_nm` | int   | Radius in Nautischen Meilen (SkyCheck: 108 = ~200 km) |

**Antwort:**
```json
{
  "ac": [
    {
      "hex":      "3c6581",
      "flight":   "DLH123 ",
      "lat":      48.12,
      "lon":      11.45,
      "alt_baro": 8500,
      "alt_geom": 8600,
      "gs":       420.5,
      "track":    275.0,
      "category": "A3"
    }
  ]
}
```

**Wichtige Felder und Umrechnungen:**

| Rohfeld    | Einheit        | Umrechnung für SkyCheck  |
|------------|----------------|--------------------------|
| `alt_baro` | Fuß oder `"ground"` | `× 0.3048` → Meter  |
| `alt_geom` | Fuß            | `× 0.3048` → Meter       |
| `gs`       | Knoten         | `× 1.852` → km/h         |
| `track`    | Grad (0–360)   | Kurs direkt verwendbar   |
| `category` | ICAO-Kategorie | `A7` / `B*` = Hubschrauber |

**Höhenfarben in SkyCheck:**
- `<= 0 m` (Boden): grau
- `1–300 m` (Risikobereich): rot
- `300–1000 m`: orange
- `> 1000 m`: cyan

**Caching:** SkyCheck cached die Antwort 60 Sekunden und ruft die API erst neu ab, wenn der Standort sich um mehr als 2 km verschoben hat.

---

## 5. Luftraumzonen — DiPUL WMS (uas-betrieb.de)

**Zweck:** Gesetzliche Drohnen-Flugbeschränkungszonen in Deutschland (§ 21h LuftVO)

**Basis-URL:** `https://uas-betrieb.de/geoservices/dipul/wms`

**Kein API-Key erforderlich · CORS erlaubt · offiziell (LBA-Daten)**

### Endpunkt: WMS GetFeatureInfo

```
GET https://uas-betrieb.de/geoservices/dipul/wms
  ?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo
  &QUERY_LAYERS={layer_liste}&LAYERS={layer_liste}
  &CRS=EPSG:4326&BBOX={lat-δ},{lon-δ},{lat+δ},{lon+δ}
  &WIDTH=101&HEIGHT=101&I=50&J=50
  &INFO_FORMAT=text/html&FEATURE_COUNT=50
  &FORMAT=image/png&TRANSPARENT=true
```

**Wichtige Parameter:**

| Parameter      | Beschreibung                                                  |
|----------------|---------------------------------------------------------------|
| `BBOX`         | Bounding Box: `lat−0.01,lon−0.01,lat+0.01,lon+0.01` (~1 km) |
| `I=50, J=50`   | Pixelkoordinate = Mittelpunkt des 101×101-Rasters             |
| `FEATURE_COUNT`| Max. zurückgegebene Zonen                                     |
| `QUERY_LAYERS` | Komma-getrennte Layer-Liste (siehe unten)                     |

**Antwort:** HTML mit `<table class="featureInfo">` — wird per DOMParser geparst.

**Relevante HTML-Felder:**

| Feldname                 | Bedeutung            |
|--------------------------|----------------------|
| `name` / `bezeichnung`   | Zonenname            |
| `type_code` / `geozone_art` | Zonentyp          |
| `lower_limit_altitude`   | Untere Grenze        |
| `upper_limit_altitude`   | Obere Grenze         |
| `legal_ref`              | Rechtsgrundlage      |
| `external_reference`     | Externe ID           |

**Wichtigste Layer (Auswahl):**

```
flugbeschraenkungsgebiete   – Flugverbotszonen (§ 21h)
flughaefen                  – Kontrollzone um Flughäfen
kontrollzonen               – CTR
nationalparks               – Naturschutzgebiete
naturschutzgebiete          – NSG
temporaere_betriebseinschraenkungen – Aktuelle TEBs
flugplaetze                 – Segelflugplätze etc.
industrieanlagen            – Industrieanlagen
kraftwerke                  – Kraftwerke
```

**Vollständige Layer-Liste:** 33 Layer insgesamt (in `DIPUL_ALL_LAYERS` in skycheck.html).

### WMS GetMap (Kartendarstellung)

```
L.tileLayer.wms('https://uas-betrieb.de/geoservices/dipul/wms', {
  layers: layer_liste,
  format: 'image/png',
  transparent: true,
  version: '1.3.0',
  crs: L.CRS.EPSG4326
})
```

---

## 6. Kp-Index Fallback — NOAA SWPC

**Zweck:** Fallback wenn GFZ Potsdam nicht erreichbar

**Basis-URL:** `https://services.swpc.noaa.gov`

**Kein API-Key erforderlich · CORS erlaubt · kostenlos**

### Endpunkt

```
GET https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
```

**Antwort (Array):**
```json
[
  ["time_tag", "Kp", "Kp_fraction", "a_running", "station_count"],
  ["2026-04-04 09:00:00", "2.33", "2.333", "7", "13"],
  ["2026-04-04 12:00:00", "3.00", "3.000", "15", "13"]
]
```

**Hinweis:** Erster Eintrag ist Header-Zeile. Letzter Eintrag = aktuellster Wert. Feld `Kp` (Index 1) oder `last[1]` verwenden.

---

## 7. Kartenhintergrund — OpenStreetMap-Kacheln (Leaflet)

**Zweck:** Kartenhintergrund für die Drohnen-Karte. Der Stil „Dark“ nutzt dieselben OSM-Kacheln, die per CSS-Filter invertiert werden (Klasse `.tiles-dark`); CARTO (`basemaps.cartocdn.com`) wurde in v26.08.116.1 entfernt, weil es ohne API-Key nur noch Kacheln mit Wasserzeichen lieferte. Der dritte Stil „Satellit“ nutzt Esri World Imagery.

```javascript
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap',
  subdomains: 'abc',
  maxZoom: 19,
  className: 'tiles-dark'   // nur beim Stil „Dark“: CSS-Filter invertiert die Kacheln
})
```

**Kein API-Key erforderlich · es gilt die [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) von OpenStreetMap (Fair Use)**

---

## 8. Luftraumzonen Luxemburg, Norwegen, Estland — `zones-ed269` (SkyCheck-Netlify-Function)

**Zweck:** Amtliche UAS-Geozonen (EU-Format ED-269) für **Luxemburg** (`lu`), **Norwegen** (`no`) und **Estland** (`ee`). Die Function liest die Snapshots `data/uas-zones-<cc>.json`, die wöchentlich per GitHub Action aktualisiert werden (Quellen: DAC Luxemburg CC0, Luftfartstilsynet / dronesoner.no NLOD 2.0, EANS).

**Basis-URL:** `/.netlify/functions/zones-ed269` (Same-Origin; Antwort mit `Access-Control-Allow-Origin: *` bei HTTP 200)

**Kein API-Key erforderlich · kostenlos · Antwort im JSON-Format**

### Endpunkt

```
GET /.netlify/functions/zones-ed269?country={lu|no|ee}&lat={lat}&lon={lon}&radius={m}&lang={xx}
GET /.netlify/functions/zones-ed269?country={lu|no|ee}&all=1
```

**Parameter:**

| Parameter | Pflicht | Beschreibung |
|-----------|---------|--------------|
| `country` | ja      | `lu`, `no` oder `ee`; alles andere → HTTP 400 |
| `lat`     | ja (Punktabfrage) | Breitengrad, −90 … 90 |
| `lon`     | ja (Punktabfrage) | Längengrad, −180 … 180 |
| `radius`  | nein    | Suchradius in Metern, auf 1 … 5000 begrenzt; Standard 100 (auch bei ungültigem Wert) |
| `lang`    | nein    | Zweibuchstabiges Sprachkürzel für die Beschreibung (`desc`); Standard `en`, Rückfall auf Englisch bzw. Originaltext |
| `all`     | nein    | `1` oder `true`: alle Zonen des Landes statt Punktabfrage (für das Kartenoverlay); `lat`/`lon` entfallen |

**Trefferlogik:** Eine Zone trifft, wenn der Punkt in einem ihrer Polygone liegt oder ein Polygonrand bzw. kreisförmiger Bereich innerhalb des Suchradius liegt (exakter Flächentest, kein reiner Bounding-Box-Filter). Es werden höchstens **50 Treffer** zurückgegeben. Die Sortierung ist: einschränkende Zonen zuerst (auch `NO_RESTRICTION`), dann inaktive (`inactive: true`).

**Antwort (Punktabfrage, gekürzt):**

```json
{
  "country": "LU",
  "zones": [
    {
      "name": "Beispielzone",
      "type": "PROHIBITED",
      "lower": "GND",
      "upper": "120 m AGL",
      "legal": "Beispielbehörde",
      "legalUrl": "https://example.org/",
      "desc": "Beispielbeschreibung",
      "color": "#ef4444",
      "geometry": [
        { "type": "Polygon", "coordinates": [[[6.10, 49.60], [6.11, 49.60], [6.11, 49.61], [6.10, 49.60]]] }
      ]
    }
  ]
}
```

**Felder einer Zone:**

| Feld       | Bedeutung |
|------------|-----------|
| `name`     | Zonenname |
| `type`     | Einschränkungsart: `PROHIBITED`, `REQ_AUTHORISATION`, `CONDITIONAL`, `NO_RESTRICTION`, `TEMPORARY_INACTIVE` (inaktive Zone) oder `UAS_ZONE` (unbekannte Art). `NO_RESTRICTION`-Zonen sind gewöhnliche Zonen (blau, gelbe Ampel), weil z. B. Estland den Wert auch für genehmigungspflichtige Gebiete verwendet |
| `lower`, `upper` | Untere/obere Grenze, z. B. `GND` oder `120 m AGL` |
| `legal`, `legalUrl` | Zuständige Behörde und Link (leer, wenn kein gültiger `http(s)`-Link vorliegt) |
| `desc`     | Beschreibung in der angeforderten Sprache |
| `color`    | Anzeigefarbe: `PROHIBITED` `#ef4444`, `REQ_AUTHORISATION` `#f59e0b`, `CONDITIONAL` `#f97316`, `NO_RESTRICTION` `#3b82f6` (blau), sonst `#64748b` |
| `geometry` | Array aus `{type:"Polygon", coordinates}` oder `{type:"Circle", center:[lon,lat], radius}` (Meter); Koordinaten immer `[lon, lat]` |
| `inactive` | Nur vorhanden, wenn `true`: Alle Aktivierungsfenster der Zone sind abgelaufen. Die Zone bleibt sichtbar, `desc` beginnt dann mit „Activation window ended <YYYY-MM-DD>. May be reactivated — check the official source.“ und die Ampel wird gelb statt rot; Banner und Karten-Panel kennzeichnen die Zone als „derzeit inaktiv“ |

**Antwort mit `all=1`:** `{ "country": "LU", "all": true, "zones": [...] }`. Jede Zone enthält hier nur `name`, `type`, `color`, `geometry` sowie ggf. `inactive`.

**Caching:** Punktabfrage 300 s (`Cache-Control: public, max-age=300`), `all=1` 3600 s.

**Fehlercodes:**

| HTTP | Body (Text) | Ursache |
|------|-------------|---------|
| 400  | `Unknown country` | `country` fehlt oder ist nicht `lu`/`no`/`ee` |
| 400  | `Missing or invalid lat/lon` | Punktabfrage ohne gültige Koordinaten |
| 500  | `Data file unavailable` | Snapshot `data/uas-zones-<cc>.json` fehlt oder ist nicht lesbar |

---

## 9. Norwegische NOTAM-Sperrgebiete — `notam-no` (SkyCheck-Netlify-Function)

**Zweck:** Befristete NOTAM-Sperrgebiete für Norwegen als Live-Proxy für `dronesoner.no`. Diese Zonen sind **nicht** im Snapshot enthalten. Der Proxy existiert, weil der Upstream keinen CORS-Header sendet. Die Function wird bewusst nur auf **Nutzerklick** aufgerufen („NOTAM-Sperrgebiete laden“).

**Upstream:** `https://dronesoner.no/data/forbud_notam.geojson` (Luftfartstilsynet, NLOD 2.0)

**Basis-URL:** `/.netlify/functions/notam-no` (Same-Origin; Antwort mit `Access-Control-Allow-Origin: *`)

**Kein API-Key erforderlich · kostenlos**

### Endpunkt

```
GET /.netlify/functions/notam-no
```

**Keine Parameter.** Der Upstream-Abruf hat einen Timeout von 8 s. Erfolgreiche Antworten werden 300 s gecacht, Fehlerantworten nicht (`no-store`).

**Antwort (gekürzt):**

```json
{
  "country": "NO",
  "fetchedAt": "2026-10-09T10:00:00.000Z",
  "zones": [
    {
      "name": "Beispiel-NOTAM",
      "type": "PROHIBITED",
      "lower": "0",
      "upper": "120",
      "legal": "NOTAM",
      "legalUrl": "https://dronesoner.no/",
      "desc": "Beispielbemerkung",
      "color": "#ef4444",
      "geometry": [
        { "type": "Polygon", "coordinates": [[[10.70, 59.90], [10.72, 59.90], [10.72, 59.92], [10.70, 59.90]]] }
      ],
      "notam": true
    }
  ]
}
```

**Hinweise:**
- `fetchedAt` ist der Zeitpunkt des Abrufs (ISO 8601, UTC). Die Client-App zeigt ihn auf dem Knopf an und wertet geladene Daten 5 Minuten lang für die Ampel aus.
- Jede Zone trägt `notam: true`. Alle Zonen sind `PROHIBITED` und rot.
- Nur Features mit `Polygon` oder `MultiPolygon` werden übernommen; andere Geometrien werden verworfen.

**Fehlercodes:** Alle Fehler kommen als **HTTP 502** mit JSON `{ "error": "…" }`:

| `error` | Ursache |
|---------|---------|
| `Upstream HTTP <Status>` | dronesoner.no antwortet mit Fehlercode |
| `Upstream timeout` | Keine Antwort innerhalb von 8 s |
| `Upstream unreachable` | Verbindungsfehler |
| `Upstream returned invalid JSON` | Upstream-Antwort ist kein gültiges JSON |
| `Upstream returned no feature list` | JSON ohne `features`-Liste |

---

## Gesamtübersicht

| Dienst          | URL-Basis                              | CORS | Auth | Limit     |
|-----------------|----------------------------------------|------|------|-----------|
| Photon (Komoot) | `photon.komoot.io`                     | ✅   | –    | Fair Use  |
| DWD BrightSky   | `api.brightsky.dev/weather`            | ✅   | –    | kostenlos |
| GFZ Potsdam Kp  | `kp.gfz.de/app/json/`                  | ❌   | –    | kostenlos |
| NOAA SWPC       | `services.swpc.noaa.gov`               | ✅   | –    | kostenlos |
| Airplanes.live  | `api.airplanes.live/v2/point`          | ✅   | –    | kostenlos |
| DiPUL WMS       | `uas-betrieb.de/geoservices/dipul/wms` | ✅   | –    | kostenlos |
| OSM-Kacheln     | `{s}.tile.openstreetmap.org`           | ✅   | –    | Fair Use (Tile Usage Policy) |
| Esri Satellit   | `server.arcgisonline.com`              | ✅   | –    | kostenlos (Attribution) |
| AWC (METAR/TAF) | `aviationweather.gov/api/data` — über die Function `/.netlify/functions/awc` | ✅ (über die Function) | – | kostenlos; Function mit 10 s Timeout, 90 s Cache |
| Open-Meteo Höhe | `api.open-meteo.com/v1/elevation`      | ✅   | –    | kostenlos |
| Terrain-Kacheln (AWS) | `s3.amazonaws.com/elevation-tiles-prod/terrarium` | ✅   | –    | kostenlos |
| DiPUL WFS       | `uas-betrieb.de/geoservices/dipul/wfs` | ✅   | –    | kostenlos |
| zones-ed269 (LU/NO/EE) | `/.netlify/functions/zones-ed269` | ✅   | –    | eigene Function |
| notam-no (NO)  | `/.netlify/functions/notam-no`         | ✅   | –    | eigene Function, nur auf Klick |
| geo.admin.ch (CH) | `api3.geo.admin.ch/rest/services/all/MapServer/identify` (Punktabfrage), `wms.geo.admin.ch` (Karten-Overlay) | ✅ | – | kostenlos |
| ENAIRE servAIS (ES) | `servais.enaire.es/insignia/…/SRV_UAS_ZG_V0/MapServer` (Identify + WMS) | ✅ | – | kostenlos |
| EASA Common Repository (DK/IE/NL/PT/ES-EASA) | `services-eu1.arcgis.com` (ArcGIS FeatureServer) | ✅ | – | kostenlos |
| DFS UTM Wetter | `utm-service.dfs.de/api/weather/v1/weather` (POST, Höhenwetter; Best-Effort) | ✅ (direkter Browser-Aufruf) | – | kostenlos |
| zones-fr (FR)  | `/.netlify/functions/zones-fr`         | ✅   | –    | eigene Function |
| zones-at (AT)  | `/.netlify/functions/zones-at`         | ✅   | –    | eigene Function |

---

## Proxy-Lösung für GFZ (CORS-Problem)

Da `kp.gfz.de` keinen `Access-Control-Allow-Origin`-Header sendet, ist ein serverseitiger Proxy nötig. Empfohlene Lösungen nach Zuverlässigkeit:

1. **Eigene Netlify/Vercel/Cloudflare Function** — zuverlässigste Lösung, kein Drittanbieter
2. **Node.js / Python Backend** — direkter Abruf server-seitig möglich
3. **allorigins.win** (`https://api.allorigins.win/raw?url=…`) — kostenloser CORS-Proxy, instabil
4. **corsproxy.io** (`https://corsproxy.io/?…`) — nur auf localhost, blockiert auf Produktions-Domains

---

*Dokumentation erstellt aus SkyCheck v26.10.117.1 · Oktober 2026*
