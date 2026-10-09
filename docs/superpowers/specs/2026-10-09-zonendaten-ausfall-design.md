# SkyCheck v26.10.117.1 — Zonendaten-Ausfall sichtbar machen

Stand: 2026-10-09 · Branch `hotfix/v117.1-zonendaten-ausfall` · Zielversion `v26.10.117.1`

## Problem

Alle Länder-Adapter in `skycheck.html` fangen Fehler intern ab und liefern eine leere Liste.
Ein HTTP-Fehler, ein Timeout oder Offline-Betrieb ist dadurch nicht von „hier gibt es keine
Zonen" zu unterscheiden: Banner „✓ Keine Luftraumeinschränkungen", Zonenliste „Keine
Luftraumeinschränkungen erkannt", Ampel grün. Für eine Flugfreigabe-App ist das ein
Sicherheitsmangel.

## Ziel

Ein eigener Zustand „Zonendaten nicht verfügbar" für alle zwölf Länder. Schlägt der
Zonenabruf am Standort fehl, steht die Ampel mindestens auf Gelb (vom Nutzer bestätigt:
Gelb, nicht Rot), und Liste, Banner und Kartenpanel sagen es ausdrücklich. Ein erfolgreicher
Abruf ohne Treffer bleibt grün wie bisher.

## Nicht im Umfang

- Das flächige Karten-Overlay (`fetchAllZones…`, `ensureAllZones`, ES-EASA-Viewport, WMS-Kacheln).
- Ein eigenes Zeitlimit für hängende Abrufe.
- Der NOTAM-Knopf (Norwegen) — er hat bereits eine eigene Fehleranzeige.
- Wetter-, Kp- und Luftverkehrs-Ausfälle.

## Verhalten

### Fehlervertrag

- Jeder Punkt-Adapter (`fetchZonesDE`, `…FR`, `…AT`, `…CH`, `…ES`, `…ESEasa`, `…DK`, `…IE`,
  `…NL`, `…PT`, `…Ed269`) **wirft** bei fehlgeschlagenem Abruf, statt `[]` zu liefern.
  Fehlgeschlagen heißt: Netzwerkfehler, HTTP-Status außerhalb 2xx, nicht parsbare Antwort.
- Lokale Datei-Fallbacks (`IS_LOCAL_PREVIEW`: AT, LU/NO/EE, FR) bleiben. Geworfen wird erst,
  wenn auch der Fallback scheitert bzw. keiner zur Verfügung steht.
- Deutschland: Die Einzel-Layer-Wiederholung bei GeoServer-`ServiceException` bleibt
  unverändert und gilt als Erfolg. Als fehlgeschlagen gilt nur, wenn die kombinierte Abfrage
  selbst nicht ankommt (`ok === false`) oder — im Wiederholungsfall — kein einziger Layer
  eine verwertbare Antwort liefert.
- Mehrteilige Abrufe (DK: drei Layer): Scheitert ein Teil, gilt der ganze Abruf als
  fehlgeschlagen (konservativ).
- `fetchZones` (der Verteiler) fängt den Fehler, protokolliert ihn per `console.warn` und
  liefert `[zoneDataUnavailable()]`. `fetchZones` selbst wirft nie.
- Norwegen: Geladene NOTAM-Treffer werden weiterhin vorangestellt, auch vor dem Platzhalter.

### Platzhalter-Eintrag

`zoneDataUnavailable()` liefert
`{ unavailable: true, name: '', type: 'DATA_UNAVAILABLE', color: '#64748b', lower: '—', upper: '—', legal: '—', legalUrl: '', desc: '' }`.
Texte werden erst beim Rendern über `_t()` eingesetzt, damit ein Sprachwechsel greift.
Der Eintrag hat keine `geometry` und wird von `drawZoneOverlay` übersprungen. Alle übrigen
Verbraucher von Zonenlisten (CTR-Höhenlogik, Popups, Alarm-View) müssen ihn unbeschadet
durchlassen.

### Anzeige

