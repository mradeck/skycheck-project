# SkyCheck v26.10.117.1 — Zonendaten-Ausfall sichtbar machen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein fehlgeschlagener Geozonen-Abruf zeigt in allen zwölf Ländern „Zonendaten nicht verfügbar" mit mindestens gelber Ampel statt „keine Einschränkungen" in Grün.

**Architecture:** Die Punkt-Adapter werfen bei Fehlern; der Verteiler `fetchZones` wandelt jeden Fehler in einen Platzhalter-Eintrag (`unavailable: true`), der durch die bestehenden Wege läuft. `evalZoneStatus`, `renderZones` und `renderMapStatus` erkennen ihn und zeigen den Zustand an.

**Tech Stack:** Single-File-HTML/JS (`skycheck.html`), Node ≥ 18 Testrunner (`node --test`), keine neuen Abhängigkeiten.

**Spec:** `docs/superpowers/specs/2026-10-09-zonendaten-ausfall-design.md`

## Global Constraints

- Branch `hotfix/v117.1-zonendaten-ausfall`. Nur lokale Commits. **Kein `git push`, kein Merge, kein Tag.**
- Commit-Messages enden mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `skycheck.html` hat ~9.300 Zeilen: nie ganz lesen. Jeden Anker per `grep -n` suchen, Trefferzahl prüfen, ~40 Zeilen Umfeld lesen, dann editieren.
- Nach jeder Änderung an `skycheck.html`: `awk '/<script>$/{f=1;next} /<\/script>/{f=0} f' skycheck.html > "$TMPDIR/check.js" && node --check "$TMPDIR/check.js" && echo SYNTAX-OK`
- Ganze Suite: `node --test "tests/*.test.mjs"` (vorher 39/39). Vor jedem Commit grün gesehen haben.
- Alle Fremddaten, die in HTML landen, laufen durch `escapeHtml`; i18n-Texte nicht doppelt maskieren.
- Der Platzhalter ist exakt `{ unavailable: true, name: '', type: 'DATA_UNAVAILABLE', color: '#64748b', lower: '—', upper: '—', legal: '—', legalUrl: '', desc: '' }`.
- Ampel bei Ausfall: Gelb (`warn`), nie Rot allein wegen des Ausfalls, nie Grün.
- Ein erfolgreicher Abruf mit null Treffern bleibt unverändert grün.
- Nicht anfassen: `fetchAllZones…`, `ensureAllZones`, `fetchViewportZonesESEasa`, WMS-Kachel-Layer, NOTAM-Code (`loadNotamNo` usw.), Netlify-Functions.
- `APP_VER` wird erst in Task 3 geändert.

## Review Focus

1. Function antwortet mit HTTP 500/502/404 (nicht 2xx) → Platzhalter, nicht leere Liste (Task 1, alle Adapter).
2. Antwort ist 200, aber kein JSON (HTML-Fehlerseite eines Proxys) → Platzhalter (Task 1).
3. Deutschland: ein einzelner defekter Layer (ServiceException) darf NICHT als Ausfall zählen; kombinierte Abfrage nicht erreichbar → Ausfall (Task 1).
4. Sprachwechsel bei angezeigtem Ausfall → alle drei Stellen wechseln die Sprache (Task 2).
5. Ausfall plus gleichzeitig geladene NOTAM-Zone (Norwegen) → Rot bleibt, Hinweiskasten UND NOTAM-Karte sichtbar, Zähler zeigt `!` (Task 2).

---

### Task 1: Fehlervertrag — Adapter werfen, Verteiler liefert Platzhalter, Ampel reagiert

**Files:**
- Create: `tests/client-zone-status.test.mjs`
- Modify: `skycheck.html` (`fetchZones`, alle Punkt-Adapter, `_arcgisQuery`, `evalZoneStatus`, i18n-Schlüssel `zoneDataUnavailable`)

**Interfaces:**
- Produces: `function zoneDataUnavailable(): Zone` (Platzhalter); `fetchZones(lat, lon, radiusM): Promise<Zone[]>` wirft nie und liefert bei Adapterfehler `[zoneDataUnavailable()]` (für Norwegen mit vorangestellten NOTAM-Treffern); `evalZoneStatus` behandelt `z.unavailable`; i18n-Schlüssel `zoneDataUnavailable` ×5.

- [ ] **Step 1: Failing Test schreiben**

`tests/client-zone-status.test.mjs`:

