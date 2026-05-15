**🌍 Język:** [English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Polski**

---

# SkyCheck — Sprawdzenie lotu dronem dla Niemiec

**SkyCheck** to bezpłatna aplikacja webowa typu single-page do szybkiego sprawdzenia warunków lotu dronem w Niemczech przed startem. Aplikacja agreguje dane w czasie rzeczywistym z kilku oficjalnych źródeł i wydaje natychmiastową rekomendację lotu. Nasze zastosowania: pomiary, inspekcje, filmy wizerunkowe, produkcje TV i filmowe oraz szkolenia na świadectwo kompetencji A2/STS w [www.multikopterschule.de](https://www.multikopterschule.de).

🌐 **Wersja live:** [enchanting-stardust-f713da.netlify.app/skycheck.html](https://enchanting-stardust-f713da.netlify.app/skycheck.html)

📦 **Aktualna wersja:** v0.75

---

## Funkcje

| Obszar | Szczegóły |
|---|---|
| **Rekomendacja lotu** | System sygnalizacji świetlnej (Go / Ostrzeżenie / No-Go) oparty na wietrze, porywach, opadach i indeksie Kp |
| **Pogoda** | Porywy wiatru, prędkość i kierunek wiatru, temperatura, punkt rosy, widzialność, zachmurzenie, opady — dane DWD via BrightSky |
| **METAR / TAF** | Dane meteorologiczne lotnicze w czasie rzeczywistym z pobliskich lotnisk (NOAA Aviation Weather Center), z kategorią lotu VFR / MVFR / IFR / LIFR |
| **Profil wiatru** | Ekstrapolacja prędkości wiatru wg wysokości (10 / 60 / 120 / 150 m AGL) prawem potęgowym |
| **Indeks Kp** | Aktualny Kp z NOAA + wykres Hp30 z GFZ Potsdam (ostatnie 4 × 30 min + prognoza) |
| **Ruch lotniczy** | Ruch ADS-B w czasie rzeczywistym w okolicy z kolorami wysokości i ikonami radaru (Airplanes.live) |
| **Widok alarmu samolotów** | Pełnoekranowa mapa z dźwiękowym alarmem: sygnalizuje zbliżające się statki powietrzne w ustawianym promieniu |
| **Mapa przestrzeni powietrznej** | Strefy DiPUL WMS (uas-betrieb.de): strefy zakazu, strefy kontrolowane, rezerwaty przyrody; promień wyszukiwania przełączalny 5 m / 100 m |
| **Prognoza 48 h** | Prognoza godzinowa na 2 dni (przewijalna, sygnalizator dla każdej godziny) |
| **Przegląd 5-dniowy** | Widok dzienny z temp. min/maks., wiatrem i oceną w kolorach |
| **Wskazówki i ostrzeżenia** | Ostrzeżenia kontekstowe (zakłócenie GPS przy wysokim Kp, wzmożony ruch lotniczy, powód no-fly) |
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
| [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Strefy WMS przestrzeni powietrznej dla dronów | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geokodowanie / wyszukiwanie miejsc | ✅ |
| [Windy.com](https://www.windy.com/) | Link zewnętrzny do szczegółowego widoku zachmurzenia | — |

---

## Architektura

```
skycheck.html               ← cała aplikacja (HTML + CSS + JS, ~5,2k linii)
manifest.json               ← manifest Web App PWA
sw.js                       ← Service Worker (cache)
icon-192x192.png            ← ikona aplikacji (mała)
icon-512x512.png            ← ikona aplikacji (duża)
skycheck-icon.svg           ← ikona źródłowa (wektorowa)
netlify.toml                ← konfiguracja Netlify (włączane pliki bundle'a + przepisywanie URL roota)
netlify/
  functions/
    awc.js                  ← proxy NOAA AWC dla METAR/TAF (obejście CORS)
    gfz.js                  ← proxy GFZ Potsdam dla Kp/Hp30
    zones-fr.js             ← strefy UAS Francji (czyta data/uas-zones-fr.json, filtrowane bbox)
data/
  uas-zones-fr.json         ← strefy UAS Francji ED-269 (miesięczny snapshot, wymienialny)
redirect.html               ← opcjonalna strona przekierowania
```

### Wsparcie wielokrajowe (od v0.73)

SkyCheck używa **wzorca adaptera** dla źródeł danych specyficznych dla kraju. Kraj jest wykrywany z parametru URL `?country=fr` lub nazwy hosta (np. `skycheck-fr.netlify.app`). Domyślnie: `de`.

| Kraj | Źródło geostref | Status |
|---|---|---|
| **DE** (domyślnie) | DiPUL WMS GetFeatureInfo (uas-betrieb.de) | online |
| **FR** | Funkcja Netlify `zones-fr.js` + miesięczny JSON ED-269 | online |
| (inne) | placeholder — adapter gotowy na kolejnych dostawców | — |

Pogoda, ADS-B, METAR/TAF, indeks Kp i geokodowanie są globalne i używane bez zmian w każdym wariancie krajowym.

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
# Prosty serwer HTTP (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# Z Netlify Functions (zalecane — w przeciwnym razie brak METAR/TAF/Kp)
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
| v0.75 | i18n nazwy kraju: baner strony startowej i stopka pokazują aktywną nazwę kraju w wybranym języku UI (np. domena FR + UI ES → „Verificación de vuelo de dron · Francia"). Nowa tabela `COUNTRY_NAMES`, helper `_country()`, placeholder `{country}` interpolowany przez `_t()`. `fltcatDisclaimer` odkrajowiony (zasada UE obowiązuje bez wymieniania kraju) |
| v0.74 | Nakładka mapowa FR: geostrefy w trybie FR są teraz rysowane jako poligony / okręgi Leaflet na mapie (oprócz listy). `zones-fr.js` zwraca geometrię; `drawZoneOverlay()` renderuje po stronie klienta. Przełącznik stref pozostaje kompatybilny |
| v0.73 | Architektura adaptera krajów (etap 1): wsparcie wielokrajowe dla geostref. Wykrywanie kraju przez parametr URL (`?country=fr`) lub nazwę hosta; nowa funkcja Netlify `zones-fr.js` czyta JSON ED-269 dla Francji (`data/uas-zones-fr.json`, ~3,6k stref), DE zachowuje DiPUL WMS |
| v0.72 | Tekst modala Info poprawiony (grupa docelowa, kategoria szczególna, nowa sekcja prywatności); README rozszerzone z tylko niemieckiego → 5 języków |
| v0.71 | Wsparcie dla 5 języków (DE / EN / FR / ES / PL); przełącznik na stronie startowej |
| v0.70 | Modal info kategorii lotu (VFR / MVFR / IFR / LIFR) |
| v0.69 | Link zachmurzenia do Windy; wiatr METAR z symbolem ° i kodami kolorów |
| v0.68 | Link SkyAlarm na stronie startowej |
| v0.64 | Nowa Netlify Function `awc.js` jako proxy CORS dla NOAA AWC (METAR/TAF) |
| v0.63 | Wzór δ w `fetchZones` skalibrowany empirycznie, domyślny promień 100 m |
| v0.58 | Sprzężenie promienia geostrefy 5 m / 100 m |
| v0.57 | Banner instalacji PWA (`beforeinstallprompt`) |
| v0.54 | Integracja METAR/TAF, znaczniki lotnisk na mapie |
| v0.35 | Widok alarmu samolotu (pełny ekran, ADS-B, Haversine, Web Audio, Leaflet) |
| v0.27 | Przełącznik języka DE/EN, pełna I18N |

---

## Prywatność

SkyCheck nie śledzi ani nie zapisuje żadnych danych użytkownika. Aplikacja to czysta aplikacja webowa — nawet „instalacja" jako PWA tylko umieszcza ikonę i nie instaluje niczego trwale. Dane są ładowane tylko tymczasowo i znikają po opuszczeniu aplikacji.

---

## Licencja i odpowiedzialność

Tylko dla Niemiec · Operacje w VLOS · Brak odpowiedzialności za kompletność lub poprawność wyświetlanych danych. Korzystanie z aplikacji nie zastępuje żadnego oficjalnego zezwolenia. SkyCheck jest **pomocą orientacyjną** — prawnie wymagane zezwolenie i ostateczne zwolnienie przestrzeni powietrznej wydaje **aplikacja DFS Aviation Services** oraz inne dopuszczone portale.

Źródła danych podlegają własnym licencjom (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL).