| Ort | Verhalten |
|---|---|
| Ampel (`evalZoneStatus`) | Platzhalter → Stufe mindestens `warn`; Grund `zoneDataUnavailable` steht an **erster** Stelle der Gründe (das Banner zeigt nur die ersten zwei). Eine echte `nogo`-Zone in derselben Liste hält Rot. |
| Banner (`renderStatus`) | Zonenzeile zeigt den Grund; nie `zoneOk`. |
| Zonenliste (`renderZones`) | Kopfzeile `zonesUnavailable` statt `zonesNone`/`zonesCount`; Zähler `#z-count` zeigt `!` ohne die Klasse `ok`; statt einer Zonenkarte ein Hinweiskasten mit `zonesUnavailableHint` und einem Link auf die erste amtliche Quelle des Landes (`COUNTRY_ZONE_SOURCES[COUNTRY][0]`). Echte Zonen in derselben Liste (z. B. NOTAM) werden normal darunter gerendert; die Zahl in `zonesCount` zählt den Platzhalter nicht mit. |
| Kartenpanel (`renderMapStatus`) | Eintrag mit grauem Punkt `#64748b` und Text `zoneDataUnavailable`; nie `msNoRestr`. |

### Texte (fünf Sprachen)

| Schlüssel | de | en | fr | es | pl |
|---|---|---|---|---|---|
| `zoneDataUnavailable` | Zonendaten nicht verfügbar — Luftraum nicht geprüft | Zone data unavailable — airspace not checked | Données de zones indisponibles — espace aérien non vérifié | Datos de zonas no disponibles — espacio aéreo no comprobado | Dane stref niedostępne — przestrzeń nie została sprawdzona |
| `zonesUnavailable` | Zonendaten konnten nicht geladen werden. | Zone data could not be loaded. | Les données de zones n'ont pas pu être chargées. | No se pudieron cargar los datos de zonas. | Nie udało się wczytać danych stref. |
| `zonesUnavailableHint` | Der Luftraum an diesem Standort wurde nicht geprüft. Bitte erneut laden oder die amtliche Quelle prüfen: | The airspace at this location was not checked. Please reload or check the official source: | L'espace aérien à cet endroit n'a pas été vérifié. Rechargez ou consultez la source officielle : | El espacio aéreo en esta ubicación no se ha comprobado. Recargue o consulte la fuente oficial: | Przestrzeń w tym miejscu nie została sprawdzona. Odśwież lub sprawdź oficjalne źródło: |

### Mit erledigt (Review-Fundstellen aus v117)

- `renderStatus`: Fremddaten in der Wetterzeile (`wLine`, u. a. METAR-`icaoId` und
  Wolkenuntergrenze aus `metarCeilingMsg`) werden maskiert — an der Stelle, an der sie in den
  Text gelangen, ohne i18n-Texte doppelt zu maskieren.
- `renderMapStatus`: `it.color` wird nur als gültige Hex-Farbe (`/^#[0-9a-f]{3,8}$/i`) in das
  `style`-Attribut geschrieben, sonst `#64748b`.

## Tests

- `tests/client-zone-status.test.mjs` zieht `zoneDataUnavailable`, `evalZoneStatus` und
  `fetchZones` per Namenssuche aus `skycheck.html` und prüft mit Stubs: Platzhalter → `warn`
  mit Grund an erster Stelle; leere Liste → `go`; Platzhalter + PROHIBITED-Zone → `nogo`,
  Platzhalter-Grund trotzdem enthalten; werfender Adapter → `[Platzhalter]`; Adapter mit
  `[]` → `[]`; `fetchZones` wirft nie.
- Browserprüfung am Snapshot-Server mit abgeschalteter Function bzw. blockiertem Upstream
  für Norwegen, Österreich und Deutschland; hell und dunkel; Handy und Desktop.

## Version und Doku

`APP_VER = '26.10.117.1'`, `sw.js` `CACHE_NAME`, `CLAUDE.md`, fünf READMEs,
`SkyCheck_API_Dokumentation.md`, `docs/ROADMAP.md`, Wiki. Zusätzlich werden die beim
Wiki-Abgleich gefundenen Altlasten in der Repo-Doku behoben (Zeilenzahl, Hauptadresse
`skycheck-de.netlify.app` mit `enchanting-stardust-f713da` als Alt-Adresse, „v0.76"-Beispiel,
README-Architekturbaum und Länder-Tabelle, CartoDB-Abschnitt und Fußzeile der API-Doku).