```js
// Zieht reine Funktionen per Namenssuche aus skycheck.html und prüft sie mit Stubs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../skycheck.html', import.meta.url)), 'utf8');

function grab(name) {
  const m = html.match(new RegExp(`(async\\s+)?function ${name}\\(`));
  assert.ok(m, `Funktion ${name} nicht in skycheck.html gefunden`);
  const start = m.index;
  let depth = 0;
  for (let k = html.indexOf('{', html.indexOf(')', start)); k < html.length; k++) {
    if (html[k] === '{') depth++;
    else if (html[k] === '}' && --depth === 0) return html.slice(start, k + 1);
  }
  throw new Error(`Ende von ${name} nicht gefunden`);
}

const PLACEHOLDER = { unavailable: true, name: '', type: 'DATA_UNAVAILABLE', color: '#64748b',
  lower: '—', upper: '—', legal: '—', legalUrl: '', desc: '' };

// Gemeinsame Stubs für alles, was die herausgezogenen Funktionen aus dem Seitenkontext lesen.
function sandbox(extra = '') {
  return `
    const _t = k => (typeof k === 'string' ? 'T:' + k : k);
    const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
    const isCtrZone = () => false;
    ${extra}
    ${grab('zoneDataUnavailable')}
    ${grab('evalZoneStatus')}
  `;
}
const run = (body, extra) => new Function(`${sandbox(extra)}\n${body}`)();

test('Platzhalter hat exakt die vereinbarte Form', () => {
  assert.deepEqual(run('return zoneDataUnavailable();'), PLACEHOLDER);
});

test('leere Liste → go ohne Gründe (Erfolg ohne Treffer bleibt grün)', () => {
  assert.deepEqual(run('return evalZoneStatus([]);'), { lvl: 'go', reasons: [] });
});

test('nur Platzhalter → warn, Grund zoneDataUnavailable an erster Stelle', () => {
  const r = run('return evalZoneStatus([zoneDataUnavailable()]);');
  assert.equal(r.lvl, 'warn');
  assert.equal(r.reasons[0], 'T:zoneDataUnavailable');
});

test('Platzhalter + PROHIBITED-Zone → nogo, Ausfall-Grund steht trotzdem vorn', () => {
  const r = run(`return evalZoneStatus([
    { name: 'ENR412', type: 'PROHIBITED', notam: true }, zoneDataUnavailable()]);`);
  assert.equal(r.lvl, 'nogo');
  assert.equal(r.reasons[0], 'T:zoneDataUnavailable');
  assert.ok(r.reasons.length >= 2);
});

test('Platzhalter + gewöhnliche Zone → warn, Ausfall-Grund vorn, Zonenname dahinter', () => {
  const r = run(`return evalZoneStatus([
    { name: 'EEGZ1', type: 'REQ_AUTHORISATION' }, zoneDataUnavailable()]);`);
  assert.equal(r.lvl, 'warn');
  assert.deepEqual(r.reasons, ['T:zoneDataUnavailable', 'EEGZ1']);
});

// ── Verteiler ────────────────────────────────────────────────────────────────
function dispatcher(country, adapters, extra = '') {
  const names = ['fetchZonesCH', 'fetchZonesES', 'fetchZonesESEasa', 'fetchZonesAT', 'fetchZonesDK',
    'fetchZonesIE', 'fetchZonesNL', 'fetchZonesPT', 'fetchZonesFR', 'fetchZonesDE', 'fetchZonesEd269'];
  const stubs = names.map(n => `const ${n} = ${adapters[n] || 'async () => { throw new Error("nicht erwartet: ' + n + '"); }'};`).join('\n');
  return new Function(`
    const _t = k => 'T:' + k;
    const COUNTRY = ${JSON.stringify(country)};
    const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };
    const esEasa = () => false;
    const console = { warn() {}, info() {}, log() {} };
    ${extra || 'const notamNoHits = () => [];'}
    ${stubs}
    ${grab('zoneDataUnavailable')}
    ${grab('fetchZones')}
    return fetchZones(60, 10, 100);
  `)();
}

for (const [country, adapter] of [['de', 'fetchZonesDE'], ['fr', 'fetchZonesFR'], ['at', 'fetchZonesAT'],
  ['ch', 'fetchZonesCH'], ['es', 'fetchZonesESEasa'], ['dk', 'fetchZonesDK'], ['ie', 'fetchZonesIE'],
  ['nl', 'fetchZonesNL'], ['pt', 'fetchZonesPT'], ['lu', 'fetchZonesEd269'], ['ee', 'fetchZonesEd269']]) {
  test(`Verteiler ${country}: werfender Adapter → [Platzhalter], kein Wurf nach außen`, async () => {
    const adapters = { [adapter]: 'async () => { throw new Error("HTTP 500"); }' };
    const extra = country === 'es' ? 'const notamNoHits = () => []; const esEasaOverride = true;' : '';
    const result = country === 'es'
      ? await new Function(`
          const _t = k => 'T:' + k; const COUNTRY = 'es'; const ED269_COUNTRIES = { lu: 1, no: 1, ee: 1 };
          const esEasa = () => true; const console = { warn() {} }; const notamNoHits = () => [];
          const fetchZonesESEasa = async () => { throw new Error('HTTP 500'); };
          const fetchZonesES = async () => { throw new Error('nicht erwartet'); };
          ${grab('zoneDataUnavailable')}
          ${grab('fetchZones')}
          return fetchZones(40, -3, 100);`)()
      : await dispatcher(country, adapters, extra);
    assert.deepEqual(result, [PLACEHOLDER]);
  });
}

test('Verteiler: Adapter mit leerer Liste → leere Liste (kein Platzhalter)', async () => {
  assert.deepEqual(await dispatcher('at', { fetchZonesAT: 'async () => []' }), []);
});

test('Verteiler: Adapter mit Zonen → unverändert durchgereicht', async () => {
  const z = await dispatcher('dk', { fetchZonesDK: 'async () => [{ name: "A", type: "X" }]' });
  assert.deepEqual(z, [{ name: 'A', type: 'X' }]);
});

test('Verteiler Norwegen: Adapterfehler + geladene NOTAM-Treffer → NOTAM zuerst, dann Platzhalter', async () => {
  const z = await dispatcher('no', { fetchZonesEd269: 'async () => { throw new Error("502"); }' },
    'const notamNoHits = () => [{ name: "ENR412", type: "PROHIBITED", notam: true }];');
  assert.equal(z.length, 2);
  assert.equal(z[0].notam, true);
  assert.deepEqual(z[1], PLACEHOLDER);
});

test('Verteiler: synchron werfender Adapter wird ebenfalls abgefangen', async () => {
  const z = await dispatcher('ie', { fetchZonesIE: '() => { throw new Error("sync"); }' });
  assert.deepEqual(z, [PLACEHOLDER]);
});
```

