**🌍 Langue :** [English](README.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Vérification de vol de drone pour l'Allemagne

**SkyCheck** est une application web monopage gratuite permettant de vérifier rapidement, avant le vol, les conditions d'un vol de drone en Allemagne. L'application agrège des données en temps réel issues de plusieurs sources officielles et fournit une recommandation immédiate. Nos cas d'usage : levé topographique, inspection, films institutionnels, productions TV et cinéma, ainsi que la formation au permis de drone A2/STS chez [www.multikopterschule.de](https://www.multikopterschule.de).

🌐 **En direct :** [enchanting-stardust-f713da.netlify.app/skycheck.html](https://enchanting-stardust-f713da.netlify.app/skycheck.html)

📦 **Version actuelle :** v0.74

---

## Fonctionnalités

| Domaine | Détails |
|---|---|
| **Recommandation de vol** | Système de feux tricolores (Go / Avertissement / No-Go) basé sur vent, rafales, précipitations et indice Kp |
| **Météo** | Rafales, vitesse et direction du vent, température, point de rosée, visibilité, couverture nuageuse, précipitations — données DWD via BrightSky |
| **METAR / TAF** | Données aéronautiques en temps réel des aérodromes proches (NOAA Aviation Weather Center), avec indicateur de catégorie VFR / MVFR / IFR / LIFR |
| **Profil de vent** | Extrapolation de la vitesse du vent par altitude (10 / 60 / 120 / 150 m AGL) selon la loi de puissance |
| **Indice Kp** | Valeur Kp actuelle de la NOAA + graphique Hp30 du GFZ Potsdam (4 dernières mesures de 30 min + prévision) |
| **Trafic aérien** | Mouvements ADS-B en temps réel dans les environs avec couleurs d'altitude et icônes radar (Airplanes.live) |
| **Vue Alarme Aéronef** | Carte plein écran avec alarme sonore : signale les aéronefs s'approchant dans un rayon paramétrable |
| **Carte des espaces aériens** | Zones DiPUL WMS (uas-betrieb.de) incluant zones d'interdiction, zones de contrôle, réserves naturelles ; rayon de recherche commutable 5 m / 100 m |
| **Prévision 48 h** | Prévision météo horaire sur 2 jours (défilante, feu tricolore par heure) |
| **Aperçu 5 jours** | Vue quotidienne avec températures min/max, vent et évaluation tricolore |
| **Avis et avertissements** | Avertissements contextuels (perturbation GPS à Kp élevé, trafic aérien accru, motif de no-fly) |
| **5 langues** | Allemand, anglais, français, espagnol, polonais — commutables sur la page d'accueil |
| **PWA** | Installable comme application web (bannière d'installation avec délai de 30 jours), fonctionne hors ligne pour le contenu statique |

---

## Technologie

- **HTML/JS/CSS en fichier unique** — pas d'outil de build, pas de dépendances, pas de framework
- **Leaflet.js** pour la carte interactive
- **Service Worker** (`sw.js`) + **Web App Manifest** (`manifest.json`) pour le support PWA
- **Netlify** pour l'hébergement et les fonctions serverless (proxys CORS)

---

## Sources de données

| Source | Données | CORS |
|---|---|---|
| [DWD BrightSky](https://brightsky.dev/) | Données météo (horaires, 7 jours) | ✅ |
| [NOAA Aviation Weather Center](https://aviationweather.gov/) | METAR / TAF | ❌ → Netlify Function `awc.js` |
| [GFZ Potsdam](https://kp.gfz.de/) | Indice Kp, Hp30 (résolution 30 min) | ❌ → Netlify Function `gfz.js` |
| [NOAA SWPC](https://www.swpc.noaa.gov/) | Repli indice Kp | ✅ |
| [Airplanes.live](https://airplanes.live/) | Mouvements ADS-B | ✅ |
| [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Zones d'espace aérien pour drones (WMS) | ✅ |
| [Photon (Komoot)](https://photon.komoot.io/) | Géocodage / recherche de lieu | ✅ |
| [Windy.com](https://www.windy.com/) | Lien externe pour la vue détaillée des nuages | — |

---

## Architecture

```
skycheck.html               ← application complète (HTML + CSS + JS, ~5,2k lignes)
manifest.json               ← manifeste Web App PWA
sw.js                       ← Service Worker (mise en cache)
icon-192x192.png            ← icône de l'app (petite)
icon-512x512.png            ← icône de l'app (grande)
skycheck-icon.svg           ← icône source (vectorielle)
netlify.toml                ← config Netlify (includes du bundle + réécriture d'URL racine)
netlify/
  functions/
    awc.js                  ← proxy NOAA AWC pour METAR/TAF (contournement CORS)
    gfz.js                  ← proxy GFZ Potsdam pour Kp/Hp30
    zones-fr.js             ← zones UAS France (lit data/uas-zones-fr.json, filtré par bbox)
data/
  uas-zones-fr.json         ← zones UAS France ED-269 (snapshot mensuel, remplaçable)
redirect.html               ← page de redirection optionnelle
```

### Support multi-pays (depuis v0.73)

SkyCheck utilise un **pattern d'adaptateur** pour les sources de données par pays. Le pays est détecté via le paramètre URL `?country=fr` ou via le nom d'hôte (ex. `skycheck-fr.netlify.app`). Défaut : `de`.

| Pays | Source des géozones | État |
|---|---|---|
| **DE** (défaut) | DiPUL WMS GetFeatureInfo (uas-betrieb.de) | en ligne |
| **FR** | Fonction Netlify `zones-fr.js` + JSON ED-269 mensuel | en ligne |
| (autres) | placeholder — adaptateur prêt pour de nouveaux fournisseurs | — |

Météo, ADS-B, METAR/TAF, indice Kp et géocodage sont mondiaux et utilisés tels quels dans chaque variante pays.

### Netlify Functions (proxys CORS)

Les API Aviation Weather et GFZ n'envoient pas d'en-têtes CORS, elles passent donc par les Netlify Functions :

- `awc.js` — relaie `aviationweather.gov/api/data/{metar,taf}`, ajoute les en-têtes CORS, délai 10 s, cache 90 s
- `gfz.js` — relaie les requêtes `kp.gfz.de` (Kp, Hp30)

### Chargement asynchrone

Météo, trafic aérien, METAR/TAF et indice Kp sont chargés en parallèle. La tuile GFZ Hp30 se charge en arrière-plan sans bloquer l'affichage principal — la page de statut apparaît ainsi en ~1 seconde.

### Détection de géozones (DiPUL WMS GetFeatureInfo)

La requête WMS `GetFeatureInfo` utilise une grille de 101×101 pixels. Le rayon effectif de recherche est contrôlé par la taille de la bounding box `δ` :

```javascript
δ = Math.max(0.001134, radiusM * 101 / (4 * 111320))
```

Cela permet d'ajuster précisément le rayon de recherche entre 5 m et 100 m (calibré empiriquement).

---

## Développement local

```bash
# Serveur HTTP simple (Python)
python3 -m http.server 8091
# → http://localhost:8091/skycheck.html

# Avec Netlify Functions (recommandé — sinon pas de METAR/TAF/Kp)
npm install -g netlify-cli
netlify dev
# → http://localhost:8888/skycheck.html
```

> **Remarque :** Sans `netlify dev`, les tuiles METAR/TAF et GFZ échouent en local car `/.netlify/functions/*` n'est pas disponible. Météo, ADS-B et espace aérien fonctionnent aussi avec le serveur HTTP simple.

---

## Recommandation de vol — logique d'évaluation

| Critère | Avertissement | No-Go |
|---|---|---|
| Rafales | > 7 m/s | > 10 m/s |
| Indice Kp | > 3,3 (GPS dégradé) | > 5,0 (GPS non fiable) |
| Précipitations | > 0 mm | > 0,3 mm |
| Géozone | sans restrictions, zone tampon nature | zone d'interdiction active |

---

## Historique des versions (extrait)

| Version | Changement |
|---|---|
| v0.74 | Superposition cartographique FR : les géozones en mode FR sont désormais dessinées sur la carte Leaflet (polygones / cercles) en plus de la liste. `zones-fr.js` renvoie la géométrie ; `drawZoneOverlay()` effectue le rendu côté client. Le commutateur de zones reste compatible |
| v0.73 | Architecture d'adaptateur par pays (étape 1) : support multi-pays pour les géozones. Détection du pays via paramètre URL (`?country=fr`) ou nom d'hôte ; nouvelle fonction Netlify `zones-fr.js` lit le JSON ED-269 pour la France (`data/uas-zones-fr.json`, ~3,6k zones), DE conserve DiPUL WMS |
| v0.72 | Texte de la modale Info corrigé (public cible, catégorie spécifique, nouvelle section confidentialité) ; README étendu de l'allemand uniquement → 5 langues |
| v0.71 | 5 langues supportées (DE / EN / FR / ES / PL) ; sélecteur sur la page d'accueil |
| v0.70 | Modale info catégorie de vol (VFR / MVFR / IFR / LIFR) |
| v0.69 | Lien couverture nuageuse vers Windy ; vent METAR avec symbole ° et codes couleur |
| v0.68 | Lien SkyAlarm sur la page d'accueil |
| v0.64 | Nouvelle Netlify Function `awc.js` comme proxy CORS pour NOAA AWC (METAR/TAF) |
| v0.63 | Formule δ de `fetchZones` calibrée empiriquement, rayon par défaut 100 m |
| v0.58 | Couplage rayon géozone 5 m / 100 m |
| v0.57 | Bannière d'installation PWA (`beforeinstallprompt`) |
| v0.54 | Intégration METAR/TAF, marqueurs d'aérodromes sur la carte |
| v0.35 | Vue Alarme Aéronef (plein écran, ADS-B, Haversine, Web Audio, Leaflet) |
| v0.27 | Sélecteur de langue DE/EN, I18N complet |

---

## Confidentialité

SkyCheck ne suit ni ne stocke aucune donnée utilisateur. L'application est une simple application web — même « l'installation » en PWA ne fait que poser une icône et n'installe rien de durable. Les données ne sont chargées que temporairement et disparaissent à la fermeture de l'app.

---

## Licence et responsabilité

Pour l'Allemagne uniquement · Exploitation en VLOS · Aucune responsabilité quant à l'exhaustivité ou l'exactitude des données affichées. L'utilisation de l'application ne remplace aucune autorisation officielle. SkyCheck est une **aide à l'orientation** — l'autorisation légale et la libération finale de l'espace aérien sont délivrées via l'**application DFS Aviation Services** et d'autres portails agréés.

Les sources de données sont soumises à leurs licences respectives (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL).
