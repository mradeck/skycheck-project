**🌍 Język:** [English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · **Polski**

---

# SkyCheck — Sprawdzenie lotu dronem (DE · FR · AT · CH · ES · DK · IE)

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

> Wszystkie siedem to **to samo** wdrożenie pliku `skycheck.html` z tego repozytorium, każde serwowane na własnej witrynie Netlify. Wykrywanie kraju: nazwa hosta (`skycheck-<xx>.netlify.app`) lub parametr URL `?country=de|fr|at|ch|es|dk|ie`. Domyślnie: `de`. Każdy wariant krajowy dodatkowo ustawia wstępnie **język interfejsu**, **wskazówkę wyszukiwania z punktem orientacyjnym stolicy** oraz **wyszukiwanie adresów ograniczone do danego kraju**.

📦 **Aktualna wersja:** v0.95

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

---

## Architektura

```
skycheck.html               ← cała aplikacja (HTML + CSS + JS, ~5,2k linii)
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
    zones-fr.js             ← France UAS zones (reads data/uas-zones-fr.json, bbox-filtered)
    zones-at.js             ← Austria UAS zones (reads data/uas-zones-at.json; ?all=1 = full overlay)
data/
  uas-zones-fr.json         ← ED-269 France UAS zones (monthly snapshot, replaceable)
  uas-zones-at.json         ← ED-269 Austria UAS zones (286 zones, auto-updated)
  uas-zones-at.version      ← marker of the last imported Austro Control release (idempotency)
.github/
  workflows/
    update-at-zones.yml     ← monthly job: fetch newest Austro Control ED-269 → commit data file
redirect.html               ← optional redirect page
```

> 🇨🇭 **CH nie potrzebuje żadnego z powyższych** — nakładka mapowa to warstwa WMS geo.admin.ch, a szczegóły stref pochodzą z REST API Identify geo.admin.ch; obie wywoływane bezpośrednio z przeglądarki (CORS-open). Żadnej funkcji Netlify, żadnego hostowanego pliku danych, żadnego workflow aktualizacji.

### Wsparcie wielokrajowe (od v0.73)

SkyCheck używa **wzorca adaptera** dla źródeł geostref specyficznych dla kraju. Kraj jest wykrywany z nazwy hosta (np. `skycheck-ch.netlify.app`) lub parametru URL `?country=de|fr|at|ch|es|dk|ie`. Domyślnie: `de`. Pogoda, ADS-B, METAR/TAF i indeks Kp są globalne; **język interfejsu, punkt orientacyjny wskazówki wyszukiwania oraz bounding box geokodowania** są ustawiane per kraj.

| Kraj | Źródło geostref | Nakładka | Lista szczegółów / status | Dane i aktualizacje |
|---|---|---|---|---|
| 🇩🇪 **DE** (domyślnie) | DiPUL WMS (`uas-betrieb.de`) | kafelki WMS | WMS GetFeatureInfo | serwis live (oficjalny, zawsze aktualny) |
| 🇫🇷 **FR** | zbiór danych ED-269 | poligony/okręgi po stronie klienta | `zones-fr.js` (filtr bbox) | `data/uas-zones-fr.json` (~3,6k stref, wymienialny) |
| 🇦🇹 **AT** | Austro Control ED-269 | wszystkie strefy rysowane po stronie klienta (286) | `zones-at.js` (filtr bbox) | `data/uas-zones-at.json` — **auto-aktualizowane co miesiąc** przez GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | kafelki WMS | REST API **Identify** geo.admin.ch | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | kafelki WMS | REST API **Identify** ArcGIS | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇩🇰 **DK** | Trafikstyrelsen ArcGIS FeatureServer | wektorowe poligony po stronie klienta (~870, kolorowane) | zapytanie ArcGIS (bbox) | serwis live (CORS-open) — **bez funkcji, bez pliku, bez workflow** |
| 🇮🇪 **IE** | EASA Common Repository `ie_geozones` | wektorowe poligony po stronie klienta (76) | zapytanie ArcGIS (bbox) | serwis live (CORS-open, dane EASA **wstępne**) |

Trzy style integracji: **WMS + zapytanie punktowe** (DE, CH, ES — oficjalne serwisy live renderują cały kraj i odpowiadają na zapytania punktowe bezpośrednio), **wektor ArcGIS po stronie klienta** (DK, IE — GeoJSON pobierany na żywo z ArcGIS FeatureServera, rysowany jako kolorowane poligony) oraz **hostowany plik ED-269 + funkcja Netlify** (FR, AT — zbiór danych JSON w repozytorium, filtrowany bbox po stronie serwera; AT odświeża się samo co miesiąc).

### Ile geostref na kraj?

Liczby stref pobrane bezpośrednio ze źródła live każdego kraju (DE via DiPUL WFS ze wszystkich 31 kategorii; ES via ENAIRE ArcGIS; FR/AT ze zbiorów danych ED-269; CH z GeoJSON geo.admin.ch; DK/IE via ArcGIS FeatureServer), znormalizowane względem powierzchni lądowej:

| Kraj | Geostrefy | Powierzchnia (km²) | Strefy na 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Niemcy** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 Hiszpania | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Szwajcaria | 1 232 | 41 285 | ≈ 30 |
| 🇩🇰 Dania | 870 | 42 952 | ≈ 20 |
| 🇫🇷 Francja | 3 642 | 551 695 | ≈ 6,6 |
| 🇦🇹 Austria | 286 | 83 879 | ≈ 3,4 |
| 🇮🇪 Irlandia\* | 76 | 70 273 | ≈ 1,1 |

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