- [ ] **Step 2: Fehlschlag bestätigen**

Run: `node --test tests/client-zone-status.test.mjs`
Expected: FAIL — `Funktion zoneDataUnavailable nicht in skycheck.html gefunden`.

- [ ] **Step 3: Platzhalter und Verteiler**

Direkt **vor** `async function fetchZones(lat, lon, radiusM = 100) {` einfügen:

```js
    // Platzhalter für einen fehlgeschlagenen Zonenabruf. Läuft wie eine Zone durch Liste,
    // Kartenpanel und Ampel; Texte werden erst beim Rendern über _t() gesetzt (Sprachwechsel).
    function zoneDataUnavailable() {
      return { unavailable: true, name: '', type: 'DATA_UNAVAILABLE', color: '#64748b',
        lower: '—', upper: '—', legal: '—', legalUrl: '', desc: '' };
    }
```

Den Rumpf von `fetchZones` so umbauen, dass die bisherige Länderauswahl in einer inneren
Funktion läuft und jeder Fehler (auch ein synchroner Wurf) zum Platzhalter wird. Zielbild:

```js
    async function fetchZones(lat, lon, radiusM = 100) {
      // Länderauswahl; jeder Adapter WIRFT bei fehlgeschlagenem Abruf (nie [] als Fehlerersatz).
      const adapter = async () => {
        if (COUNTRY === 'ch') return fetchZonesCH(lat, lon, radiusM);
        if (COUNTRY === 'es') return esEasa() ? fetchZonesESEasa(lat, lon, radiusM) : fetchZonesES(lat, lon, radiusM);
        if (COUNTRY === 'at') return fetchZonesAT(lat, lon, radiusM);
        if (COUNTRY === 'dk') return fetchZonesDK(lat, lon, radiusM);
        if (COUNTRY === 'ie') return fetchZonesIE(lat, lon, radiusM);
        if (COUNTRY === 'nl') return fetchZonesNL(lat, lon, radiusM);
        if (COUNTRY === 'pt') return fetchZonesPT(lat, lon, radiusM);
        if (COUNTRY === 'fr') return fetchZonesFR(lat, lon, radiusM);
        if (ED269_COUNTRIES[COUNTRY]) return fetchZonesEd269(lat, lon, radiusM);
        return fetchZonesDE(lat, lon, radiusM);
      };
      let zones;
      try {
        zones = await adapter();
        if (!Array.isArray(zones)) throw new Error('Zonen-Adapter lieferte keine Liste');
      } catch (error) {
        // Ein Ausfall darf nie wie „keine Zonen" aussehen → Platzhalter statt leerer Liste.
        console.warn('Zonendaten nicht verfügbar (' + COUNTRY + ')', error);
        zones = [zoneDataUnavailable()];
      }
      // Norwegen: geladene NOTAM-Treffer voranstellen (auch vor dem Platzhalter).
      return ED269_COUNTRIES[COUNTRY] ? notamNoHits(lat, lon, radiusM).concat(zones) : zones;
    }
```

