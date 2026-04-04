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

**Netlify Serverless Function** (`netlify/functions/gfz.js`):
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

## 7. Kartenhintergrund — CartoDB (Leaflet)

**Zweck:** Dunkler Kartenhintergrund für die Drohnen-Karte

```javascript
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '© CartoDB',
  subdomains: 'abcd',
  maxZoom: 19
})
```

**Kein API-Key erforderlich · kostenlos bis 75.000 Aufrufe/Monat**

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
| CartoDB Tiles   | `basemaps.cartocdn.com`                | ✅   | –    | 75k/Monat |

---

## Proxy-Lösung für GFZ (CORS-Problem)

Da `kp.gfz.de` keinen `Access-Control-Allow-Origin`-Header sendet, ist ein serverseitiger Proxy nötig. Empfohlene Lösungen nach Zuverlässigkeit:

1. **Eigene Netlify/Vercel/Cloudflare Function** — zuverlässigste Lösung, kein Drittanbieter
2. **Node.js / Python Backend** — direkter Abruf server-seitig möglich
3. **allorigins.win** (`https://api.allorigins.win/raw?url=…`) — kostenloser CORS-Proxy, instabil
4. **corsproxy.io** (`https://corsproxy.io/?…`) — nur auf localhost, blockiert auf Produktions-Domains

---

*Dokumentation erstellt aus SkyCheck v0.15 Quellcode · April 2026*
