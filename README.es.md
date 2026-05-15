**🌍 Idioma:** [English](README.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · **Español** · [Polski](README.pl.md)

---

# SkyCheck — Verificación de vuelo de drones para Alemania

**SkyCheck** es una aplicación web monopágina gratuita para verificar rápidamente, antes del despegue, las condiciones de un vuelo de drone en Alemania. La app agrega datos en tiempo real de varias fuentes oficiales y ofrece una recomendación inmediata. Nuestros casos de uso: topografía, inspección, vídeos corporativos, producciones de TV y cine, así como formación para la licencia de drone A2/STS en [www.multikopterschule.de](https://www.multikopterschule.de).

🌐 **En vivo:** [enchanting-stardust-f713da.netlify.app/skycheck.html](https://enchanting-stardust-f713da.netlify.app/skycheck.html)

📦 **Versión actual:** v0.73

---

## Funciones

| Área | Detalles |
|---|---|
| **Recomendación de vuelo** | Sistema de semáforo (Go / Aviso / No-Go) basado en viento, ráfagas, precipitaciones e índice Kp |
| **Meteorología** | Ráfagas, velocidad y dirección del viento, temperatura, punto de rocío, visibilidad, nubosidad, precipitación — datos DWD vía BrightSky |
| **METAR / TAF** | Datos meteorológicos aeronáuticos en tiempo real de aeródromos cercanos (NOAA Aviation Weather Center), con indicador de categoría VFR / MVFR / IFR / LIFR |
| **Perfil de viento** | Extrapolación de velocidad del viento por altitud (10 / 60 / 120 / 150 m AGL) mediante ley de potencia |
| **Índice Kp** | Valor Kp actual de NOAA + gráfico Hp30 de GFZ Potsdam (últimas 4 × 30 min + previsión) |
| **Tráfico aéreo** | Movimientos ADS-B en tiempo real en el entorno con colores de altitud e iconos de radar (Airplanes.live) |
| **Vista de alarma de aeronaves** | Mapa a pantalla completa con alarma acústica: avisa de aeronaves aproximándose en un radio configurable |
| **Mapa de espacio aéreo** | Zonas DiPUL WMS (uas-betrieb.de) incluyendo zonas de exclusión, zonas de control, reservas naturales; radio de búsqueda conmutable 5 m / 100 m |
| **Previsión 48 h** | Previsión horaria a 2 días (desplazable, semáforo por hora) |
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
| [Airplanes.live](https://airplanes.live/) | Movimientos ADS-B | ✅ |
| [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Zonas WMS de espacio aéreo para drones | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Geocodificación / búsqueda de lugares | ✅ |
| [Windy.com](https://www.windy.com/) | Enlace externo para vista detallada de nubes | — |

---

## Arquitectura

```
skycheck.html               ← app completa (HTML + CSS + JS, ~5,2k líneas)
manifest.json               ← manifiesto Web App PWA
sw.js                       ← Service Worker (caché)
icon-192x192.png            ← icono de la app (pequeño)
icon-512x512.png            ← icono de la app (grande)
skycheck-icon.svg           ← icono fuente (vectorial)
netlify.toml                ← config Netlify (includes del bundle de funciones)
netlify/
  functions/
    awc.js                  ← proxy NOAA AWC para METAR/TAF (sortea CORS)
    gfz.js                  ← proxy GFZ Potsdam para Kp/Hp30
    zones-fr.js             ← zonas UAS Francia (lee data/uas-zones-fr.json, filtrado por bbox)
data/
  uas-zones-fr.json         ← zonas UAS Francia ED-269 (snapshot mensual, sustituible)
redirect.html               ← página de redirección opcional
```

### Soporte multi-país (desde v0.73)

SkyCheck usa un **patrón de adaptador** para las fuentes de datos por país. El país se detecta a través del parámetro URL `?country=fr` o del nombre de host (p. ej. `skycheck-fr.netlify.app`). Por defecto: `de`.

| País | Fuente de geozonas | Estado |
|---|---|---|
| **DE** (por defecto) | DiPUL WMS GetFeatureInfo (uas-betrieb.de) | online |
| **FR** | Función Netlify `zones-fr.js` + JSON ED-269 mensual | online |
| (otros) | marcador de posición — adaptador listo para más proveedores | — |

Meteo, ADS-B, METAR/TAF, índice Kp y geocodificación son globales y se usan tal cual en cada variante de país.

### Netlify Functions (proxys CORS)

Las API Aviation Weather y GFZ no envían cabeceras CORS, por lo que pasan por funciones Netlify:

- `awc.js` — redirige `aviationweather.gov/api/data/{metar,taf}`, añade cabeceras CORS, 10 s de timeout, caché de 90 s
- `gfz.js` — redirige las solicitudes a `kp.gfz.de` (Kp, Hp30)

### Carga asíncrona

Meteo, tráfico aéreo, METAR/TAF e índice Kp se cargan en paralelo. La tarjeta GFZ Hp30 carga en segundo plano sin bloquear la vista principal — la página de estado aparece así en ~1 segundo.

### Detección de geozonas (DiPUL WMS GetFeatureInfo)

La petición WMS `GetFeatureInfo` usa una rejilla de 101×101 píxeles. El radio efectivo de búsqueda se controla mediante el tamaño de bounding box `δ`:

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

> **Nota:** Sin `netlify dev`, las tarjetas METAR/TAF y GFZ fallan en local porque `/.netlify/functions/*` no está disponible. Meteo, ADS-B y espacio aéreo funcionan también con el servidor HTTP simple.

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
| v0.73 | Arquitectura de adaptador por país (etapa 1): soporte multi-país para geozonas. Detección de país vía parámetro URL (`?country=fr`) o nombre de host; nueva función Netlify `zones-fr.js` lee JSON ED-269 para Francia (`data/uas-zones-fr.json`, ~3,6k zonas), DE conserva DiPUL WMS |
| v0.72 | Texto de modal Info corregido (público objetivo, categoría específica, nueva sección de privacidad); README ampliado de solo alemán → 5 idiomas |
| v0.71 | 5 idiomas soportados (DE / EN / FR / ES / PL); selector en la página de inicio |
| v0.70 | Modal info categoría de vuelo (VFR / MVFR / IFR / LIFR) |
| v0.69 | Enlace nubosidad a Windy; viento METAR con símbolo ° y códigos de color |
| v0.68 | Enlace SkyAlarm en la página de inicio |
| v0.64 | Nueva Netlify Function `awc.js` como proxy CORS para NOAA AWC (METAR/TAF) |
| v0.63 | Fórmula δ de `fetchZones` calibrada empíricamente, radio por defecto 100 m |
| v0.58 | Acoplamiento de radio de geozona 5 m / 100 m |
| v0.57 | Banner de instalación PWA (`beforeinstallprompt`) |
| v0.54 | Integración METAR/TAF, marcadores de aeródromos en el mapa |
| v0.35 | Vista de alarma de aeronave (pantalla completa, ADS-B, Haversine, Web Audio, Leaflet) |
| v0.27 | Selector de idioma DE/EN, I18N completo |

---

## Privacidad

SkyCheck no rastrea ni almacena datos del usuario. La app es una mera aplicación web — incluso la "instalación" como PWA solo coloca un icono y no instala nada persistentemente. Los datos se cargan solo temporalmente y desaparecen al cerrar la app.

---

## Licencia y responsabilidad

Solo para Alemania · Operación en VLOS · Sin responsabilidad por la exhaustividad o exactitud de los datos mostrados. El uso de la app no sustituye ninguna autorización oficial. SkyCheck es una **ayuda de orientación** — la autorización legalmente exigida y la liberación final del espacio aéreo se gestionan a través de la **app DFS Aviation Services** y otros portales autorizados.

Las fuentes de datos están sujetas a sus respectivas licencias (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL).