Die vorhandene Reihenfolge der Länder-Zweige aus der Datei übernehmen, falls sie von oben
abweicht; die NOTAM-Voranstellung ersetzt den bisherigen `if (ED269_COUNTRIES[COUNTRY]) { … concat … }`-Block.

- [ ] **Step 4: Adapter werfen lassen**

Regel für jeden Punkt-Adapter: Wo heute bei einem **fehlgeschlagenen Abruf** `return []` steht
(nicht-OK-Antwort, `catch`), wird stattdessen geworfen bzw. der Fehler weitergereicht. `return []`
für „Abruf gelungen, nichts gefunden" bleibt. Adapter für Adapter (jeweils `grep -n "async function <name>"` und den Rumpf lesen):

- `_arcgisQuery`: `if (!r.ok) return [];` → `if (!r.ok) throw new Error('ArcGIS HTTP ' + r.status);`.
  **Achtung:** `_arcgisQuery` wird auch von den Overlay-Funktionen (`fetchAllZonesDK/IE/NL/PT`,
  `fetchViewportZonesESEasa`) benutzt. Prüfen, dass jede dieser Aufrufstellen einen Wurf
  abfängt (eigener `try/catch` oder der `.catch` in `ensureAllZones` / `drawEsEasaViewport`),
  sodass sich dort am Verhalten nichts ändert. Wo kein Fänger existiert, einen ergänzen, der
  wie bisher `[]` liefert — das Overlay ist nicht Teil dieser Änderung.
- `fetchZonesDK`, `fetchZonesIE`, `fetchZonesNL`, `fetchZonesPT`, `fetchZonesESEasa`: den
  äußeren `try { … } catch (e) { console.warn(…); return []; }` so ändern, dass der Fehler
  weitergeworfen wird (`throw e` nach dem `console.warn`, oder `try/catch` entfernen).
- `fetchZonesES`, `fetchZonesCH`: `if (!r.ok) return [];` → werfen; `catch` → weiterwerfen.
- `fetchZonesFR`: Erfolg → Zonen. Nicht-OK oder Fehler → in lokaler Vorschau den
  Datei-Fallback versuchen; scheitert er oder ist es keine lokale Vorschau → werfen.
- `fetchZonesAT`, `fetchZonesEd269`: Erfolg → Zonen. Sonst in lokaler Vorschau den
  Datei-Fallback; scheitert er oder ist es keine lokale Vorschau → werfen
  (`if (!IS_LOCAL_PREVIEW) throw new Error('… HTTP/Netzwerk')`).
- `fetchZonesDE`: Die innere `gfi`-Logik und die Einzel-Layer-Wiederholung bleiben. Neu:
  nach dem Block `if (combined.ok && !combined.failed) { … } else if (combined.ok) { … }`
  ein `else { throw new Error('DiPUL GetFeatureInfo nicht erreichbar'); }`. Im
  Wiederholungszweig zusätzlich: Hat **kein** Layer eine verwertbare Antwort geliefert
  (kein `p.status === 'fulfilled' && p.value.ok && !p.value.failed`) und wurde auch kein
  Layer als defekt aussortiert, dann werfen. Den Rest der Funktion (exakte
  Kontrollzonen-Abfrage `exactCtrPromise`, Deduplizierung) nicht verändern; schlägt nur die
  Zusatzabfrage `exactCtrPromise` fehl, ist das wie bisher kein Ausfall.

Nach diesem Schritt: `grep -n "return \[\];" skycheck.html` für den Bereich der Punkt-Adapter
durchgehen und für jeden verbleibenden Treffer im Bericht in einem Halbsatz begründen, warum
er „nichts gefunden" und nicht „fehlgeschlagen" bedeutet (oder zum Overlay gehört).

- [ ] **Step 5: Ampel**

In `function evalZoneStatus(zones)`: Der Platzhalter wird vor der Schleife behandelt, damit
sein Grund an erster Stelle steht. Direkt nach der Initialisierung von `reasons`/`lvl`/`seen`:

