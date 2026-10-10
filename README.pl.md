**🌍 Język:** [English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Polski**

---

# SkyCheck — Sprawdzenie lotu dronem (DE · FR · AT · CH · ES · DK · IE · NL · PT · LU · NO · EE · SE · BE)

**SkyCheck** to bezpłatna aplikacja webowa typu single-page do szybkiego wstępnego sprawdzenia warunków lotu dronem. Agreguje dane w czasie rzeczywistym z kilku oficjalnych źródeł i wydaje natychmiastową rekomendację lotu. Nasze zastosowania: pomiary, inspekcje, filmy wizerunkowe, produkcje TV i filmowe oraz szkolenia na świadectwo kompetencji A2/STS w [www.multikopterschule.de](https://www.multikopterschule.de).

> 🔒 **Prywatność na pierwszym miejscu · działa w przeglądarce · nic do instalowania.**
> SkyCheck nie zbiera żadnych danych, nie stosuje żadnego śledzenia i nie wymaga konta ani rejestracji — nie może Cię szpiegować, bo nie istnieje żaden backend, który cokolwiek przechowuje. Wszystko działa bezpośrednio w Twojej przeglądarce; dane, które widzisz, są ładowane na żywo i znikają w chwili, gdy zamkniesz kartę. Nie ma też nic do instalowania: „dodanie do ekranu głównego" (jako PWA) tworzy jedynie skrót otwierający tę stronę internetową — w istocie zakładkę z ikoną. Nie jest pobierany żaden pakiet aplikacji, nie są przyznawane żadne uprawnienia, nie działa żaden proces w tle.

Pogoda, ruch lotniczy, METAR/TAF, indeks Kp i geokodowanie są identyczne wszędzie; tylko **źródło geostref** jest specyficzne dla kraju i wybierane automatycznie na podstawie nazwy hosta.

## 🌐 Wersje live

| Kraj | Aplikacja live | Źródło geostref |
|---|---|---|
| 🇩🇪 **Niemcy** | [skycheck-de.netlify.app](https://skycheck-de.netlify.app/) | DiPUL WMS — `uas-betrieb.de` |
| 🇫🇷 **Francja** | [skycheck-fr.netlify.app](https://skycheck-fr.netlify.app/) | zbiór danych ED-269 (francuskie strefy UAS) |
| 🇦🇹 **Austria** | [skycheck-at.netlify.app](https://skycheck-at.netlify.app/) | Austro Control ED-269 — auto-aktualizacja co miesiąc |
| 🇨🇭 **Szwajcaria** | [skycheck-ch.netlify.app](https://skycheck-ch.netlify.app/) | BAZL / geo.admin.ch — WMS + Identify API |
| 🇪🇸 **Hiszpania** | [skycheck-es.netlify.app](https://skycheck-es.netlify.app/) | EASA Common Repository (wektor) **lub** ENAIRE servAIS (WMS) — przełączane na ekranie startowym, domyślnie EASA |
| 🇩🇰 **Dania** | [skycheck-dk.netlify.app](https://skycheck-dk.netlify.app/) | Trafikstyrelsen — ArcGIS FeatureServer (wektor) |
| 🇮🇪 **Irlandia** | [skycheck-ie.netlify.app](https://skycheck-ie.netlify.app/) | EASA Common Repository — ArcGIS (wektor, wstępne) |
| 🇳🇱 **Holandia** | [skycheck-nl.netlify.app](https://skycheck-nl.netlify.app/) | EASA Common Repository — ArcGIS (wektor, ED-318) |
| 🇵🇹 **Portugalia** | [skycheck-pt.netlify.app](https://skycheck-pt.netlify.app/) | EASA Common Repository — ArcGIS (wektor) |
| 🇱🇺 **Luksemburg** | [skycheck-lu.netlify.app](https://skycheck-lu.netlify.app/) | DAC Luksemburg — migawka ED-269 (aktualizowana co tydzień) |
| 🇳🇴 **Norwegia** | [skycheck-no.netlify.app](https://skycheck-no.netlify.app/) | Luftfartstilsynet / dronesoner.no — migawka ED-269 (aktualizowana co tydzień); strefy NOTAM po kliknięciu |
| 🇪🇪 **Estonia** | [skycheck-ee.netlify.app](https://skycheck-ee.netlify.app/) | EANS (utm.eans.ee) — migawka ED-269 (aktualizowana co tydzień); strefy tymczasowe mogą mieć do 7 dni |
| 🇸🇪 **Szwecja** | [skycheck-se.netlify.app](https://skycheck-se.netlify.app/) | LFV / Transportstyrelsen (daim.lfv.se, CC BY 4.0) — migawka ED-269 (aktualizowana co tydzień); obszary NOTAM i AIP SUP po kliknięciu |
| 🇧🇪 **Belgia** | [skycheck-be.netlify.app](https://skycheck-be.netlify.app/) | BCAA / skeyes Droneguide (map.droneguide.be) — migawka ED-269 (aktualizowana co tydzień); strefy NOTAM i tymczasowe strefy zakazu lotów po kliknięciu; informacja BCAA stale widoczna pod listą stref |

> Wszystkie czternaście to **to samo** wdrożenie pliku `skycheck.html` z tego repozytorium, każde serwowane na własnej witrynie Netlify. Wykrywanie kraju: nazwa hosta (`skycheck-<xx>.netlify.app`) lub parametr URL `?country=de|fr|at|ch|es|dk|ie|nl|pt|lu|no|ee|se|be`. Domyślnie: `de`. Każdy wariant krajowy dodatkowo ustawia wstępnie **język interfejsu**, **wskazówkę wyszukiwania z punktem orientacyjnym stolicy** oraz **wyszukiwanie adresów ograniczone do danego kraju**.

📦 **Aktualna wersja:** v26.10.118.1

---

## Funkcje

| Obszar | Szczegóły |
|---|---|
| **Rekomendacja lotu** | System sygnalizacji świetlnej (Go / Ostrzeżenie / No-Go) oparty na wietrze, porywach, opadach i indeksie Kp |
| **Pogoda** | Porywy wiatru, prędkość i kierunek wiatru, temperatura, punkt rosy, widzialność, zachmurzenie, opady — dane DWD via BrightSky |
| **METAR / TAF** | Dane meteorologiczne lotnicze w czasie rzeczywistym z pobliskich lotnisk (NOAA Aviation Weather Center), z kategorią lotu VFR / MVFR / IFR / LIFR |
| **Profil wiatru** | Ekstrapolacja prędkości wiatru wg wysokości (10 / 60 / 120 / 150 m AGL) prawem potęgowym |
| **Indeks Kp** | Aktualny Kp z NOAA + wykres słupkowy Hp30 z GFZ Potsdam (ostatnie 4 × 30 min + prognoza) |
| **Ruch lotniczy** | Ruch ADS-B w czasie rzeczywistym w okolicy z kolorami wysokości i ikonami radaru (Airplanes.live) |
| **Widok alarmu samolotów** | Pełnoekranowa mapa z dźwiękowym alarmem: sygnalizuje zbliżające się statki powietrzne w ustawianym promieniu |
| **Mapa przestrzeni powietrznej** | Specyficzne dla kraju geostrefy dla dronów (DE: DiPUL · FR/AT: ED-269 · CH: geo.admin.ch · ES: ENAIRE · DK/IE: ArcGIS) — strefy zakazu lotów, strefy kontrolowane, rezerwaty przyrody; promień wyszukiwania przełączalny między 5 m a 100 m |
| **Prognoza 48 h** | Prognoza godzinowa na 2 dni (przewijalna, sygnalizator lotu dla każdej godziny) |
| **Przegląd 5-dniowy** | Widok dzienny z temp. min/maks., wiatrem i oceną w kolorach |
| **Wskazówki i ostrzeżenia** | Ostrzeżenia kontekstowe (zakłócenie GPS przy wysokim Kp, wzmożony ruch lotniczy, uzasadnienie no-fly) |
| **5 języków** | Niemiecki, angielski, francuski, hiszpański, polski — przełączane na stronie startowej |
| **PWA** | Instalowalne jako aplikacja webowa (baner instalacji z 30-dniowym cooldownem), działa offline dla treści statycznych |

---

## Technologia

- **Single-file HTML/JS/CSS** — bez narzędzi build, bez zależności, bez frameworka
- **Leaflet.js** do interaktywnej mapy
- **Service Worker** (`sw.js`) + **Web App Manifest** (`manifest.json`) dla wsparcia PWA
- **Netlify** do hostingu i funkcji serverless (proxy CORS)

---

## Źródła danych

| Źródło | Dane | CORS |
|---|---|---|
| [DWD BrightSky](https://brightsky.dev/) | Dane pogodowe (godzinowo, 7 dni) | ✅ |
| [NOAA Aviation Weather Center](https://aviationweather.gov/) | METAR / TAF | ❌ → Netlify Function `awc.js` |
| [GFZ Potsdam](https://kp.gfz.de/) | Indeks Kp, Hp30 (rozdzielczość 30 min) | ❌ → Netlify Function `gfz.js` |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Zapasowy indeks Kp | ✅ |
| [Airplanes.live](https://airplanes.live/) | Ruch ADS-B | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geokodowanie / wyszukiwanie miejsc | ✅ |
| [Windy.com](https://www.windy.com/) | Link zewnętrzny do szczegółowego widoku zachmurzenia | — |
| **Geostrefy 🇩🇪** [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Strefy przestrzeni powietrznej dla dronów (WMS + GetFeatureInfo) | ✅ |
| **Geostrefy 🇫🇷** zbiór danych ED-269 | francuskie strefy UAS (`data/uas-zones-fr.json`) | via `zones-fr.js` |
| **Geostrefy 🇦🇹** [Austro Control / dronespace.at](https://www.dronespace.at/) | austriackie strefy UAS, ED-269 (`data/uas-zones-at.json`) | via `zones-at.js` |
| **Geostrefy 🇨🇭** [BAZL / geo.admin.ch](https://www.geo.admin.ch/) | szwajcarskie strefy UAS `ch.bazl.einschraenkungen-drohnen` (WMS + Identify) | ✅ |
| **Geostrefy 🇪🇸** [ENAIRE servAIS](https://www.enaire.es/) / [EASA Common Repository](https://www.easa.europa.eu/) | hiszpańskie strefy UAS — ENAIRE `SRV_UAS_ZG_V0` (WMS + ArcGIS Identify) **lub** EASA `geozone_EASA` (wektor ArcGIS, oparty na widocznym obszarze); przełączane, domyślnie EASA | ✅ |
| **Geostrefy 🇩🇰** [Trafikstyrelsen](https://www.droneregler.dk/) | duńskie strefy UAS (ArcGIS FeatureServer, GeoJSON) | ✅ |
| **Geostrefy 🇮🇪** [EASA Common Repository](https://www.easa.europa.eu/) | irlandzkie strefy UAS `ie_geozones` (ArcGIS, ED-318, wstępne) | ✅ |
| **Geostrefy 🇳🇱** [EASA Common Repository](https://www.easa.europa.eu/) | holenderskie strefy UAS `Netherlands_ED318` (wektor ArcGIS, ED-318, ~162 stref) | ✅ |
| **Geostrefy 🇵🇹** [EASA Common Repository](https://www.easa.europa.eu/) / [ANAC](https://www.voanaeuropa.eu/) | portugalskie strefy UAS `Portugal_Geo_Zones_Polygons` (wektor ArcGIS, ~314 stref; schemat pochodzący z KML) | ✅ |
| **Geostrefy 🇱🇺** [DAC Luksemburg](https://drones.geoportail.lu/) | Luksemburskie strefy UAS, migawka ED-269 (`data/uas-zones-lu.json`, 43 strefy; licencja CC0) | via `zones-ed269.js` |
| **Geostrefy 🇳🇴** [Luftfartstilsynet / dronesoner.no](https://dronesoner.no/) | Norweskie strefy UAS, migawka ED-269 (`data/uas-zones-no.json`, 1390 stref; licencja NLOD 2.0); czasowe strefy NOTAM ładowane po kliknięciu (`notam-no.js`) | via `zones-ed269.js` |
| **Geostrefy 🇪🇪** [EANS](https://utm.eans.ee/) | Estońskie strefy UAS, migawka ED-269 (`data/uas-zones-ee.json`, 241 stref; licencja: nie podana przez wydawcę); strefy tymczasowe mogą mieć do 7 dni | via `zones-ed269.js` |
| **Geostrefy 🇸🇪** [LFV / Transportstyrelsen](https://dronechart.lfv.se/) | Szwedzkie strefy UAS, migawka ED-269 (`data/uas-zones-se.json`, 390 stref; licencja CC BY 4.0), złożona z siedmiu warstw WFS LFV i pliku stref ED-318 Transportstyrelsen; obszary NOTAM i AIP SUP ładowane po kliknięciu (`notam-se.js`) | via `zones-ed269.js` |
| **Geostrefy 🇧🇪** [BCAA / skeyes Droneguide](https://map.droneguide.be/) | Belgijskie strefy UAS, migawka ED-269 (`data/uas-zones-be.json`, 582 strefy; licencja: nie podana przez wydawcę); strefy z dolną granicą powyżej 120 m AGL są pomijane, tak jak w domyślnym widoku oficjalnej mapy; ponowne wykorzystanie zgodnie z udokumentowaną odpowiedzią BCAA (sygn. G26-187 z 2026-09-16), z czterema informacjami stale wyświetlanymi pod listą stref; strefy NOTAM i tymczasowe strefy zakazu lotów ładowane po kliknięciu (`notam-be.js`) | via `zones-ed269.js` |

---

## Architektura

```
skycheck.html               ← cała aplikacja (HTML + CSS + JS, ~9,4k linii)
coordinates.html            ← strona współrzędnych GPS2UTM: GPS → ETRS89/UTM, Gauss-Krüger, DHHN2016
coordinate-tools.js         ← silnik obliczeń do tej strony (UTM, przybliżenie Gaussa-Krügera, geoida GCG2016)
ctr-hoehenregeln.html       ← strona informacyjna: zasady wysokości w CTR DFS/DAS (NfL 2026-1-3960/-3981), przekrój i galeria lotnisk
img/                        ← obrazy WebP dla tej strony (instrukcja siatki wysokości + galeria lotnisk)
manifest.json               ← manifest Web App PWA
sw.js                       ← service worker (caching)
icon-192x192.png            ← app icon (small)
icon-512x512.png            ← app icon (large)
skycheck-icon.svg           ← source icon (vector)
netlify.toml                ← Netlify config (function bundle includes + root URL rewrite)
netlify/
  functions/
    awc.js                  ← NOAA AWC proxy for METAR/TAF (CORS workaround)
    gfz.js                  ← GFZ Potsdam proxy for Kp-index/Hp30
    zones-fr.js             ← France UAS zones (reads spatial 2° tiles, bbox-filtered)
    zones-at.js             ← Austria UAS zones (reads data/uas-zones-at.json; ?all=1 = full overlay)
    zones-ed269.js          ← LU/NO/EE/SE/BE UAS zones (reads data/uas-zones-<cc>.json; exact area test; ?all=1 = full overlay)
    notam-no.js             ← Norway: live proxy for temporary NOTAM restriction areas (dronesoner.no, on click only)
    notam-se.js             ← Sweden: live proxy for NOTAM and AIP SUP restriction areas (LFV, on click only)
    notam-be.js             ← Belgium: live proxy for NOTAM zones and temporary no-fly zones (Droneguide, on click only)
data/
  uas-zones-fr.json         ← ED-269 France UAS zones (monthly snapshot, replaceable)
  fr-zones-tiles/           ← generated spatial index for the Netlify function
  context/fr/               ← bundled viewport tiles for the four France context layers
  uas-zones-at.json         ← ED-269 Austria UAS zones (ok. 290 zones, auto-updated)
  uas-zones-at.version      ← marker of the last imported Austro Control release (idempotency)
  uas-zones-{lu,no,ee,se,be}.json ← ED-269 Luxembourg / Norway / Estonia / Sweden / Belgium UAS zones (weekly snapshots)
  uas-zones-{lu,no,ee,se,be}.version ← znaczniki ostatnio zaimportowanego snapshotu dla każdego kraju (idempotencja)
  dipul-airac/              ← extracted DiPUL AIRAC air-traffic layers (weekly check)
  <cc>-protected.json       ← kontekst: obszary chronione (OSM, ODbL) — cc ∈ at,ch,es,dk,ie,fr
  <cc>-motorways.json       ← kontekst: autostrady (OSM, ODbL)
  <cc>-powerlines.json      ← kontekst: linie wysokiego napięcia (OSM, ODbL)
  <cc>-rail.json            ← kontekst: główne linie kolejowe (OSM, ODbL)
  gcg2016v2023-cm.i16       ← kompaktowa siatka quasi-geoidy GCG2016 (Int16, cm) dla strony współrzędnych
scripts/
  build-eu-zones.mjs        ← builds the LU/NO/EE/SE/BE ED-269 snapshots from the official sources
  gen-context.mjs           ← generator wielokrotnego użytku: Overpass → uproszczony GeoJSON (linie + wielokąty)
  fetch-context.sh          ← solidny sterownik: pobieranie curl (ponawianie) + gen-context dla każdej warstwy, idempotentny
  build-fr-spatial-data.mjs ← tworzy kafle przestrzenne 2° dla Francji (indeks stref + warstwy kontekstowe)
  build-gcg-web-grid.mjs    ← konwertuje oficjalny GeoTIFF GCG2016 na kompaktową siatkę webową
  README.md                 ← jak dodać warstwy kontekstowe dla nowego kraju
  test-coordinate-tools.cjs ← test Node dla coordinate-tools.js (`node scripts/test-coordinate-tools.cjs`)
tests/                      ← Node tests (`node --test "tests/*.test.mjs"`)
.github/
  workflows/
    update-at-zones.yml     ← monthly job: fetch newest Austro Control ED-269 → commit data file
    update-eu-zones.yml     ← weekly job (Mondays): refresh the LU/NO/EE/SE/BE ED-269 snapshots → commit data files
    update-de-airac.yml     ← weekly job: check the Mobilithek AIRAC offer → extract the DiPUL air-traffic layers
redirect.html               ← optional redirect page
```

> 🇨🇭 **CH nie potrzebuje żadnego z powyższych** — nakładka mapowa to warstwa WMS geo.admin.ch, a szczegóły stref pochodzą z REST API Identify geo.admin.ch; obie wywoływane bezpośrednio z przeglądarki (CORS-open). Żadnej funkcji Netlify, żadnego hostowanego pliku danych, żadnego workflow aktualizacji.

### Wsparcie wielokrajowe (od v0.73)

SkyCheck używa **wzorca adaptera** dla źródeł geostref specyficznych dla kraju. Kraj jest wykrywany z nazwy hosta (np. `skycheck-ch.netlify.app`) lub parametru URL `?country=de|fr|at|ch|es|dk|ie|nl|pt|lu|no|ee|se|be`. Domyślnie: `de`. Pogoda, ADS-B, METAR/TAF i indeks Kp są globalne; **język interfejsu, punkt orientacyjny wskazówki wyszukiwania oraz bounding box geokodowania** są ustawiane per kraj.

| Kraj | Źródło geostref | Nakładka | Lista szczegółów / status | Dane i aktualizacje |
|---|---|---|---|---|
| 🇩🇪 **DE** (domyślnie) | DiPUL WMS (`uas-betrieb.de`) | kafelki WMS | WMS GetFeatureInfo | serwis live (oficjalny, zawsze aktualny) |
| 🇫🇷 **FR** | zbiór danych ED-269 | poligony/okręgi po stronie klienta | `zones-fr.js` (filtr bbox) | `data/uas-zones-fr.json` (~3,6k stref, wymienialny) |
| 🇦🇹 **AT** | Austro Control ED-269 | wszystkie strefy rysowane po stronie klienta (ok. 290) | `zones-at.js` (filtr bbox) | `data/uas-zones-at.json` — **auto-aktualizowane co miesiąc** przez GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | kafelki WMS | REST API **Identify** geo.admin.ch | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | kafelki WMS | REST API **Identify** ArcGIS | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇩🇰 **DK** | Trafikstyrelsen ArcGIS FeatureServer | wektorowe poligony po stronie klienta (~870, kolorowane) | zapytanie ArcGIS (bbox) | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇮🇪 **IE** | EASA Common Repository `ie_geozones` | wektorowe poligony po stronie klienta (76) | zapytanie ArcGIS (bbox) | serwis live (CORS-open, dane EASA **wstępne**) |
| 🇳🇱 **NL** | EASA Common Repository `Netherlands_ED318` | wektorowe poligony po stronie klienta (~162) | zapytanie ArcGIS (bbox) | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇵🇹 **PT** | EASA Common Repository / ANAC `Portugal_Geo_Zones_Polygons` | wektorowe poligony po stronie klienta (~314) | zapytanie ArcGIS (bbox) | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇱🇺 **LU** | DAC Luksemburg ED-269 | wszystkie strefy rysowane po stronie klienta (43) | `zones-ed269.js` (dokładny test powierzchni) | `data/uas-zones-lu.json` — **auto-aktualizowane co tydzień** przez GitHub Actions (`update-eu-zones.yml`) |
| 🇳🇴 **NO** | Luftfartstilsynet / dronesoner.no ED-269 | wszystkie strefy rysowane po stronie klienta (1390) | `zones-ed269.js` (dokładny test powierzchni) | `data/uas-zones-no.json` — **auto-aktualizowane co tydzień** przez GitHub Actions (`update-eu-zones.yml`); obszary NOTAM na żywo po kliknięciu (`notam-no.js`) |
| 🇪🇪 **EE** | EANS ED-269 | wszystkie strefy rysowane po stronie klienta (241) | `zones-ed269.js` (dokładny test powierzchni) | `data/uas-zones-ee.json` — **auto-aktualizowane co tydzień** przez GitHub Actions (`update-eu-zones.yml`); strefy krótkoterminowe mogą mieć do 7 dni |
| 🇸🇪 **SE** | LFV / Transportstyrelsen ED-269 (CC BY 4.0) | wszystkie strefy rysowane po stronie klienta (390) | `zones-ed269.js` (dokładny test powierzchni) | `data/uas-zones-se.json` — **auto-aktualizowane co tydzień** przez GitHub Actions (`update-eu-zones.yml`); obszary NOTAM i AIP SUP na żywo po kliknięciu (`notam-se.js`) |
| 🇧🇪 **BE** | BCAA / skeyes Droneguide | wszystkie strefy rysowane po stronie klienta (582) | `zones-ed269.js` (dokładny test powierzchni) | `data/uas-zones-be.json` — **auto-aktualizowane co tydzień** przez GitHub Actions (`update-eu-zones.yml`); strefy NOTAM i tymczasowe strefy zakazu lotów na żywo po kliknięciu (`notam-be.js`); informacja pod listą stref |

Trzy style integracji: **WMS + zapytanie punktowe** (DE, CH, ES — oficjalne serwisy live renderują cały kraj i odpowiadają na zapytania punktowe bezpośrednio), **wektor ArcGIS po stronie klienta** (DK, IE, NL, PT — GeoJSON pobierany na żywo z ArcGIS FeatureServera, rysowany jako kolorowane poligony) oraz **hostowany plik ED-269 + funkcja Netlify** (FR, AT, LU, NO, EE, SE, BE — zbiór danych JSON w repozytorium, filtrowany po stronie serwera; AT odświeża się samo co miesiąc, LU/NO/EE/SE/BE co tydzień).

### Ile geostref na kraj?

Liczby stref pobrane bezpośrednio ze źródła live każdego kraju (DE via DiPUL WFS ze wszystkich 31 kategorii; ES via ENAIRE ArcGIS; FR/AT ze zbiorów danych ED-269; CH z GeoJSON geo.admin.ch; DK/IE via ArcGIS FeatureServer; LU/NO/EE/SE/BE z cotygodniowych migawek ED-269 w `data/`), znormalizowane względem powierzchni lądowej:

| Kraj | Geostrefy | Powierzchnia (km²) | Strefy na 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Niemcy** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 Hiszpania | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Szwajcaria | 1 232 | 41 285 | ≈ 30 |
| 🇩🇰 Dania | 870 | 42 952 | ≈ 20 |
| 🇧🇪 Belgia | 582 | 30 689 | ≈ 19 |
| 🇱🇺 Luksemburg | 43 | 2 586 | ≈ 17 |
| 🇫🇷 Francja | 3 642 | 551 695 | ≈ 6,6 |
| 🇪🇪 Estonia | 241 | 45 339 | ≈ 5,3 |
| 🇳🇴 Norwegia | 1 390 | 385 207 | ≈ 3,6 |
| 🇦🇹 Austria | ok. 290 | 83 879 | ≈ 3,4 |
| 🇮🇪 Irlandia\* | 76 | 70 273 | ≈ 1,1 |
| 🇸🇪 Szwecja | 390 | 450 295 | ≈ 0,9 |

\* Liczba dla Irlandii pochodzi z EASA Common Repository, która jest jeszcze **wstępna** (krajowy zbiór danych IAA wymienia ~87) — więc jej liczba jest orientacyjna, nie kompletna.

**Niemcy zdecydowanie się wyróżniają** — około **5,6×** bezwzględna liczba następnego kraju (Hiszpania) i mniej więcej **8×** gęstość stref Hiszpanii/Szwajcarii, **37×** Francji i **73×** Austrii. Powodem jest wyjątkowo drobnoziarniste strefowanie w Niemczech: wyznaczają one strefy dla kategorii, których inne kraje w większości nie obejmują — np. **obiekty przemysłowe (24 482), nieruchomości mieszkalne (10 793), obiekty kolejowe (9 819), rezerwaty przyrody (9 012), a nawet baseny odkryte (6 600)**. (Granularność zliczania różni się między krajowymi zbiorami danych, co samo w sobie jest istotą sprawy: Niemcy obejmują strefami znacznie więcej kategorii przy znacznie drobniejszej rozdzielczości.)

### Podstawa prawna — strefy są publiczne z mocy prawa UE

Zgodnie z **art. 15 ust. 3 rozporządzenia wykonawczego (UE) 2019/947** każde państwo członkowskie, które wyznacza geostrefy UAS, **musi udostępnić te informacje publicznie we wspólnym, jednolitym formacie cyfrowym** — normie EUROCAE **ED-269 / ED-318** — wyraźnie *do celów świadomości geoprzestrzennej*, czyli po to, aby aplikacje i systemy takie jak SkyCheck mogły informować pilotów. **Dyrektywa w sprawie otwartych danych (UE) 2019/1024** dodatkowo traktuje takie dane geoprzestrzenne sektora publicznego jako nadające się do ponownego wykorzystania (dane geoprzestrzenne to kategoria „zbiorów danych o wysokiej wartości"). Krótko mówiąc: prawo wymaga, aby dane były otwarcie dostępne; SkyCheck jedynie wyświetla oficjalne źródło każdego kraju, z podaniem źródła. Dokładne warunki ponownego wykorzystania są ustalane na poziomie krajowym, dlatego poszczególni dostawcy danych są wskazani powyżej.

### Netlify Functions (proxy CORS)

API Aviation Weather i GFZ nie wysyłają nagłówków CORS, dlatego przechodzą przez funkcje Netlify:

- `awc.js` — przekierowuje `aviationweather.gov/api/data/{metar,taf}`, dodaje nagłówki CORS, 10 s timeout, 90 s cache
- `gfz.js` — przekierowuje zapytania do `kp.gfz.de` (Kp, Hp30)

### Ładowanie asynchroniczne

Pogoda, ruch lotniczy, METAR/TAF i indeks Kp są ładowane równolegle. Kafelek GFZ Hp30 doładowuje się asynchronicznie w tle, bez blokowania głównego widoku — strona statusu pojawia się dzięki temu w ~1 sekundę.

### Wykrywanie geostref (DiPUL WMS GetFeatureInfo)

Zapytanie WMS `GetFeatureInfo` używa siatki 101×101 pikseli. Efektywny promień wyszukiwania jest kontrolowany przez rozmiar bounding box `δ`:

```javascript
δ = Math.max(0.001134, radiusM * 101 / (4 * 111320))
```

Pozwala to precyzyjnie skalować promień wyszukiwania między 5 m a 100 m (skalibrowane empirycznie).

---

## Rozwój lokalny

```bash
# Simple HTTP server (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# With Netlify Functions (recommended — otherwise no METAR/TAF/Kp)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888/skycheck.html
```

> **Uwaga:** Bez `netlify dev` kafelki METAR/TAF i GFZ nie działają lokalnie, ponieważ `/.netlify/functions/*` nie jest dostępne. Pogoda, ADS-B i przestrzeń powietrzna działają również z prostym serwerem HTTP.

---

## Rekomendacja lotu — logika oceny

| Kryterium | Ostrzeżenie | No-Go |
|---|---|---|
| Porywy wiatru | > 7 m/s | > 10 m/s |
| Indeks Kp | > 3,3 (GPS osłabiony) | > 5,0 (GPS niewiarygodny) |
| Opady | > 0 mm | > 0,3 mm |
| Geostrefa | bez ograniczeń, strefa buforowa przyrody | aktywna strefa zakazu |

---

## Historia wersji (wybrane)

| Wersja | Zmiana |
|---|---|
| v26.10.118.1 | 🇸🇪 **Stałe obszary zakazane Szwecji są teraz czerwone.** 146 ze 160 obszarów ograniczonych (warstwa LFV `mais:RSTA`, od ziemi) jest teraz klasyfikowanych jako zakazane (czerwona sygnalizacja, czerwony poligon) zamiast wymagających zezwolenia (żółte) — spójnie z tymczasowymi obszarami ograniczonymi z NOTAM i AIP SUP. Opisy z danych, w tym wskazówki o możliwych zezwoleniach Transportstyrelsen, pozostają bez zmian; 5-km obszary lotnisk nadal wymagają zezwolenia. 14 obszarów, których oficjalny opis wymaga zezwolenia tylko po ogłoszeniu w NOTAM lub AIP SUP (m.in. południowa część archipelagu sztokholmskiego, północny Gotland), nadal wymaga zezwolenia (żółte); po aktywacji pojawiają się na czerwono przez przycisk na żywo. Decyzja właściciela; migawka `data/uas-zones-se.json` wygenerowana ponownie, bez zmian po stronie klienta. |
| v26.10.118.0 | 🇸🇪🇧🇪 **Szwecja i Belgia.** Dwa nowe warianty krajowe (`skycheck-se`, `skycheck-be`) z oficjalnymi strefami jako cotygodniowo odświeżane migawki ED-269 (`data/uas-zones-{se,be}.json`, 390 / 582 strefy). **Szwecja:** siedem warstw WFS LFV oraz plik stref ED-318 Transportstyrelsen (CC BY 4.0); obszary ograniczone i 5-km obszary lotnisk = wymagane zezwolenie; strefy kontrolowane, strefy ruchu (informacji o ruchu), 1-km obszary heliportów i obszary niebezpieczne = warunkowo; 68 stref UAS z oknami ważności podanymi w pliku. **Belgia:** WFS Droneguide (skeyes, w imieniu BCAA), bez wielokątów światowych stref czasowych i bez stref z dolną granicą powyżej 120 m AGL (jak domyślny widok oficjalnej mapy); licencja nie podana przez wydawcę; ponowne wykorzystanie zgodnie z udokumentowaną odpowiedzią BCAA (sygn. G26-187 z 2026-09-16) z czterema informacjami, które aplikacja stale wyświetla pod listą stref. **Przycisk na żywo** obejmuje teraz także Szwecję (`notam-se`: obszary NOTAM z filtrem oficjalnej mapy, tylko od poziomu gruntu, plus aktualnie ważne obszary AIP SUP przy gruncie) i Belgię (`notam-be`: strefy NOTAM i tymczasowe strefy zakazu lotów), obok Norwegii. **Nowa zasada dla wszystkich pięciu krajów ED-269:** strefa jest „obecnie nieaktywna”, gdy każde okno aktywacji dobiegło końca albo rozpoczyna się dopiero za ponad 24 godziny („Not yet active — starts <RRRR-MM-DD GG:mm> UTC”); okno rozpoczynające się w ciągu 24 godzin liczy się jako trwające. Skrypt budujący i workflow obejmują `se` (katalog z ośmioma plikami) i `be` (jeden plik); nieznane wartości ograniczeń lub wysokości przerywają budowę danego kraju. 299 testów Node. **Seria poprawek po przeglądzie końcowym:** wskazanie źródła dla pięciu krajów z migawkami (Szwecja z linkiem CC BY 4.0 i „adapted”) w atrybucji mapy; szwedzkie linki prawne SUP poprawnie zakodowane; klasyfikacja NOTAM RD/W… warunkowa, każde inne R… zakazane; wyniki na żywo w kolejności aktywne – strefy z migawki – nieaktywne; belgijski jednolinijkowy komunikat w panelu mapy przed wskazówką NOTAM; limity czasu na kraj w workflow. |
| v26.10.117.2 | **Zainstalowana aplikacja startuje jasno.** Kolory ekranu startowego i motywu w `manifest.json` zmieniono z ciemnych na jasne `#eef4fb`, a styl paska stanu iOS z `black-translucent` na `default`, zgodnie z jasnym domyślnym interfejsem wprowadzonym w v26.10.117.0. Już zainstalowane aplikacje przejmą nowe kolory z opóźnieniem lub po ponownej instalacji, zależnie od systemu. |
| v26.10.117.1 | 🛟 **Awaria danych stref jest teraz widoczna.** Gdy zapytanie o geostrefy się nie powiedzie (błąd HTTP, przekroczenie czasu, brak sieci), SkyCheck pokazuje teraz **„Dane stref niedostępne”** z **żółtym** światłem zamiast „brak ograniczeń” na zielono — we wszystkich dwunastu krajach. Lista stref wyświetla ramkę z informacją i linkiem do oficjalnego źródła, panel mapy — szary wpis. Udane zapytanie bez trafień pozostaje zielone; lokalne rozwiązania zapasowe z plików zostają. Usługa, która się zawiesza, prowadzi po **20 sekundach** do komunikatu o awarii; w trakcie zapytania baner pokazuje **„Sprawdzanie przestrzeni …”** zamiast „brak ograniczeń”. Niemcy: odpowiedź 200, która nie jest wynikiem GeoServer, liczy się jako awaria; Dania i Niemcy pokazują wyniki częściowe razem z komunikatem o awarii. Nieobjęte: (1) nakładka mapy całego kraju; (2) Niemcy: warstwa DiPUL, która odpowiada błędem serwera, jest pomijana do końca sesji, a jej strefy brakują wtedy bez komunikatu; (3) w trakcie trwającego zapytania lista stref i panel mapy mogą jeszcze pokazywać wpisy poprzedniego punktu; (4) wiersz pogody w banerze zachowuje po zmianie języka dawny język aż do następnego sprawdzenia. 147 testów Node. |
| v26.10.117.0 | 🇱🇺🇳🇴🇪🇪 **Luksemburg, Norwegia i Estonia.** Trzy nowe warianty krajowe (`skycheck-lu`, `skycheck-no`, `skycheck-ee`) z oficjalnymi strefami ED-269 jako cotygodniowo odświeżane migawki (`data/uas-zones-{lu,no,ee}.json`, 43 / 1390 / 241 stref; źródła: DAC Luksemburg CC0, Luftfartstilsynet / dronesoner.no NLOD 2.0, EANS). Nowa funkcja Netlify `zones-ed269` z dokładnym testem obszaru (punkt w wielokącie lub krawędź w promieniu wyszukiwania). Strefy, których wszystkie okna aktywacji już minęły, pozostają widoczne jako „obecnie nieaktywne" (żółte zamiast czerwonych). **Norwegia:** tymczasowe strefy ograniczeń NOTAM są ładowane na żywo po kliknięciu przez nową funkcję `notam-no`, rysowane czerwoną linią przerywaną i uwzględniane w sygnalizacji przez 5 minut. **Estonia:** stały komunikat informuje, że strefy krótkoterminowe mogą mieć do 7 dni. Nazwy stref są teraz escapowane HTML w banerze statusu i w panelu mapy. **Interfejs startuje teraz domyślnie w trybie jasnym** (zapisany wybór, także ciemny, jest respektowany). 39 testów Node. |
| v26.08.116.8 | 🌍 **Strona reguł wysokości CTR: 5 kolejnych języków (FR/ES/IT/NL/PL), przełącznik języka z flagami SVG + przebudowa grafiki.** `ctr-hoehenregeln.html`. **(1) Języki:** teraz w **7 językach** — niemiecki, angielski oraz nowe **francuski, hiszpański, włoski, niderlandzki, polski** (pełna i18n wszystkich tekstów, bloków HTML, tabel, etykiet grafiki SVG i kart). **(2) Przełącznik:** tekstowy przycisk DE/EN zastąpiono **rozwijaną listą z flagami SVG** — pokazuje aktywną flagę, kliknięcie wybiera język; solidne flagi SVG; wykrywanie przez `?lang=`, localStorage i `navigator.language`. **(3) Grafika:** przekrój przebudowano — wzgórze w strefie 2 zmieniono w płaski plateau o niskiej wysokości, lotnisko leży teraz na własnej wysokości odniesienia, **usunięto słupki wysokości strefy 1** (brak ogólnego zezwolenia → brak reguły wysokości), usunięto mylącą pływającą linię odniesienia wysokości lotniska, dodano linię pułapu „pułap = wys. lotniska + 25 m", zespół budynków przerysowano jako szerszą panoramę na granicy stref 2/3, usunięto mylącą adnotację „w skali" przy znaczniku 800 m. |
| v26.08.116.7 | 🇩🇪 **Strona reguł wysokości CTR: dodano NfL 2026-1-3959 (zasady BMV) — ogólne warunki operacyjne + adnotacja 800 m widzialności.** `ctr-hoehenregeln.html` (DE+EN). Dodaje nadrzędną NfL **2026-1-3959** (zasady BMV dla UAS w przestrzeni klasy D, podstawa 3960/3981) jako pierwszą pozycję odniesień. Nowy **blok „Dalsze warunki"** z ogólnymi warunkami 3959, na czele wyróżnione **ostrzeżenie see-and-avoid**: służby ATC **nie zapewniają separacji** (również turbulencji śladu) ani **informacji o ruchu** — unikanie kolizji należy wyłącznie do pilota. Ponadto: **minimalna widzialność ≥ 800 m** (poza pobliżem przeszkód / zezwoleniem indywidualnym), loty autonomiczne zabronione, BVLOS i rój dozwolone. Przekrój SVG otrzymuje **adnotację w skali „Widzialność ≥ 800 m"** (niebo w lewym górnym rogu, z dala od scen przeszkód). Tylko `ctr-hoehenregeln.html`; podbicie APP_VER. |
| v26.08.116.6 | 🇩🇪 **Strona reguł wysokości CTR: galeria rozszerzona do wszystkich 24 CTR-D, pogrupowana wg DFS/DAS + samoopisujący się schemat nazw.** `ctr-hoehenregeln.html`. Galeria siatek wysokości obejmuje teraz **wszystkie 24 niemieckie CTR-D** — dodano 6 brakujących lotnisk: **Erfurt-Weimar (EDDE), München (EDDM)** (DFS) oraz **Dortmund (EDLW), Paderborn-Lippstadt (EDLP), Niederrhein/Weeze (EDLV), Mönchengladbach (EDLN)** (DAS). Galeria podzielona na dwie opisane grupy — **kontrola DFS · NfL 2026-1-3960 · 15 CTR-D** i **kontrola DAS · NfL 2026-1-3981 · 9 CTR-D**. Wszystkie obrazy przemianowane na samoopisujący się schemat `hoehengrid_<nfl>_<dfs\|das>_<slug>_<icao>.webp` (18 istniejących przez `git mv`, 6 nowych skonwertowanych); tablica `ports` otrzymała pola NfL + organ; tekst wprowadzający 18 → 24. |
| v26.08.116.5 | 🇩🇪 **Strona reguł wysokości CTR: druga decyzja ogólna NfL 2026-1-3981 (DAS) + obie NfL podawane razem.** `ctr-hoehenregeln.html` (DE+EN). Dodaje **NfL 2026-1-3981** (CTR z kontrolą lotniska DAS / DFS Aviation Services) jako odpowiednik istniejącej **NfL 2026-1-3960** (DFS). Obie NfL są teraz podawane **razem** w każdym miejscu normatywnym (eyebrow, podtytuł, ramka zezwolenia, uwagi o dokładności, stopka, meta, link analizy przeszkód, lista odniesień). Nowy wiersz podtytułu: **te same wysokości obowiązują we wszystkich 24 CTR-D — 15 z kontrolą DFS, 9 z kontrolą DAS**; plus zdanie wyjaśniające DFS vs DAS (te same zasady, inna odpowiedzialna jednostka ATC). Tylko `ctr-hoehenregeln.html`; podbicie APP_VER. |
| v26.08.116.4 | 🇩🇪 **Grafika reguł wysokości CTR: reguła przeszkód + lista dokumentów.** `ctr-hoehenregeln.html` (DE+EN). Przekrój SVG wizualizuje teraz regułę przeszkód (zielona otoczka ±30 m / +15 m): turbina wiatrowa (strefa 4, powyżej pułapu), maszt radiowy (strefa 3, lokalnie podwyższony → inaczej 0 m/czerwony), oraz zespół 3 budynków na płaskim plateau w strefie 3, gdzie najwyższy w promieniu 30 m wyznacza odniesienie +15 m — każdy z dronem ✓, plus dron ⚠ tuż poza (>30 m). Nowa sekcja „Weitere Dokumente" (`.reflist`) z 3 nowymi odniesieniami DFS (PDF regulacji DFS, PDF krótkiej informacji DFS-AS, strona WWW DFS-AS) obok istniejących dokumentów podstawowych. |
| v26.08.116.3 | 🇩🇪 **Link do reguł wysokości CTR na stronie startowej.** Rząd źródeł/przycisków na stronie startowej (`.l-sources`) pokazuje teraz jako pierwszy element wyróżniony chip funkcji z akcentowaną ramką **„📐 CTR-Höhenregeln"** (link względny `ctr-hoehenregeln.html`, otwiera nową kartę). Nowa klasa CSS `.l-src-feature` wyróżnia go spośród szarych chipów źródeł. Tylko link, bez zmian logiki. |
| v26.08.116.2 | 🇩🇪 **Strona reguł wysokości CTR: doprecyzowanie reguły przeszkód + odniesienie do info-procedury DFS.** `ctr-hoehenregeln.html` (DE+EN), wyłącznie dodatki: (a) nowy box „Obstacle rule: no blanket +15 m" (`obstacleNote`) — bliskość przeszkody (≤ 30 m w bok, ≤ 15 m nad przeszkodą) to jedyny przypadek przekroczenia pułapów strefy i nie daje prawa do lotu ≥ 15 m nad gruntem wszędzie (teren nie jest przeszkodą); linkuje dokument analizy prawnej (Google Doc); (b) doprecyzowana karta reguły „hindernisnah"; (c) **PDF info-procedury DFS** (dipul.de) dodany jako link „(DFS-Info)" przy wszystkich 15 hiperłączach NfL (statyczny HTML + i18n DE/EN). |
| v26.08.116.1 | 🔧 **Zastąpienie map bazowych CARTO.** CARTO zakończyło anonimowy dostęp do swoich map bazowych (kafelki mają teraz znak wodny „API KEY REQUIRED"). Styl „Dark" korzysta teraz ze zwykłych kafelków OSM odwróconych filtrem CSS (bez klucza API, zoom 19); zbędny jasny styl CARTO „Hell" został usunięty (cykl: Dark → OSM → Satelita). CSP oczyszczone. |
| v26.08.116.0 | 🇩🇪 **Strona reguł wysokości CTR: tryb ciemny, przełącznik DE/EN, tłumaczenie angielskie.** `ctr-hoehenregeln.html` zyskuje górny pasek z **przełącznikiem motywu** (☀️/🌙; ustawia `data-theme`, zapisuje w `localStorage`, respektuje `prefers-color-scheme` + `?theme=`; wczesny inline-setter przeciw FOUC) oraz **przełącznikiem języka DE/EN** (zapisuje `ctrhr-lang`, respektuje `?lang=`, domyślnie wg języka przeglądarki). Pełny **system i18n** (`T={de,en}`, `applyLang`) tłumaczy każdy statyczny węzeł (`data-i18n`/`data-i18n-html`) i przebudowuje scenę SVG, karty reguł oraz teksty alt galerii dla każdego języka. Tekst niemiecki pozostaje w HTML jako zapas bez-JS/SEO. |
| v26.08.115.1 | 🇩🇪 **Strona reguł wysokości CTR: rozdział o dokładności, rezerwa bezpieczeństwa, linki NfL.** `ctr-hoehenregeln.html`: (a) człon „− rezerwa bezpieczeństwa (≈ 5 m)" we wzorze objaśniającym (na czerwono, wyraźnie oznaczony jako zalecenie, którego siatka na żywo NIE odejmuje — obliczenia w `skycheck.html` bez zmian); (b) końcowy rozdział „Wie genau sind diese Höhenwerte?" (źródło DEM i tabela zoom→rozdzielczość, dokładność wysokości RMSE/LE90, efekty las/stok, logika zaokrąglania, uwaga o DGM1); (c) poprawka: dwie karty efektów błędnie używały numerowanej klasy `.steps` (niebieski znacznik „1" zasłaniał tytuł) → nienumerowana `.factgrid`; (d) NfL 2026-1-3960 teraz podlinkowana we wszystkich pięciu widocznych miejscach (wcześniej tylko wstęp + stopka). |
| v26.08.115.0 | 🇩🇪 **Strona reguł wysokości CTR: instrukcja + galeria lotnisk.** `ctr-hoehenregeln.html` zyskuje (1) ilustrowaną instrukcję „So funktioniert das Live-Höhengitter" — opatrzony adnotacjami zrzut ekranu Stuttgartu z pięcioma numerowanymi znacznikami (przycisk siatki, raster koloru, legenda, dymek, overlay statusu), listę pięciu kart-kroków oraz blok z wzorem `maks. wysokość (AGL) = min(pułap nad gruntem, wysokość lotniska + pułap − wysokość terenu)`; (2) galerię 18 niemieckich lotnisk z CTR-D jako leniwie ładowaną siatkę WebP (`img/hoehengrid-flughoehen-drohnen-<miasto>.webp`, ~2,5 MB łącznie). Wszystkie zrzuty przekompresowane do WebP (1600 px). NfL 2026-1-3960 jest teraz również podlinkowana we wstępie. |
| v26.08.114.3 | 🇩🇪 **Legenda siatki wysokości + infografika reguł.** Legenda siatki wysokości pokazuje teraz znaczniki wysokości pod skalą (`0 · 25 · 45 · ≥65 · 100 m`), przycisk ⓘ otwiera nową hostowaną stronę **`ctr-hoehenregeln.html`** (infografika przekrojowa maksymalnych wysokości lotu dronów według strefy CTR wg NfL 2026-1-3960; oficjalny PDF NfL jest podlinkowany w jej stopce), a legenda została podniesiona nad przycisk pełnego ekranu, aby już się nie nakładały. CSP rozszerzone o Google Fonts dla nowej strony. |
| v26.08.114.2 | 🇩🇪 **Etykiety układu wysokości.** Wysokość terenu w panelu strefy pokazuje teraz pionowy układ odniesienia DEM („≈ X m MSL (DEM, EGM96)" — kafelki Terrarium = EGM96, zapas Open-Meteo = EGM2008), a dymek najechania siatki wysokości dodaje wysokość terenu pod kursorem jako **DHHN2016** („… m AGL · teren ≈ X m DHHN2016"; ortometryczna wysokość DEM równa się DHHN2016 w Niemczech z dokładnością poniżej metra, poniżej własnej dokładności DEM). |
| v26.08.114.1 | 🇩🇪 **Punktowa wysokość terenu z kafelków DEM (niezawodnie).** Wysokość terenu pokazywana w panelu strefy („≈ X m MSL") zależała wyłącznie od API wysokości Open-Meteo i pozostawała pusta („—") przy jego dziennym limicie; teraz pochodzi głównie z **kafelków wysokości DEM** (bez dziennego limitu, spójnie z siatką wysokości), a Open-Meteo służy już tylko jako tolerancyjny zapas (wystarczy punkt środkowy). Etykieta „m MSL" już tam była. |
| v26.08.114.0 | 🇩🇪 **Siatka wysokości na kafelkach wysokości DEM + odporność sprawdzania.** Siatka pobiera teraz teren z **kafelków wysokości DEM** (Terrarium/AWS Open Data, ~25 m/piksel) zamiast wielu zapytań punktowych Open-Meteo: kilka kafelków PNG daje pełną rozdzielczość terenu całej CTR → naturalne grzbiety, **Domberg jest teraz widoczny**, budowa ~1,6 s, a najechanie jest **natychmiast dokładne** (bez czekania). Mapa cieplna to pojedynczy ostry `L.imageOverlay` (bez szwów/artefaktów), a skala sygnalizacji świetlnej jest skalibrowana do limitów DFS (25 m pomarańczowy, 45 m żółty). **Odporność** (naprawia błędy produkcyjne z 113.2): pogoda/Kp/ruch są każde niefatalne, awaria jednego źródła nie czyści już całego sprawdzania; `fetchWeather` używa okna 6-dniowego + limitu czasu (okno 7-dniowe wygasało w BrightSky); poprawiono literówkę `$alarm`. |
| v26.08.113.2 | 🇩🇪 **Dopracowana siatka wysokości.** Drobne kafle ~300 m na rendererze canvas (zamiast ~940 m), które trzymają się okrągłych granic CTR — grube kafle wychodziły poza krawędzie i mogły pokazywać zieloną wartość strefy 4 w punkcie strefy 3. Teren jest teraz interpolowany biliniowo z rzadkiej siatki wsporczej, z ponawianiem bloków i wypełnianiem luk metodą najbliższego sąsiada, więc ograniczone zapytanie o wysokość nie opróżnia już połowy CTR. Najechanie liczy teraz **maksymalną wysokość w dokładnej pozycji kursora** (natychmiastowa wartość interpolowana, potem dokładna wysokość Open-Meteo w tym punkcie) — wyraźnie niższą na wzniesieniach jak Domberg — pokazywaną jako ciemny znacznik pod kursorem, aby nie zasłaniał dymka strefy DiPUL. Mobilnie: panel geostref jest zawsze pod (wielowierszowym) paskiem przycisków, bez nakładania (S24 Ultra i mniejsze). Sam wzór wysokości był już poprawny. |
| v26.08.113.0 | 🇩🇪 **Siatka wysokości obejmuje teraz całą CTR (przebudowa WFS).** Termiczna mapa w barwach sygnalizacji świetlnej pokrywa teraz **całą** strefę kontrolowaną DFS (jak czeska GRID) zamiast siatki 3 km wokół znacznika i jest **obliczana raz na CTR oraz buforowana** — klikanie nowych pozycji w obrębie tej samej CTR już jej nie przebudowuje (naprawia niespójne znikanie mapy/przycisku po kilku kliknięciach). Nowe źródło: **WFS DiPUL** (`dipul:kontrollzonen`) dostarcza dokładne wielokąty podstref (każda `U_CONTROL_ZONE_1…4` z dolną granicą MSL); każda komórka jest przypisywana do **właściwej** podstrefy metodą punkt-w-wielokącie, teren (Open-Meteo) jest pobierany i kolorowany przez `computeCtrFlightInfo` — dzięki temu stopnie 2/3/4 są rzeczywiste, a nie jedna wykryta strefa zastosowana do wszystkiego. Przełącznik pozostaje widoczny w całych Niemczech; wiążące pozostają dane DiPUL / NfL. |
| v26.08.112.0 | 🇩🇪 **Siatka wysokości (przełączana).** Termiczna mapa (w barwach sygnalizacji świetlnej) maksymalnej wysokości lotu dla każdej komórki wewnątrz strefy kontrolowanej DFS (CTR 2–4) — inspirowana czeskim DroneMap GRID. Rozwiązanie hybrydowe: WMS DiPUL pokazuje granice podstref, a nowa nakładka koloruje siatkę terenu 13×13 (~3 km, wsadowo z Open-Meteo) za pomocą istniejącej funkcji computeCtrFlightInfo na podstawie strefy CTR wykrytej w danym miejscu. Własny przełącznik na mapie i legenda; pojawia się tylko wewnątrz niemieckiej strefy CTR 2/3/4. Jest to przybliżenie (jedna wykryta podstrefa zastosowana do całej siatki — płaski teren w obrębie jednej strefy odczytywany jest dość jednolicie; stopnie 2/3/4 pojawiają się przy przechodzeniu między podstrefami) — wiążące pozostają dane DiPUL / NfL. |
| v26.08.111.0 | 🇳🇱🇵🇹 **Dodano Holandię i Portugalię** (`skycheck-nl`, `skycheck-pt`). Oba warianty korzystają z ArcGIS FeatureServerów **EASA Common Repository** (wektorowe poligony po stronie klienta, otwarty CORS) poprzez istniejący adapter w stylu IE: NL to ED-318 (~162 strefy, kolorowane wg `restriction`), PT to schemat pochodzący z KML (~314 stref, kolorowane wg `Restriction`, typ z `FolderPath` — Aeroportos, CTR-y, Zonas Militares, obszary chronione — kontakt ANAC). Okablowanie kraju (wykrywanie, nazwy, bbox, punkt orientacyjny, CC, pasek źródła stref, kafelek kraju) oraz mechanizm nakładki całego kraju rozszerzone na `nl`/`pt`. Dla Czech czysta oficjalna ścieżka ED-269 jest na mapie drogowej (API ŘLP DronMap jest zaciemnione AES, komercyjny WMS Dronecharts wymaga zgody). |
| v26.08.110.2 | **Doprecyzowano kolejność na stronie startowej.** Warianty SkyCheck dla poszczególnych krajów są teraz na początku, a po nich SkyAlarm, PointCloud Manager, GPS2UTM i MetaLens. |
| v26.08.110.1 | **Ukończono nawigację między aplikacjami.** SkyCheck zawiera teraz kafelek PointCloud Manager obok SkyAlarm i GPS2UTM. |
| v26.08.110.0 | **Integracja GPS2UTM i wspólny format wersji.** Strona startowa linkuje do GPS2UTM za pomocą wspólnego biało-czerwono-cyjanowego znaku słownego. SkyCheck używa teraz `vYY.MM.major.subversion`, wyświetlanego w całości w nagłówku aplikacji, stopce i karcie przeglądarki. |
| v1.09 | **Zwijane elementy sterujące mapą na każdym rozmiarze ekranu.** Kompaktowy jednorzędowy pasek narzędzi oraz zwinięte szczegóły pogody/wysokości/współrzędnych zastępują teraz również dawne nakładki desktopowe, dzięki czemu widok podzielonego ekranu i szerokie podglądy korzystają z tego samego interfejsu co telefony. |
| v1.08 | **Kompaktowe nakładki mapy na urządzeniach mobilnych.** Na telefonach pasek narzędzi mapy jest ograniczony do jednego rzędu; promienie wyszukiwania 5/100/200 m oraz okrąg alarmowy 1,5 km otwierają się na żądanie. Lista stref pozostaje widoczna, podczas gdy pogoda, teren i współrzędne można zwinąć; wyskakujące okienka adresów nie powielają już współrzędnych GPS. |
| v1.07 | **Konwersja współrzędnych GPS i układ wysokościowy.** Pozycje WGS84/ETRS89 pokazują teraz od razu UTM oraz rozwijane szczegóły Gauss-Krüger i GCG2016/DHHN2016. `coordinates.html` to mobilny konwerter live-GPS z oficjalnym punktem kontrolnym Lübben jako wbudowanym sprawdzeniem numerycznym. |
| v1.06 | **Dopracowane jasne nakładki mapy.** Panel sterowania, panel stanu, pełny ekran i przełącznik mapy używają teraz jasnych półprzezroczystych powierzchni na OSM. Elementy sterujące mają spójny prostokątny system 32 px, a warstwy kontekstowe zachowują swoje kolory. Sprawdzono na desktopie i ekranie mobilnym 390 px. |
| v1.05 | **Połączony motyw/mapa i naprawiony lokalny podgląd Austrii.** Jasny interfejs wybiera OSM, ciemny CARTO Dark; przycisk stylu mapy nadal pozwala na ręczną zmianę. Bez Netlify Functions lokalny podgląd wczytuje plik ED-269 Austro Control i pokazuje strefy lotniskowe oraz kontrolowane. |
| v1.04 | **Globalny jasny interfejs.** Przycisk słońce/księżyc na ekranie startowym i w nawigacji wyników przełącza cały interfejs, zapamiętuje wybór i synchronizuje zintegrowany widok alarmu. Funkcja działa we wszystkich siedmiu wariantach krajowych; styl mapy pozostaje niezależny. |
| v1.03 | **Wydajność Francji.** Cztery warstwy kontekstowe OSM nie są już wczytywane jako pełne pliki krajowe, lecz pakowane per kafelek widoku 2° — dla Paryża zmniejsza to transfer z ~4,1 MB do ~0,25 MB gzip. Funkcja stref francuskich odczytuje przy zimnym starcie również tylko odpowiednie kafelki przestrzenne zamiast pełnego zbioru danych 8,8 MB. |
| v1.02 | **Wydajność analizy punktu.** Brak blokującego pełnoekranowego wskaźnika ładowania, animowany okrąg analizy, równoległe zapytania, krótkotrwałe pamięci podręczne przestrzenne, renderowanie na płótnie (canvas) oraz ulepszone buforowanie w przeglądarce/CDN. |
| v0.98 | **Tytuł karty przeglądarki podąża teraz za językiem interfejsu.** Znacznik `<title>` był statycznym niemieckim ciągiem, nigdy niepodłączonym do i18n — każda witryna spoza DE pokazywała niemiecki tytuł karty. Teraz `document.title` jest ustawiany na podstawie klucza i18n `docTitle` w `applyLang()` — aktualizuje się przy wczytaniu (według domyślnego języka kraju) i przy każdej zmianie języka, we wszystkich pięciu językach. |
| v0.97 | Warstwy kontekstowe rozszerzone o CH, ES, DK, IE, FR. Austriackie nakładki z v0.96 (obszary chronione, autostrady, linie wysokiego napięcia, linie kolejowe) istnieją teraz dla wszystkich krajów spoza DE (DE ma je już dzięki DiPUL). Klient został uogólniony — CONTEXT_META + CONTEXT_COUNTRIES, jeden plik danych na kraj (data/<cc>-<layer>.json); grupa przełączników pojawia się automatycznie dla każdego wymienionego kraju. Generator jest teraz pojedynczym, wielokrotnego użytku narzędziem (scripts/gen-context.mjs + odporny sterownik fetch-context.sh z ponawianiem curl i wznawianiem), które zszywa segmenty OSM w długie polilinie przed uproszczeniem, co znacznie zmniejszyło duże kraje (autostrady FR 9 → 3,5 MB, ES 6 → 2,9 MB przed gzip). Francja jest przycięta do metropolitalnej ramki ograniczającej (obszar wg ISO wciągnąłby terytoria zamorskie). Dodanie kolejnego kraju w przyszłości = wygenerowanie danych + dodanie kodu do CONTEXT_COUNTRIES (zob. scripts/README.md) |
| v0.96 | 🇦🇹 Warstwy kontekstowe dla Austrii. skycheck-at może teraz nakładać cztery dodatkowe, niezależnie przełączane warstwy — obszary chronione (parki narodowe, Natura 2000, rezerwaty przyrody, obszary chronionego krajobrazu, parki krajobrazowe, rezerwaty biosfery, chronione elementy krajobrazu, pomniki przyrody), autostrady, linie wysokiego napięcia oraz główne linie kolejowe. Dane pochodzą z OpenStreetMap (ODbL) jako statyczne, wstępnie uproszczone migawki GeoJSON w plikach data/at-*.json (generatory w scripts/), ładowane leniwie przy przełączeniu i rysowane jako kolorowe wektorowe nakładki po stronie klienta. Stanowią kontekst informacyjny (wskazówki dotyczące zachowania odległości) — wiążące sprawdzenie stref pozostaje po stronie Austro Control / dronespace.at, więc nie zasilają oceny statusu lotu. Zainspirowane serwisem drohnenkarte.at, który korzysta z tych samych otwartych źródeł |
| v0.95 | Poprawka do v0.94: globalne zastąpienie de-DE→_locale() trafiło również w samą definicję mapy _LOCALES (de: _locale()), która odczytywała _LOCALES, gdy ta jeszcze się inicjalizowała — błąd martwej strefy czasowej (temporal dead zone), który uniemożliwiał uruchomienie całej aplikacji. Przywrócono literał „de-DE”. (node --check przechodzi pod względem składni; była to regresja wyłącznie w czasie wykonania, wychwycona w testach dymnych na żywo.) |
| v0.94 | Pełny audyt i18n — koniec z niemieckim przeciekającym do innych języków. Kilka dynamicznie renderowanych sekcji (analiza punktu rosy/oblodzenia, etykiety METAR/TAF, szacowana podstawa chmur, komunikaty ładowania/błędów, dymki znaczników statków powietrznych, alerty, znacznik czasu „Zaktualizowano”) było albo zaszytych na sztywno po niemiecku, albo przy przełączeniu języka renderowało ponownie jedynie swoje statyczne etykiety — przez co użytkownicy angielsko- i francuskojęzyczni wciąż widzieli niemiecki. Teraz każdy ciąg widoczny dla użytkownika przechodzi przez tabelę i18n (16 nowych kluczy × 5 języków), pomocnik _locale() steruje całym formatowaniem daty/godziny (dotąd zaszytym na sztywno jako de-DE), a przełączenie języka renderuje ponownie wszystkie dynamiczne sekcje wyników, nie tylko statyczne etykiety data-i18n |
| v0.93 | Dopracowanie ekranu startowego i poprawność dla poszczególnych krajów. (1) Nowy kafelek startowy „SkyCheck w innych krajach” zawierający każdy wariant krajowy jako bezpośredni odnośnik, stylizowany jak logotyp (Sky biały · Check cyjanowy · -xx koralowy); bieżący kraj jest pomijany, a etykiety podążają za językiem interfejsu. (2) Źródła geostref zależne od kraju: pasek źródeł na ekranie startowym i na stronie wyników (oraz przełącznik warstwy mapy, dawniej „strefy DiPUL”) pokazują teraz właściwego dostawcę dla każdego kraju zamiast wszędzie DiPUL — DE DiPUL/DFS, FR Géoportail, AT Austro Control, CH BAZL, ES ENAIRE/EASA, DK Trafikstyrelsen, IE EASA. (3) Ustawienia w pełni zlokalizowane we wszystkich pięciu językach (wcześniej tylko po niemiecku); opcja trybu warstwy DiPUL — dotycząca wyłącznie Niemiec — jest teraz ukrywana poza DE, pozostawiając jedynie niezależne od kraju ustawienie prognozy 48-godzinnej |
| v0.92 | 🇪🇸 **Przełącznik źródła dla Hiszpanii**: ekran startowy pozwala wybrać źródło geostref — **EASA** Common Repository (wektor ArcGIS po stronie klienta, kolorowany według typu strefy, oparty na widocznym obszarze; domyślnie) lub **ENAIRE** servAIS (dotychczasowy oficjalny WMS). EASA renderuje czytelniejsze, przezroczyste wielokąty stref zamiast rozciągniętej na całą Hiszpanię warstwy WMS; wybór jest zapamiętywany w `localStorage` |
| v0.91 | 🇮🇪 Poprawka: `getLegalLink` zawieszał się przy liczbowych wartościach `legal` (pole `Paragraf` Danii jest liczbą), co wyłączało cały potok renderowania dla DK — przekonwertowano na łańcuch przed dopasowaniem regexem |
| v0.90 | 🇩🇰 **Dania** (`skycheck-dk`) i 🇮🇪 **Irlandia** (`skycheck-ie`): dwa klienckie adaptery **wektorowe ArcGIS** — DK z FeatureServera Trafikstyrelsen, IE z EASA Common Repository (ED-318, wstępne); oba pobierają GeoJSON bezpośrednio (otwarty CORS), kolorują wielokąty według kategorii i obsługują nakładkę całego kraju |
| v0.89 | Wyszukiwanie adresów ograniczone do aktywnego kraju za pomocą filtra `countrycode` w Photon (usuwa transgranicznych sąsiadów, których przepuszczał bounding box) |
| v0.88 | **Wyszukiwanie adresów ograniczone do kraju**: `geocode()` był na sztywno przypisany do Niemiec (`lang=de` + niemiecki bounding box) — każdy wariant krajowy zwracał wyłącznie niemieckie podpowiedzi. Teraz używane są bounding box per kraj + język interfejsu |
| v0.87 | **Domyślne ustawienia per kraj**: placeholder wyszukiwania z punktem orientacyjnym stolicy (DE Brama Brandenburska, FR wieża Eiffla, AT katedra św. Szczepana, CH Pałac Federalny, ES Puerta del Sol) oraz domyślny język interfejsu zależny od kraju przy pierwszej wizycie |
| v0.86 | 🇪🇸 **Hiszpania** (`skycheck-es`): nowy adapter kraju wzorowany na schemacie DE/CH — warstwa **WMS** ENAIRE servAIS dla nakładki + **ArcGIS Identify** ENAIRE dla listy szczegółów/statusu (ustrukturyzowane limity wysokości, linki prawne). CORS-open, bez funkcji/pliku/workflow |
| v0.85 | 🇨🇭 **Szwajcaria** (`skycheck-ch`): nowy adapter kraju wzorowany na schemacie DE — warstwa **WMS** geo.admin.ch dla nakładki mapowej + REST API **Identify** geo.admin.ch dla listy szczegółów/statusu. Obie CORS-open, więc nie są potrzebne żadna funkcja Netlify, żaden hostowany plik ani workflow aktualizacji |
| v0.84 | 🇦🇹 Nakładka mapowa AT rysuje teraz **wszystkie** austriackie strefy (nakładka na cały kraj przez `?all=1`, jak WMS DE) zamiast tylko stref przefiltrowanych punktowo w zaznaczonej lokalizacji |
| v0.83 | 🇦🇹 **Austria** (`skycheck-at`): nowy adapter kraju. `zones-at.js` parsuje zbiór danych Austro Control ED-269; `data/uas-zones-at.json` jest **auto-aktualizowany co miesiąc** przez workflow GitHub Actions (`update-at-zones.yml`) |
| v0.78–v0.82 | Przegląd bezpieczeństwa i jakości (escaping XSS + CSP, poprawka jednostki widzialności METAR, kompletność 5 języków, naprawy defektów alarmu, lód/mgła/widzialność w widoku live) — patrz `docs/code-review-2026-07-16.md` |
| v0.76 | Naprawa race condition: poligony / okręgi geostref FR pokazują się teraz przy pierwszym renderowaniu mapy (wcześniej dopiero po podwójnym kliknięciu z re-fetch). `drawZoneOverlay` wykonywał się przed utworzeniem mapy; teraz po inicjalizacji następuje ponowne narysowanie z cache'a `lastZones` |
| v0.75 | i18n nazwy kraju: baner strony startowej i stopka pokazują aktywną nazwę kraju w wybranym języku UI (np. domena FR + UI ES → „Verificación de vuelo de dron · Francia"). Nowa tabela `COUNTRY_NAMES`, helper `_country()`, placeholder `{country}` interpolowany przez `_t()`. `fltcatDisclaimer` odkrajowiony (zasada UE obowiązuje bez wymieniania kraju) |
| v0.74 | Nakładka mapowa FR: geostrefy w trybie FR są teraz rysowane jako poligony / okręgi Leaflet na mapie (oprócz listy). `zones-fr.js` zwraca geometrię; `drawZoneOverlay()` renderuje po stronie klienta. Przełącznik stref pozostaje kompatybilny |
| v0.73 | Architektura adaptera krajów (etap 1): wsparcie wielokrajowe dla geostref. Wykrywanie kraju przez parametr URL (`?country=fr`) lub nazwę hosta; nowa funkcja Netlify `zones-fr.js` czyta JSON ED-269 dla Francji (`data/uas-zones-fr.json`, ~3,6k stref), DE zachowuje DiPUL WMS |
| v0.72 | Tekst modala Info poprawiony (grupa docelowa, kategoria szczególna, nowa sekcja prywatności); README rozszerzone z tylko niemieckiego → 5 języków |
| v0.71 | Wsparcie dla 5 języków (DE / EN / FR / ES / PL); przełącznik na stronie startowej |
| v0.70 | Modal info kategorii lotu (VFR / MVFR / IFR / LIFR) |
| v0.69 | Link zachmurzenia do Windy; wiatr METAR z symbolem ° i kodami kolorów |
| v0.68 | Link SkyAlarm na stronie startowej |
| v0.67 | Przycisk stylu mapy podniesiony nad atrybucję Leaflet (poprawka z-index) |
| v0.66 | Zwężona nakładka niskiej wysokości, przełącznik stylu mapy w głównej mapie |
| v0.65 | Naprawa: dosłowne znaki `\n` w HTML sekcji METAR |
| v0.64 | Nowa Netlify Function `awc.js` jako proxy CORS dla NOAA AWC (METAR/TAF) |
| v0.63 | Wzór δ w `fetchZones` skalibrowany empirycznie, domyślny promień 100 m |
| v0.58 | Sprzężenie promienia geostrefy 5 m / 100 m |
| v0.57 | Baner instalacji PWA (`beforeinstallprompt`) |
| v0.54 | Integracja METAR/TAF, znaczniki lotnisk na mapie, karta METAR |
| v0.35 | Widok alarmu samolotu (pełny ekran, ADS-B, Haversine, Web Audio, mapa Leaflet) |
| v0.27 | Przełącznik języka DE/EN, pełna I18N |
| v0.20 | Zmienna `APP_VER`, znacznik czasu pomiaru Kp |
| v0.15 | GFZ ładowane asynchronicznie, Netlify Function jako główne proxy, czas ładowania ~1 s |
| v0.14 | Serverless-owa funkcja Netlify `gfz.js` jako niezawodne proxy CORS |
| v0.10 | Wykres słupkowy GFZ Hp30 (4 × pomiar + prognoza) |

---

## Prywatność

SkyCheck nie śledzi ani nie zapisuje żadnych danych użytkownika. Aplikacja to czysta aplikacja webowa — nawet „instalacja" jako PWA tylko umieszcza ikonę aplikacji i nie instaluje niczego trwale. Dane są ładowane tylko tymczasowo i znikają po opuszczeniu aplikacji.

---

## Licencja i odpowiedzialność

Niemcy, Francja, Austria, Szwajcaria, Hiszpania, Dania i Irlandia · Operacje w VLOS · Brak odpowiedzialności za kompletność lub poprawność wyświetlanych danych. Korzystanie z aplikacji nie zastępuje żadnego wymaganego oficjalnego zezwolenia. SkyCheck jest **pomocą orientacyjną** — prawnie wymagane zezwolenie i ostateczne zwolnienie przestrzeni powietrznej są wydawane przez właściwe krajowe portale (np. **DFS Aviation Services** dla DE, **Austro Control Dronespace** dla AT, **skyguide** dla CH).

Źródła danych podlegają własnym licencjom (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch, ENAIRE, Trafikstyrelsen, EASA).
