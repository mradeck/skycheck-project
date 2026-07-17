**🌍 Idioma:** [English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Español** · [Polski](README.pl.md)

---

# SkyCheck — Verificación de vuelo de drones (DE · FR · AT · CH · ES · DK · IE)

**SkyCheck** es una aplicación web monopágina gratuita para verificar rápidamente, antes del despegue, las condiciones de un vuelo de drone. La app agrega datos en tiempo real de varias fuentes oficiales y ofrece una recomendación de vuelo inmediata. Nuestros casos de uso: topografía, inspección, vídeos corporativos, producciones de TV y cine, así como formación para la licencia de drone A2/STS en [www.multikopterschule.de](https://www.multikopterschule.de).

> 🔒 **Privacidad ante todo · se ejecuta en el navegador · nada que instalar.**
> SkyCheck no recopila ningún dato, no realiza ningún rastreo y no necesita cuenta ni registro — no puede espiarte porque no hay ningún backend que almacene nada. Todo se ejecuta directamente en tu navegador; los datos que ves se cargan en directo y desaparecen en el momento en que cierras la pestaña. Tampoco hay nada que instalar: «añadirla a la pantalla de inicio» (como PWA) simplemente crea un acceso directo que abre esta página web — en esencia, un marcador con un icono. No se descarga ningún paquete de app, no se conceden permisos y no se ejecuta ningún proceso en segundo plano.

La meteorología, el tráfico aéreo, METAR/TAF, el índice Kp y la geocodificación son idénticos en todas partes; solo la **fuente de geozonas** es específica de cada país y se selecciona automáticamente a partir del nombre de host.

## 🌐 Sitios en vivo

| País | App en vivo | Fuente de geozonas |
|---|---|---|
| 🇩🇪 **Alemania** | [skycheck-de.netlify.app](https://skycheck-de.netlify.app/) | DiPUL WMS — `uas-betrieb.de` |
| 🇫🇷 **Francia** | [skycheck-fr.netlify.app](https://skycheck-fr.netlify.app/) | Conjunto de datos ED-269 (zonas UAS francesas) |
| 🇦🇹 **Austria** | [skycheck-at.netlify.app](https://skycheck-at.netlify.app/) | Austro Control ED-269 — actualizado automáticamente cada mes |
| 🇨🇭 **Suiza** | [skycheck-ch.netlify.app](https://skycheck-ch.netlify.app/) | BAZL / geo.admin.ch — WMS + API Identify |
| 🇪🇸 **España** | [skycheck-es.netlify.app](https://skycheck-es.netlify.app/) | EASA Common Repository (vectorial) **o** ENAIRE servAIS (WMS) — conmutable en la pantalla de inicio, EASA por defecto |
| 🇩🇰 **Dinamarca** | [skycheck-dk.netlify.app](https://skycheck-dk.netlify.app/) | Trafikstyrelsen — ArcGIS FeatureServer (vectorial) |
| 🇮🇪 **Irlanda** | [skycheck-ie.netlify.app](https://skycheck-ie.netlify.app/) | EASA Common Repository — ArcGIS (vectorial, preliminar) |

> Los siete son el **mismo** despliegue de `skycheck.html` de este repositorio, cada uno servido en su propio sitio Netlify. Detección de país: nombre de host (`skycheck-<xx>.netlify.app`) o el parámetro URL `?country=de|fr|at|ch|es|dk|ie`. Por defecto: `de`. Cada variante de país también preajusta el **idioma de la interfaz**, una **sugerencia de búsqueda con un monumento de la capital** y la **búsqueda de direcciones acotada al país**.

📦 **Versión actual:** v0.93

---

## Funciones

| Área | Detalles |
|---|---|
| **Recomendación de vuelo** | Sistema de semáforo (Go / Aviso / No-Go) basado en viento, ráfagas, precipitaciones e índice Kp |
| **Meteorología** | Ráfagas, velocidad y dirección del viento, temperatura, punto de rocío, visibilidad, nubosidad, precipitación — datos DWD vía BrightSky |
| **METAR / TAF** | Datos meteorológicos aeronáuticos en tiempo real de aeródromos cercanos (NOAA Aviation Weather Center), con indicador de categoría de vuelo VFR / MVFR / IFR / LIFR |
| **Perfil de viento** | Extrapolación de la velocidad del viento por altitud (10 / 60 / 120 / 150 m AGL) mediante ley de potencia |
| **Índice Kp** | Valor Kp actual de NOAA + gráfico de barras Hp30 de GFZ Potsdam (últimas 4 × 30 min + previsión) |
| **Tráfico aéreo** | Movimientos ADS-B en tiempo real en el entorno con colores de altitud e iconos de radar (Airplanes.live) |
| **Vista de alarma de aeronaves** | Mapa a pantalla completa con alarma acústica de aeronaves: avisa de aeronaves aproximándose dentro de un radio configurable |
| **Mapa de espacio aéreo** | Geozonas de drones específicas de cada país (DE: DiPUL · FR/AT: ED-269 · CH: geo.admin.ch · ES: ENAIRE · DK/IE: ArcGIS) — zonas de exclusión, zonas de control, reservas naturales; radio de búsqueda conmutable entre 5 m y 100 m |
| **Previsión 48 h** | Previsión meteorológica horaria a 2 días (desplazable, semáforo de vuelo de drone por hora) |
| **Resumen de 5 días** | Vista diaria con temperaturas mín/máx, viento y evaluación tricolor |
| **Avisos y advertencias** | Advertencias contextuales (interferencia GPS con Kp alto, tráfico aéreo elevado, motivo de no-fly) |
| **5 idiomas** | Alemán, inglés, francés, español, polaco — conmutables en la página de inicio |
| **PWA** | Instalable como app web (banner de instalación con margen de 30 días), funciona sin conexión para contenido estático |

---

## Tecnología

- **HTML/JS/CSS en un único archivo** — sin herramientas de build, sin dependencias, sin framework
- **Leaflet.js** para el mapa interactivo
- **Service Worker** (`sw.js`) + **Web App Manifest** (`manifest.json`) para soporte PWA
- **Netlify** para alojamiento y funciones serverless (proxys CORS)

---

## Fuentes de datos

| Fuente | Datos | CORS |
|---|---|---|
| [DWD BrightSky](https://brightsky.dev/) | Datos meteorológicos (por hora, 7 días) | ✅ |
| [NOAA Aviation Weather Center](https://aviationweather.gov/) | METAR / TAF | ❌ → Netlify Function `awc.js` |
| [GFZ Potsdam](https://kp.gfz.de/) | Índice Kp, Hp30 (resolución 30 min) | ❌ → Netlify Function `gfz.js` |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Respaldo de índice Kp | ✅ |
| [Airplanes.live](https://airplanes.live/) | Movimientos de vuelo ADS-B | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geocodificación / búsqueda de lugares | ✅ |
| [Windy.com](https://www.windy.com/) | Enlace externo para vista detallada de nubes | — |
| **Geozonas 🇩🇪** [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Zonas de espacio aéreo para drones (WMS + GetFeatureInfo) | ✅ |
| **Geozonas 🇫🇷** Conjunto de datos ED-269 | Zonas UAS francesas (`data/uas-zones-fr.json`) | vía `zones-fr.js` |
| **Geozonas 🇦🇹** [Austro Control / dronespace.at](https://www.dronespace.at/) | Zonas UAS austriacas, ED-269 (`data/uas-zones-at.json`) | vía `zones-at.js` |
| **Geozonas 🇨🇭** [BAZL / geo.admin.ch](https://www.geo.admin.ch/) | Zonas UAS suizas `ch.bazl.einschraenkungen-drohnen` (WMS + Identify) | ✅ |
| **Geozonas 🇪🇸** [ENAIRE servAIS](https://www.enaire.es/) / [EASA Common Repository](https://www.easa.europa.eu/) | Zonas UAS españolas — ENAIRE `SRV_UAS_ZG_V0` (WMS + ArcGIS Identify) **o** EASA `geozone_EASA` (vectorial ArcGIS, basado en el área visible); conmutable, EASA por defecto | ✅ |
| **Geozonas 🇩🇰** [Trafikstyrelsen](https://www.droneregler.dk/) | Zonas UAS danesas (ArcGIS FeatureServer, GeoJSON) | ✅ |
| **Geozonas 🇮🇪** [EASA Common Repository](https://www.easa.europa.eu/) | Zonas UAS irlandesas `ie_geozones` (ArcGIS, ED-318, preliminar) | ✅ |

---

## Arquitectura

```
skycheck.html               ← app completa (HTML + CSS + JS, ~5,2k líneas)
manifest.json               ← manifiesto Web App PWA
sw.js                       ← Service Worker (caché)
icon-192x192.png            ← icono de la app (pequeño)
icon-512x512.png            ← icono de la app (grande)
skycheck-icon.svg           ← icono fuente (vectorial)
netlify.toml                ← config Netlify (includes del bundle de funciones + reescritura de URL raíz)
netlify/
  functions/
    awc.js                  ← proxy NOAA AWC para METAR/TAF (sortea CORS)
    gfz.js                  ← proxy GFZ Potsdam para Kp/Hp30
    zones-fr.js             ← zonas UAS Francia (lee data/uas-zones-fr.json, filtrado por bbox)
    zones-at.js             ← zonas UAS Austria (lee data/uas-zones-at.json; ?all=1 = overlay completo)
data/
  uas-zones-fr.json         ← zonas UAS Francia ED-269 (snapshot mensual, sustituible)
  uas-zones-at.json         ← zonas UAS Austria ED-269 (286 zonas, actualizado automáticamente)
  uas-zones-at.version      ← marcador de la última release de Austro Control importada (idempotencia)
.github/
  workflows/
    update-at-zones.yml     ← job mensual: obtiene la ED-269 más reciente de Austro Control → commit del fichero de datos
redirect.html               ← página de redirección opcional
```

> 🇨🇭 **CH no necesita nada de lo anterior** — la superposición del mapa es la capa WMS de geo.admin.ch y el detalle de las zonas proviene de la API REST Identify de geo.admin.ch, ambas invocadas directamente desde el navegador (CORS abierto). Sin función Netlify, sin fichero de datos alojado, sin workflow de actualización.

### Soporte multi-país (desde v0.73)

SkyCheck usa un **patrón de adaptador** para las fuentes de geozonas específicas de cada país. El país se detecta a través del nombre de host (p. ej. `skycheck-ch.netlify.app`) o del parámetro URL `?country=de|fr|at|ch|es|dk|ie`. Por defecto: `de`. La meteorología, ADS-B, METAR/TAF y el índice Kp son globales; el **idioma de la interfaz, el monumento de la sugerencia de búsqueda y el bounding box de geocodificación** se ajustan por país.

| País | Fuente de geozonas | Superposición | Lista de detalle / estado | Datos y actualizaciones |
|---|---|---|---|---|
| 🇩🇪 **DE** (por defecto) | DiPUL WMS (`uas-betrieb.de`) | teselas WMS | WMS GetFeatureInfo | servicio en vivo (oficial, siempre actual) |
| 🇫🇷 **FR** | Conjunto de datos ED-269 | polígonos/círculos en el cliente | `zones-fr.js` (filtro bbox) | `data/uas-zones-fr.json` (~3,6k zonas, sustituible) |
| 🇦🇹 **AT** | Austro Control ED-269 | todas las zonas dibujadas en el cliente (286) | `zones-at.js` (filtro bbox) | `data/uas-zones-at.json` — **actualizado automáticamente cada mes** vía GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | teselas WMS | API REST **Identify** de geo.admin.ch | servicio en vivo (CORS abierto) — **sin función, sin fichero, sin workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | teselas WMS | API REST **Identify** de ArcGIS | servicio en vivo (CORS abierto) — **sin función, sin fichero, sin workflow** |
| 🇩🇰 **DK** | ArcGIS FeatureServer de Trafikstyrelsen | polígonos vectoriales en el cliente (~870, codificados por color) | consulta ArcGIS (bbox) | servicio en vivo (CORS abierto) — **sin función, sin fichero, sin workflow** |
| 🇮🇪 **IE** | EASA Common Repository `ie_geozones` | polígonos vectoriales en el cliente (76) | consulta ArcGIS (bbox) | servicio en vivo (CORS abierto, datos de EASA **preliminares**) |

Tres estilos de integración: **WMS + consulta por punto** (DE, CH, ES — servicios oficiales en vivo que renderizan todo el país y responden consultas por punto directamente), **vectorial ArcGIS en el cliente** (DK, IE — GeoJSON obtenido en vivo de un ArcGIS FeatureServer, dibujado como polígonos codificados por color) y **fichero ED-269 alojado + función Netlify** (FR, AT — un conjunto de datos JSON en el repositorio, filtrado por bbox en el servidor; AT se refresca solo cada mes).

### ¿Cuántas geozonas por país?

Recuentos de zonas obtenidos directamente de la fuente en vivo de cada país (DE vía DiPUL WFS en las 31 categorías; ES vía ENAIRE ArcGIS; FR/AT desde los conjuntos de datos ED-269; CH desde el GeoJSON de geo.admin.ch; DK/IE vía ArcGIS FeatureServer), normalizados por superficie terrestre:

| País | Geozonas | Superficie (km²) | Zonas por 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Alemania** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 España | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Suiza | 1 232 | 41 285 | ≈ 30 |
| 🇩🇰 Dinamarca | 870 | 42 952 | ≈ 20 |
| 🇫🇷 Francia | 3 642 | 551 695 | ≈ 6,6 |
| 🇦🇹 Austria | 286 | 83 879 | ≈ 3,4 |
| 🇮🇪 Irlanda\* | 76 | 70 273 | ≈ 1,1 |

\* La cifra de Irlanda procede del EASA Common Repository, que aún es **preliminar** (el conjunto de datos nacional del IAA registra ~87), por lo que su recuento es indicativo, no completo.

**Alemania destaca enormemente** — aproximadamente **5,6×** el recuento absoluto del siguiente país (España) y unas **8×** la densidad de zonas de España/Suiza, **37×** la de Francia y **73×** la de Austria. El motivo es la zonificación excepcionalmente detallada de Alemania: designa zonas para categorías que los demás en gran medida no cubren — p. ej. **instalaciones industriales (24 482), propiedades residenciales (10 793), instalaciones ferroviarias (9 819), reservas naturales (9 012), incluso piscinas al aire libre (6 600)**. (La granularidad del recuento difiere entre los conjuntos de datos nacionales, lo cual es precisamente el punto: Alemania zonifica muchas más categorías con una resolución mucho más fina.)

### Base legal — las zonas son públicas por el derecho de la UE

Según el **artículo 15, apartado 3, del Reglamento de Ejecución (UE) 2019/947**, todo Estado miembro que defina geozonas UAS **debe poner esa información a disposición pública en un formato digital común y único** — la norma EUROCAE **ED-269 / ED-318** — explícitamente *con fines de concienciación geográfica*, es decir, para que aplicaciones y sistemas como SkyCheck puedan informar a los pilotos. La **Directiva de Datos Abiertos (UE) 2019/1024** enmarca además estos datos geoespaciales del sector público como reutilizables (lo geoespacial es una categoría de «conjuntos de datos de alto valor»). En resumen: la ley exige que los datos sean de acceso abierto; SkyCheck solo muestra la fuente oficial de cada país, con atribución. Las condiciones exactas de reutilización se fijan a nivel nacional, por lo que los proveedores de datos se acreditan arriba.

### Netlify Functions (proxys CORS)

Las API Aviation Weather y GFZ no envían cabeceras CORS, por lo que pasan por funciones Netlify:

- `awc.js` — redirige `aviationweather.gov/api/data/{metar,taf}`, añade cabeceras CORS, 10 s de timeout, caché de 90 s
- `gfz.js` — redirige las solicitudes a `kp.gfz.de` (Kp, Hp30)

### Carga asíncrona

La meteorología, el tráfico aéreo, METAR/TAF y el índice Kp se cargan en paralelo. La tesela GFZ Hp30 carga de forma asíncrona en segundo plano sin bloquear la vista principal — la página de estado aparece así en ~1 segundo.

### Detección de geozonas (DiPUL WMS GetFeatureInfo)

La petición WMS `GetFeatureInfo` usa una rejilla de 101×101 píxeles. El radio efectivo de búsqueda se controla mediante el tamaño del bounding box `δ`:

```javascript
δ = Math.max(0.001134, radiusM * 101 / (4 * 111320))
```

Esto permite escalar con precisión el radio de búsqueda entre 5 m y 100 m (calibrado empíricamente).

---

## Desarrollo local

```bash
# Servidor HTTP simple (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# Con Netlify Functions (recomendado — si no, sin METAR/TAF/Kp)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888/skycheck.html
```

> **Nota:** Sin `netlify dev`, las tarjetas METAR/TAF y GFZ fallan en local porque `/.netlify/functions/*` no está disponible. La meteorología, ADS-B y el espacio aéreo funcionan también con el servidor HTTP simple.

---

## Recomendación de vuelo — lógica de evaluación

| Criterio | Aviso | No-Go |
|---|---|---|
| Ráfagas | > 7 m/s | > 10 m/s |
| Índice Kp | > 3,3 (GPS degradado) | > 5,0 (GPS poco fiable) |
| Precipitación | > 0 mm | > 0,3 mm |
| Geozona | sin restricciones, zona tampón natural | zona de exclusión activa |

---

## Historial de versiones (extracto)

| Versión | Cambio |
|---|---|
| v0.93 | Pulido de la pantalla de inicio y precisión por país. (1) Nuevo mosaico de inicio «SkyCheck en otros países» que enumera todas las variantes de los demás países como enlaces directos, con el mismo estilo del logotipo (Sky en blanco · Check en cian · -xx en coral); el país actual se omite y las etiquetas siguen el idioma de la interfaz. (2) Fuentes de geozonas por país: la barra de fuentes en las páginas de inicio y de resultados (y el conmutador de capa del mapa, antes «zonas DiPUL») muestra ahora el proveedor correcto de cada país en lugar de DiPUL en todas partes — DE DiPUL/DFS, FR Géoportail, AT Austro Control, CH BAZL, ES ENAIRE/EASA, DK Trafikstyrelsen, IE EASA. (3) Ajustes totalmente localizados en los cinco idiomas (antes solo en alemán); la opción de modo de capa DiPUL — que solo afecta a Alemania — queda oculta fuera de DE, dejando únicamente el ajuste de previsión a 48 h, independiente del país |
| v0.92 | 🇪🇸 **Selector de fuente para España**: la pantalla de inicio permite elegir la fuente de geozonas — **EASA** Common Repository (vectorial ArcGIS del lado del cliente, coloreado por tipo de zona, basado en el área visible; por defecto) o **ENAIRE** servAIS (el WMS oficial anterior). EASA muestra polígonos de zona más nítidos y transparentes en lugar de la capa WMS que cubre toda España; la elección se conserva en `localStorage` |
| v0.91 | 🇮🇪 Corrección: `getLegalLink` fallaba con valores `legal` numéricos (el campo `Paragraf` de Dinamarca es un número), lo que tumbaba toda la canalización de renderizado de DK — convertido a cadena antes de la coincidencia del regex |
| v0.90 | 🇩🇰 **Dinamarca** (`skycheck-dk`) e 🇮🇪 **Irlanda** (`skycheck-ie`): dos adaptadores **vectoriales ArcGIS** del lado del cliente — DK desde el FeatureServer de Trafikstyrelsen, IE desde el EASA Common Repository (ED-318, preliminar). Ambos obtienen GeoJSON directamente (CORS abierto), colorean los polígonos por categoría y admiten la superposición de todo el país |
| v0.89 | Búsqueda de direcciones restringida al país activo mediante el filtro `countrycode` de Photon (elimina los resultados vecinos transfronterizos que el bounding box dejaba pasar) |
| v0.88 | **Búsqueda de direcciones acotada al país**: `geocode()` estaba cableado a Alemania (`lang=de` + un bounding box alemán) — cada variante de país solo devolvía sugerencias alemanas. Ahora se usa un bounding box e idioma de UI por país |
| v0.87 | **Valores por defecto por país**: placeholder de búsqueda con un monumento de la capital (DE Puerta de Brandeburgo, FR Torre Eiffel, AT catedral de San Esteban, CH Palacio Federal, ES Puerta del Sol) e idioma de UI por defecto según el país en la primera visita |
| v0.86 | 🇪🇸 **España** (`skycheck-es`): nuevo adaptador de país siguiendo el patrón DE/CH — capa **WMS** de ENAIRE servAIS para la superposición + **ArcGIS Identify** de ENAIRE para la lista de detalle/estado (límites de altitud estructurados, enlaces legales). CORS abierto, sin función/fichero/workflow |
| v0.85 | 🇨🇭 **Suiza** (`skycheck-ch`): nuevo adaptador de país siguiendo el patrón DE — capa **WMS** de geo.admin.ch para la superposición del mapa + API REST **Identify** de geo.admin.ch para la lista de detalle/estado. Ambas con CORS abierto, por lo que no se necesita función Netlify, ni fichero alojado, ni workflow de actualización |
| v0.84 | 🇦🇹 La superposición del mapa AT dibuja ahora **todas** las zonas austriacas (overlay de país completo vía `?all=1`, como el WMS de DE) en lugar de solo las zonas filtradas por punto en la ubicación marcada |
| v0.83 | 🇦🇹 **Austria** (`skycheck-at`): nuevo adaptador de país. `zones-at.js` analiza el conjunto de datos ED-269 de Austro Control; `data/uas-zones-at.json` se **actualiza automáticamente cada mes** mediante un workflow de GitHub Actions (`update-at-zones.yml`) |
| v0.78–v0.82 | Pasada de seguridad y calidad (escape XSS + CSP, corrección de la unidad de visibilidad METAR, completitud en 5 idiomas, correcciones de defectos de alarma, hielo/niebla/visibilidad en la vista en vivo) — véase `docs/code-review-2026-07-16.md` |
| v0.76 | Corrección de race condition: los polígonos / círculos de geozonas FR aparecen ahora en el primer renderizado del mapa (antes solo tras doble clic con re-fetch). `drawZoneOverlay` se ejecutaba antes de la creación del mapa; ahora se redibuja tras la inicialización usando la caché `lastZones` |
| v0.75 | i18n del nombre de país: el banner de la página de inicio y el pie de página muestran el nombre del país activo en el idioma de UI elegido (p. ej. dominio FR + UI ES → "Verificación de vuelo de dron · Francia"). Nueva tabla `COUNTRY_NAMES`, helper `_country()`, marcador `{country}` interpolado por `_t()`. `fltcatDisclaimer` despaisificado (regla UE válida sin mención de país) |
| v0.74 | Superposición cartográfica FR: las geozonas en modo FR se dibujan ahora como polígonos / círculos Leaflet en el mapa (además de la lista). `zones-fr.js` devuelve la geometría; `drawZoneOverlay()` renderiza en el cliente. El conmutador de zonas sigue siendo compatible |
| v0.73 | Arquitectura de adaptador por país (etapa 1): soporte multi-país para geozonas. Detección de país vía parámetro URL (`?country=fr`) o nombre de host; nueva función Netlify `zones-fr.js` lee JSON ED-269 para Francia (`data/uas-zones-fr.json`, ~3,6k zonas), DE conserva DiPUL WMS |
| v0.72 | Texto del modal Info corregido (público objetivo, categoría específica, nueva sección de privacidad); README convertido de solo alemán → 5 idiomas |
| v0.71 | 5 idiomas soportados (DE / EN / FR / ES / PL); selector de idioma en la página de inicio |
| v0.70 | Modal info de categoría de vuelo (VFR / MVFR / IFR / LIFR) |
| v0.69 | Enlace de nubosidad a Windy; viento METAR con símbolo ° y códigos de color |
| v0.68 | Enlace SkyAlarm en la página de inicio |
| v0.67 | Botón de estilo de mapa elevado por encima de la atribución de Leaflet (corrección de z-index) |
| v0.66 | Overlay de baja altitud estrechado, conmutador de estilo de mapa en el mapa principal |
| v0.65 | Corrección: caracteres literales `\n` en el HTML de la sección METAR |
| v0.64 | Nueva Netlify Function `awc.js` como proxy CORS para NOAA AWC (METAR/TAF) |
| v0.63 | Fórmula δ de `fetchZones` calibrada empíricamente, radio por defecto 100 m |
| v0.58 | Acoplamiento de radio de geozona 5 m / 100 m |
| v0.57 | Banner de instalación PWA (`beforeinstallprompt`) |
| v0.54 | Integración METAR/TAF, marcadores de aeródromos en el mapa, tarjeta METAR |
| v0.35 | Vista de alarma de aeronave (pantalla completa, ADS-B, Haversine, Web Audio, mapa Leaflet) |
| v0.27 | Selector de idioma DE/EN, I18N completo |
| v0.20 | Variable `APP_VER`, marca de tiempo de medición Kp |
| v0.15 | GFZ cargado de forma asíncrona, Netlify Function como proxy primario, tiempo de carga ~1 s |
| v0.14 | Función serverless Netlify `gfz.js` como proxy CORS fiable |
| v0.10 | Gráfico de barras GFZ Hp30 (4 × medición + previsión) |

---

## Privacidad

SkyCheck no rastrea ni almacena datos del usuario. La app es una mera aplicación web — incluso la "instalación" como PWA solo coloca un icono y no instala nada de forma persistente. Los datos se cargan solo temporalmente y desaparecen al salir de la app.

---

## Licencia y responsabilidad

Alemania, Francia, Austria, Suiza, España, Dinamarca e Irlanda · Operación en VLOS · Sin responsabilidad por la exhaustividad o exactitud de los datos mostrados. El uso de la app no sustituye ninguna autorización oficial requerida. SkyCheck es una **ayuda de orientación** — la autorización legalmente exigida y la liberación final del espacio aéreo se emiten a través de los portales nacionales competentes (p. ej. **DFS Aviation Services** para DE, **Austro Control Dronespace** para AT, **skyguide** para CH).

Las fuentes de datos están sujetas a sus respectivas licencias (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch, ENAIRE, Trafikstyrelsen, EASA).