```js
      // Fehlgeschlagener Zonenabruf: mindestens Gelb, Grund an erster Stelle (Banner zeigt nur zwei).
      if (zones.some(z => z && z.unavailable)) {
        lvl = 'warn';
        const msg = _t('zoneDataUnavailable');
        seen.add(msg); reasons.push(msg);
      }
```

und in der Schleife als erste Zeile des Rumpfs: `if (z.unavailable) continue;`.
Die frühe Rückgabe `if (!zones || zones.length === 0) return { lvl: 'go', reasons: [] };` bleibt.
Prüfen, dass die bestehende Stufenlogik (`if (zLvl === 'nogo') lvl = 'nogo'; else if (lvl !== 'nogo') lvl = 'warn';`)
ein vorab gesetztes `warn` korrekt zu `nogo` anheben kann.

- [ ] **Step 6: i18n-Schlüssel**

In jedem der fünf Sprachblöcke direkt nach dem Eintrag `eeStaleHint:` (genau einmal je Block)
einfügen — Texte wörtlich aus der Spec, Tabelle „Texte", Zeile `zoneDataUnavailable`.

- [ ] **Step 7: Andere Verbraucher prüfen**

`grep -n "lastZones\|applyCtrFlightInfo\|isCtrZone(\|ctrPopupHtml\|\.zoneNum\|inDfsCtr" skycheck.html`
durchgehen: Jede Stelle, die über Zonen iteriert, muss den Platzhalter (`name: ''`, keine
`geometry`, `type: 'DATA_UNAVAILABLE'`) ohne Fehler und ohne falsche Einstufung durchlassen.
Besonders `isCtrZone` und `applyCtrFlightInfo` lesen: `DATA_UNAVAILABLE` darf nicht als
Kontrollzone gelten. Nur wo nötig eine Zeile `if (z.unavailable) …` ergänzen; im Bericht jede
geprüfte Stelle mit Ergebnis nennen.

- [ ] **Step 8: Tests und Checks**

Run: `node --test tests/client-zone-status.test.mjs` → alle PASS.
Run: `node --test "tests/*.test.mjs"` → alle PASS (39 + neue).
Run: Syntaxcheck → `SYNTAX-OK`.

- [ ] **Step 9: Commit**

```bash
git add skycheck.html tests/client-zone-status.test.mjs
git commit -m "fix(client): fehlgeschlagener Zonenabruf wird Platzhalter mit gelber Ampel statt leerer Liste

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Anzeige — Zonenliste, Kartenpanel, Texte; zwei Escaping-Fundstellen

**Files:**
- Modify: `skycheck.html` (`renderZones`, `renderMapStatus`, `renderStatus`/METAR-Grund, CSS, i18n)
- Modify: `tests/client-zone-status.test.mjs` (zwei Tests ergänzen)

**Interfaces:**
- Consumes: Platzhalter mit `unavailable: true` (Task 1), i18n `zoneDataUnavailable` (Task 1), `COUNTRY_ZONE_SOURCES`, `escapeHtml`, `_t`.
- Produces: i18n `zonesUnavailable`, `zonesUnavailableHint` ×5; CSS-Klasse `.z-unavailable`.

- [ ] **Step 1: i18n**

Je Sprachblock direkt nach `zoneDataUnavailable:` die Schlüssel `zonesUnavailable` und
`zonesUnavailableHint` einfügen — Texte wörtlich aus der Spec, Tabelle „Texte". Französische
Apostrophe im JS-String korrekt maskieren (wie die Nachbarzeilen es tun, z. B. `\'`).

- [ ] **Step 2: Zonenliste (`renderZones`)**

Verhalten laut Spec, Tabelle „Anzeige", Zeile Zonenliste:

- `const unavailable = zones.some(z => z && z.unavailable); const real = zones.filter(z => !(z && z.unavailable));`
- Zähler `#z-count`: bei Ausfall Text `!` und Klasse `z-count` (ohne `ok`); sonst wie bisher mit `real.length`.
- Kopfzeile `#zones-hdr-text`: bei Ausfall `escapeHtml(_t('zonesUnavailable'))`, ggf. gefolgt von
  einem Leerzeichen und `_t('zonesCount')(real.length)`, wenn `real.length > 0`; sonst wie bisher.
- `#zones-body`: bei Ausfall zuerst ein Kasten

  ```js
  `<div class="z-item z-unavailable">
     <div class="z-name">⚠ ${escapeHtml(_t('zoneDataUnavailable'))}</div>
     <div class="z-details">${escapeHtml(_t('zonesUnavailableHint'))}
       <a href="${encodeURI(src.url)}" target="_blank" rel="noopener" style="color:var(--accent);">${escapeHtml(src.label)} ↗</a>
     </div>
   </div>`
  ```

  mit `const src = (COUNTRY_ZONE_SOURCES[COUNTRY] || COUNTRY_ZONE_SOURCES.de)[0];`, danach die
  Karten der echten Zonen wie bisher (die bestehende `.map(...)`-Vorlage auf `real` anwenden).
- `lastZones = zones;` bleibt die **vollständige** Liste inklusive Platzhalter (Sprachwechsel
  und Re-Render lesen sie).

CSS direkt nach der in v117 eingefügten Regel `.z-notam { … }`:

```css
    .z-unavailable { border-left: 3px solid #f59e0b; }
    .z-unavailable .z-details { display: block; font-size: 0.85rem; line-height: 1.45; }
```

- [ ] **Step 3: Kartenpanel (`renderMapStatus`)**

In der inneren Funktion `simplify` als **erste** Prüfung:
`if (z?.unavailable) return { label: escapeHtml(_t('zoneDataUnavailable')), color: '#64748b' };`
Sicherstellen, dass bei einer Liste, die nur den Platzhalter enthält, weder `msNoRestr` noch ein
leerer Eintrag erscheint (die Stelle lesen, an der `items` gebaut und der „keine
Einschränkungen"-Fall entschieden wird).

Farbe härten: An der Stelle, an der `it.color` in das `style`-Attribut geschrieben wird, nur
gültige Hex-Farben zulassen:
`const dot = /^#[0-9a-f]{3,8}$/i.test(it.color || '') ? it.color : '#64748b';` und `dot` verwenden.

- [ ] **Step 4: Wetterzeile im Banner maskieren**

`renderStatus` schreibt `wLine = s.reasons[0] || …` unmaskiert in `innerHTML`. Vorgehen:
`grep -n "reasons.push\|reasons.unshift" skycheck.html` — alle Stellen, die Wettergründe
erzeugen, durchgehen und feststellen, welche Fremddaten enthalten (bekannt:
`metarCeilingMsg(icao, ceil)` mit METAR-`icaoId` und Wolkenuntergrenze). Dort die Fremdwerte
vor dem Einsetzen durch `escapeHtml` schicken (an der Eintrittsstelle, wie bei den Zonennamen
in v117). Nicht pauschal `escapeHtml(wLine)` an der Senke — vorher prüfen, ob irgendein
Wettergrund absichtlich HTML/Entities enthält; wenn keiner es tut, ist die Senke die bessere
Stelle. Im Bericht die gewählte Variante begründen und für einen ICAO-Wert
`<img src=x onerror=1>` zeigen, was im HTML landet.

- [ ] **Step 5: Tests ergänzen**

In `tests/client-zone-status.test.mjs` zwei Tests anhängen, die `renderZones` mit einem
minimalen DOM-Stub prüfen (Elemente als einfache Objekte mit `textContent`, `className`,
`innerHTML`; `$ = id => els[id]`):

1. `[Platzhalter]` → `z-count.textContent === '!'`, `className` ohne `ok`, Kopfzeile enthält
   `T:zonesUnavailable`, Body enthält `z-unavailable`, `T:zonesUnavailableHint` und die URL der
   Länderquelle; Body enthält **nicht** den Text von `zonesNone`.
2. `[NOTAM-Zone, Platzhalter]` → Zähler `!`, Body enthält `z-unavailable` **und** den
   NOTAM-Zonennamen.

Die für `renderZones` nötigen Stubs (`ctrHeightHtml = () => ''`, `getLegalLink = () => '#'`,
`COUNTRY`, `COUNTRY_ZONE_SOURCES`, `lastZones` als `let`) im Test definieren. Zeigt sich, dass
`renderZones` zu viele weitere Abhängigkeiten hat, um so herausgezogen zu werden, die beiden
Fälle stattdessen als dokumentierten Node-Smoke-Test im Bericht belegen und das im Bericht
begründen (kein stiller Verzicht).

- [ ] **Step 6: Checks und Commit**

Syntaxcheck, ganze Suite grün. Zusätzlich:
`for k in zoneDataUnavailable zonesUnavailable zonesUnavailableHint; do printf '%s %s\n' "$k" "$(grep -o "$k:" skycheck.html | wc -l | tr -d ' ')"; done` → je `5`.

```bash
git add skycheck.html tests/client-zone-status.test.mjs
git commit -m "fix(client): Zonendaten-Ausfall in Zonenliste und Kartenpanel anzeigen; Wetterzeile und Punktfarbe härten

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Version v26.10.117.1 und Dokumentation (inkl. Altlasten)

**Files:**
- Modify: `skycheck.html` (nur `APP_VER`), `sw.js` (`CACHE_NAME`), `CLAUDE.md`, `README.md`, `README.de.md`, `README.fr.md`, `README.es.md`, `README.pl.md`, `SkyCheck_API_Dokumentation.md`, `docs/ROADMAP.md`

- [ ] **Step 1: Version**

`const APP_VER = '26.10.117.0';` → `'26.10.117.1'`; `sw.js` Zeile 1 `skycheck-26.10.117.0` → `skycheck-26.10.117.1`.

- [ ] **Step 2: Release-Doku**

- `CLAUDE.md`: Feld `**Aktuell:**` (eine Zeile mit vielen tausend Zeichen — nur per Skript mit
  exakter Einzelersetzung von `**Aktuell:** v26.10.117.0 — ` bearbeiten) erhält vorangestellt:
  `v26.10.117.1 — **Zonendaten-Ausfall wird sichtbar.** Ein fehlgeschlagener Geozonen-Abruf (HTTP-Fehler, Timeout, offline) sah bisher in allen Ländern aus wie „keine Zonen" (grüne Ampel). Jetzt werfen die Punkt-Adapter bei Fehlern; der Verteiler \`fetchZones\` liefert einen Platzhalter (\`unavailable: true\`, \`zoneDataUnavailable()\`), \`evalZoneStatus\` setzt mindestens Gelb mit dem Grund an erster Stelle, die Zonenliste zeigt einen Hinweiskasten mit Link zur amtlichen Quelle (Zähler „!"), das Kartenpanel einen grauen Eintrag. Erfolg ohne Treffer bleibt grün; lokale Datei-Fallbacks und die DiPUL-Einzel-Layer-Wiederholung bleiben. Zusätzlich: Fremddaten in der Wetterzeile des Banners maskiert, Punktfarbe im Kartenpanel auf Hex-Farben beschränkt. Nicht Teil der Änderung: das flächige Karten-Overlay. Vorgänger `
  gefolgt vom bisherigen Text ab `v26.10.117.0 — `.
- `CLAUDE.md` Versions-Historie: neue erste Zeile `| v26.10.117.1 | … |` mit demselben Inhalt
  plus Testzahl (aus der `ℹ tests`-Zeile der Suite) und den neuen i18n-Schlüsseln.
- `CLAUDE.md` Anker-Map: Zeile `| \`function zoneDataUnavailable()\` | vor \`fetchZones\` | Platzhalter für fehlgeschlagenen Zonenabruf; \`fetchZones\` wirft nie |` ergänzen; die `APP_VER`-Zeile auf die neue Nummer und die tatsächliche Zeilennummer (`grep -n "const APP_VER" skycheck.html`).
- Fünf READMEs: Versionsangabe im Kopf (falls vorhanden) und je eine neue Historienzeile
  `| v26.10.117.1 | … |` direkt über der Zeile `| v26.10.117.0 |`, in der Sprache der Datei:
  fehlgeschlagener Zonenabruf zeigt jetzt „Zonendaten nicht verfügbar" mit gelber Ampel statt
  „keine Einschränkungen"; gilt für alle zwölf Länder; Hinweiskasten mit Link zur amtlichen Quelle.
- `docs/ROADMAP.md`: falls dort ein offener Punkt zum fail-open-Verhalten steht, abhaken; sonst unverändert.

- [ ] **Step 3: Altlasten in der Repo-Doku beheben**

Vor dem Ändern jeweils die tatsächlichen Werte ermitteln (`wc -l skycheck.html`,
`ls netlify/functions data scripts .github/workflows tests`).

- `CLAUDE.md`: „~5290 Zeilen" → tatsächliche Zeilenzahl (gerundet, `~9.3k`); Hauptadresse ist
  `https://skycheck-de.netlify.app/` — überall, wo `enchanting-stardust-f713da.netlify.app` als
  Live-/Verifikationsadresse steht (Kopf, Hybrid-Workflow-Befehle, Cowork-Abschnitt,
  Fallstricke-Tabelle), auf `skycheck-de.netlify.app` umstellen und einmal vermerken, dass
  `enchanting-stardust-f713da.netlify.app` als Alt-Adresse weiterhin ausliefert; die
  Fallstrick-Zeile „Netlify-URL falsch" entsprechend korrigieren; das Beispiel
  `## 2026-05-15 10:00 — SkyCheck v0.76` im Session-Start-Protokoll auf ein Beispiel im
  aktuellen Schema ändern (`## 2026-10-09 10:00 — SkyCheck v26.10.117.1`). In der
  Patch-Checkliste Punkt 7 („Wiki-Updates …") so fassen: Wiki-Updates sind Teil jedes Pushs —
  Projektübersicht `SkyCheck.md`, Changelog, Architektur, Log, Index; vor „Push erledigt"
  prüfen, veraltete Doku beheben statt nur melden.
- Fünf READMEs: „~5.2k Zeilen" o. ä. → aktueller Wert; Architektur-Baum um
  `netlify/functions/zones-ed269.js`, `netlify/functions/notam-no.js`,
  `data/uas-zones-{lu,no,ee}.json`, `scripts/build-eu-zones.mjs`, `tests/`,
  `.github/workflows/update-eu-zones.yml` und `update-de-airac.yml` ergänzen (nur was real
  existiert); die Multi-Country-Tabelle weiter unten um die fehlenden Länder NL, PT, LU, NO, EE
  ergänzen (Muster der vorhandenen Zeilen übernehmen; Quellen: NL/PT EASA Common Repository,
  LU DAC Luxembourg, NO Luftfartstilsynet/dronesoner.no, EE EANS). In jeder der fünf Dateien
  einzeln prüfen — die Stellen können je Sprache anders aussehen.
- `SkyCheck_API_Dokumentation.md`: den CartoDB-Abschnitt auf OpenStreetMap-Kacheln umstellen
  (CARTO wurde in v26.08.116.1 entfernt; Dark = OSM per CSS-Filter invertiert) und
  „CartoDB Tiles" in der Gesamtübersicht ersetzen; die Fußzeile „SkyCheck v0.15 Quellcode ·
  April 2026" auf `SkyCheck v26.10.117.1 · Oktober 2026`; in der Gesamtübersicht fehlende,
  real genutzte Dienste ergänzen, sofern sie im Code vorkommen
  (`grep -o "https\?://[a-zA-Z0-9.-]*" skycheck.html | sort -u`): AWC (über die Function `awc`),
  Open-Meteo, Terrain-Kacheln (AWS), DiPUL-WFS. Den vereinfachten `gfz.js`-Ausschnitt mit einem
  Satz als vereinfacht kennzeichnen statt ihn umzuschreiben.

- [ ] **Step 4: Gesamtprüfung und Commit**

```bash
node --test "tests/*.test.mjs" 2>&1 | grep -E "^ℹ (tests|pass|fail)"
awk '/<script>$/{f=1;next} /<\/script>/{f=0} f' skycheck.html > "$TMPDIR/check.js" && node --check "$TMPDIR/check.js" && echo SYNTAX-OK
grep -n "const APP_VER" skycheck.html; head -1 sw.js
grep -rn --exclude-dir=.git --exclude-dir=superpowers --exclude-dir=.superpowers "5290\|5\.2k\|v0\.76\|v0\.15 Quellcode\|CartoDB" . | cut -c1-140
grep -rn --exclude-dir=.git --exclude-dir=superpowers --exclude-dir=.superpowers "enchanting-stardust" . | cut -c1-160
```

Expected: Suite grün; `SYNTAX-OK`; neue Versionsstrings; die vierte Suche liefert nur noch
Treffer in Historienzeilen älterer Versionen (jede im Bericht begründen); die fünfte nur die
Stellen, die die Alt-Adresse ausdrücklich als solche nennen.

```bash
git add skycheck.html sw.js CLAUDE.md README.md README.de.md README.fr.md README.es.md README.pl.md SkyCheck_API_Dokumentation.md docs/ROADMAP.md
git commit -m "SkyCheck v26.10.117.1 — Zonendaten-Ausfall sichtbar: Version + Dokumentation, Doku-Altlasten behoben

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Nach den Tasks (Controller)

1. Browserprüfung am Snapshot-Server (außerhalb des Arbeitsbaums) mit erzwungenem Function-Fehler: Norwegen, Österreich, Deutschland; hell und dunkel; Handy und Desktop; Sprachwechsel bei angezeigtem Ausfall.
2. Whole-Branch-Review (Opus), eine Fixwelle.
3. Wiki (Changelog, Log, `SkyCheck.md`, Architektur, Index) zusammen mit dem Push.
4. Push/Release nur auf ausdrückliche Ansage.
