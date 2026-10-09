**🌍 Langue :** [English](README.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Vérification de vol de drone (DE · FR · AT · CH · ES · DK · IE · NL · PT · LU · NO · EE)

**SkyCheck** est une application web monopage gratuite permettant de vérifier rapidement, avant le vol, les conditions d'un vol de drone. L'application agrège des données en temps réel issues de plusieurs sources officielles et fournit une recommandation immédiate. Nos cas d'usage : levé topographique, inspection, films institutionnels, productions TV et cinéma, ainsi que la formation au permis de drone A2/STS chez [www.multikopterschule.de](https://www.multikopterschule.de).

> 🔒 **Confidentialité d'abord · fonctionne dans le navigateur · rien à installer.**
> SkyCheck ne collecte aucune donnée, n'active aucun suivi et ne nécessite ni compte ni inscription — elle ne peut pas vous espionner puisqu'il n'existe aucun backend qui stocke quoi que ce soit. Tout s'exécute directement dans votre navigateur ; les données que vous voyez sont chargées en direct et disparaissent dès que vous fermez l'onglet. Il n'y a rien à installer non plus : « l'ajouter à votre écran d'accueil » (en tant que PWA) crée simplement un raccourci qui ouvre cette page web — en somme un signet avec une icône. Aucun paquet applicatif n'est téléchargé, aucune permission n'est accordée, aucun processus ne tourne en arrière-plan.

Météo, trafic aérien, METAR/TAF, indice Kp et géocodage sont identiques partout ; seule la **source des géozones** est spécifique au pays et sélectionnée automatiquement à partir du nom d'hôte.

## 🌐 Sites en direct

| Pays | Application en direct | Source des géozones |
|---|---|---|
| 🇩🇪 **Allemagne** | [skycheck-de.netlify.app](https://skycheck-de.netlify.app/) | DiPUL WMS — `uas-betrieb.de` |
| 🇫🇷 **France** | [skycheck-fr.netlify.app](https://skycheck-fr.netlify.app/) | Jeu de données ED-269 (zones UAS françaises) |
| 🇦🇹 **Autriche** | [skycheck-at.netlify.app](https://skycheck-at.netlify.app/) | Austro Control ED-269 — mise à jour mensuelle automatique |
| 🇨🇭 **Suisse** | [skycheck-ch.netlify.app](https://skycheck-ch.netlify.app/) | BAZL / geo.admin.ch — WMS + Identify API |
| 🇪🇸 **Espagne** | [skycheck-es.netlify.app](https://skycheck-es.netlify.app/) | EASA Common Repository (vecteur) **ou** ENAIRE servAIS (WMS) — commutable sur l'écran de démarrage, EASA par défaut |
| 🇩🇰 **Danemark** | [skycheck-dk.netlify.app](https://skycheck-dk.netlify.app/) | Trafikstyrelsen — ArcGIS FeatureServer (vecteur) |
| 🇮🇪 **Irlande** | [skycheck-ie.netlify.app](https://skycheck-ie.netlify.app/) | EASA Common Repository — ArcGIS (vecteur, préliminaire) |
| 🇳🇱 **Pays-Bas** | [skycheck-nl.netlify.app](https://skycheck-nl.netlify.app/) | EASA Common Repository — ArcGIS (vecteur, ED-318) |
| 🇵🇹 **Portugal** | [skycheck-pt.netlify.app](https://skycheck-pt.netlify.app/) | EASA Common Repository — ArcGIS (vecteur) |
| 🇱🇺 **Luxembourg** | [skycheck-lu.netlify.app](https://skycheck-lu.netlify.app/) | DAC Luxembourg — instantané ED-269 (mis à jour chaque semaine) |
| 🇳🇴 **Norvège** | [skycheck-no.netlify.app](https://skycheck-no.netlify.app/) | Luftfartstilsynet / dronesoner.no — instantané ED-269 (mis à jour chaque semaine) ; zones NOTAM sur clic |
| 🇪🇪 **Estonie** | [skycheck-ee.netlify.app](https://skycheck-ee.netlify.app/) | EANS (utm.eans.ee) — instantané ED-269 (mis à jour chaque semaine) ; les zones temporaires peuvent dater de 7 jours |

> Les douze sont le **même** déploiement de `skycheck.html` issu de ce dépôt, chacun servi sur son propre site Netlify. Détection du pays : nom d'hôte (`skycheck-<xx>.netlify.app`) ou paramètre URL `?country=de|fr|at|ch|es|dk|ie|nl|pt|lu|no|ee`. Défaut : `de`. Chaque variante de pays prédéfinit aussi la **langue de l'interface**, un **indice de recherche de point de repère de la capitale** et une **recherche d'adresse restreinte au pays**.

📦 **Version actuelle :** v26.10.117.2

---

## Fonctionnalités

| Domaine | Détails |
|---|---|
| **Recommandation de vol** | Système de feux tricolores (Go / Avertissement / No-Go) basé sur vent, rafales, précipitations et indice Kp |
| **Météo** | Rafales, vitesse et direction du vent, température, point de rosée, visibilité, couverture nuageuse, précipitations — données DWD via BrightSky |
| **METAR / TAF** | Données aéronautiques en temps réel des aérodromes proches (NOAA Aviation Weather Center), avec indicateur de catégorie de vol VFR / MVFR / IFR / LIFR |
| **Profil de vent** | Extrapolation de la vitesse du vent par altitude (10 / 60 / 120 / 150 m AGL) selon la loi de puissance |
| **Indice Kp** | Valeur Kp actuelle de la NOAA + graphique Hp30 du GFZ Potsdam (4 dernières mesures de 30 min + prévision) |
| **Trafic aérien** | Mouvements ADS-B en temps réel dans les environs avec couleurs d'altitude et icônes radar (Airplanes.live) |
| **Vue Alarme Aéronef** | Carte plein écran avec alarme sonore : signale les aéronefs s'approchant dans un rayon paramétrable |
| **Carte des espaces aériens** | Géozones drone spécifiques au pays (DE : DiPUL · FR/AT : ED-269 · CH : geo.admin.ch · ES : ENAIRE · DK/IE : ArcGIS) — zones d'interdiction, zones de contrôle, réserves naturelles ; rayon de recherche commutable entre 5 m et 100 m |
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
| [Photon (Komoot)](https://photon.komoot.io/) | Géocodage / recherche de lieu | ✅ |
| [Windy.com](https://www.windy.com/) | Lien externe pour la vue détaillée des nuages | — |
| **Géozones 🇩🇪** [DiPUL / uas-betrieb.de](https://uas-betrieb.de/) | Zones d'espace aérien drone (WMS + GetFeatureInfo) | ✅ |
| **Géozones 🇫🇷** Jeu de données ED-269 | Zones UAS françaises (`data/uas-zones-fr.json`) | via `zones-fr.js` |
| **Géozones 🇦🇹** [Austro Control / dronespace.at](https://www.dronespace.at/) | Zones UAS autrichiennes, ED-269 (`data/uas-zones-at.json`) | via `zones-at.js` |
| **Géozones 🇨🇭** [BAZL / geo.admin.ch](https://www.geo.admin.ch/) | Zones UAS suisses `ch.bazl.einschraenkungen-drohnen` (WMS + Identify) | ✅ |
| **Géozones 🇪🇸** [ENAIRE servAIS](https://www.enaire.es/) / [EASA Common Repository](https://www.easa.europa.eu/) | Zones UAS espagnoles — ENAIRE `SRV_UAS_ZG_V0` (WMS + ArcGIS Identify) **ou** EASA `geozone_EASA` (vecteur ArcGIS, basé sur la fenêtre d'affichage) ; commutable, EASA par défaut | ✅ |
| **Géozones 🇩🇰** [Trafikstyrelsen](https://www.droneregler.dk/) | Zones UAS danoises (ArcGIS FeatureServer, GeoJSON) | ✅ |
| **Géozones 🇮🇪** [EASA Common Repository](https://www.easa.europa.eu/) | Zones UAS irlandaises `ie_geozones` (ArcGIS, ED-318, préliminaire) | ✅ |
| **Géozones 🇳🇱** [EASA Common Repository](https://www.easa.europa.eu/) | Géozones UAS néerlandaises `Netherlands_ED318` (vecteur ArcGIS, ED-318, ~162 zones) | ✅ |
| **Géozones 🇵🇹** [EASA Common Repository](https://www.easa.europa.eu/) / [ANAC](https://www.voanaeuropa.eu/) | Géozones UAS portugaises `Portugal_Geo_Zones_Polygons` (vecteur ArcGIS, ~314 zones ; schéma dérivé de KML) | ✅ |
| **Géozones 🇱🇺** [DAC Luxembourg](https://drones.geoportail.lu/) | Zones UAS luxembourgeoises, instantané ED-269 (`data/uas-zones-lu.json`, 43 zones ; licence CC0) | via `zones-ed269.js` |
| **Géozones 🇳🇴** [Luftfartstilsynet / dronesoner.no](https://dronesoner.no/) | Zones UAS norvégiennes, instantané ED-269 (`data/uas-zones-no.json`, 1390 zones ; licence NLOD 2.0) ; zones NOTAM temporaires chargées sur clic (`notam-no.js`) | via `zones-ed269.js` |
| **Géozones 🇪🇪** [EANS](https://utm.eans.ee/) | Zones UAS estoniennes, instantané ED-269 (`data/uas-zones-ee.json`, 241 zones ; licence : non précisée par l'éditeur) ; les zones temporaires peuvent dater de 7 jours | via `zones-ed269.js` |

---

## Architecture

```
skycheck.html               ← application complète (HTML + CSS + JS, ~9,4k lignes)
coordinates.html            ← page de coordonnées GPS2UTM : GPS → ETRS89/UTM, Gauss-Krüger, DHHN2016
coordinate-tools.js         ← noyau de calcul associé (UTM, approximation Gauss-Krüger, géoïde GCG2016)
ctr-hoehenregeln.html       ← page d'info : règles de hauteur des CTR DFS/DAS (NfL 2026-1-3960/-3981), coupe et galerie des aéroports
img/                        ← images WebP pour cette page (guide de la grille de hauteurs + galerie des aéroports)
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
    zones-fr.js             ← zones UAS France (lit des tuiles spatiales de 2°, filtré par bbox)
    zones-at.js             ← zones UAS Autriche (lit data/uas-zones-at.json ; ?all=1 = overlay complet)
    zones-ed269.js          ← zones UAS LU/NO/EE (lit data/uas-zones-<cc>.json ; test de surface exact ; ?all=1 = overlay complet)
    notam-no.js             ← Norvège : proxy en direct des zones NOTAM temporaires (dronesoner.no, uniquement au clic)
data/
  uas-zones-fr.json         ← zones UAS France ED-269 (snapshot mensuel, remplaçable)
  fr-zones-tiles/           ← index spatial généré pour la fonction Netlify
  context/fr/               ← tuiles viewport groupées des quatre couches de contexte France
  uas-zones-at.json         ← zones UAS Autriche ED-269 (env. 290 zones, mise à jour automatique)
  uas-zones-at.version      ← marqueur de la dernière version Austro Control importée (idempotence)
  uas-zones-{lu,no,ee}.json ← zones UAS ED-269 Luxembourg / Norvège / Estonie (snapshots hebdomadaires)
  uas-zones-{lu,no,ee}.version ← marqueurs du dernier snapshot importé par pays (idempotence)
  dipul-airac/              ← couches AIRAC de trafic aérien DiPUL extraites (contrôle hebdomadaire)
  <cc>-protected.json       ← contexte : zones protégées (OSM, ODbL) — cc ∈ at,ch,es,dk,ie,fr
  <cc>-motorways.json       ← contexte : autoroutes (OSM, ODbL)
  <cc>-powerlines.json      ← contexte : lignes électriques haute tension (OSM, ODbL)
  <cc>-rail.json            ← contexte : lignes ferroviaires principales (OSM, ODbL)
  gcg2016v2023-cm.i16       ← grille compacte du quasi-géoïde GCG2016 (Int16, cm) pour la page de coordonnées
scripts/
  build-eu-zones.mjs        ← génère les snapshots ED-269 LU/NO/EE à partir des sources officielles
  gen-context.mjs           ← générateur réutilisable : Overpass → GeoJSON simplifié (lignes + polygones)
  fetch-context.sh          ← pilote robuste : récupération curl (retry) + gen-context par couche, idempotent
  build-fr-spatial-data.mjs ← génère les tuiles spatiales de 2° pour la France (index des zones + couches de contexte)
  build-gcg-web-grid.mjs    ← convertit le GeoTIFF GCG2016 officiel en grille web compacte
  README.md                 ← comment ajouter des couches de contexte pour un nouveau pays
  test-coordinate-tools.cjs ← contrôle Node pour coordinate-tools.js (`node scripts/test-coordinate-tools.cjs`)
tests/                      ← tests Node (`node --test "tests/*.test.mjs"`)
.github/
  workflows/
    update-at-zones.yml     ← tâche mensuelle : récupère le dernier ED-269 Austro Control → commit du fichier de données
    update-eu-zones.yml     ← tâche hebdomadaire (lundi) : met à jour les snapshots ED-269 LU/NO/EE → commit des fichiers de données
    update-de-airac.yml     ← tâche hebdomadaire : contrôle l'offre AIRAC de Mobilithek → extrait les couches de trafic aérien DiPUL
redirect.html               ← page de redirection optionnelle
```

> 🇨🇭 **La CH n'a besoin de rien de ce qui précède** — l'overlay cartographique est la couche WMS geo.admin.ch et le détail des zones provient de l'API REST Identify de geo.admin.ch, toutes deux appelées directement depuis le navigateur (CORS ouvert). Aucune fonction Netlify, aucun fichier de données hébergé, aucun workflow de mise à jour.

### Support multi-pays (depuis v0.73)

SkyCheck utilise un **pattern d'adaptateur** pour les sources de géozones par pays. Le pays est détecté via le nom d'hôte (ex. `skycheck-ch.netlify.app`) ou le paramètre URL `?country=de|fr|at|ch|es|dk|ie|nl|pt|lu|no|ee`. Défaut : `de`. Météo, ADS-B, METAR/TAF et indice Kp sont mondiaux ; la **langue de l'interface, le point de repère de l'indice de recherche et la bounding box de géocodage** sont définis par pays.

| Pays | Source des géozones | Overlay | Liste de détail / statut | Données et mises à jour |
|---|---|---|---|---|
| 🇩🇪 **DE** (défaut) | DiPUL WMS (`uas-betrieb.de`) | Tuiles WMS | WMS GetFeatureInfo | service en direct (officiel, toujours à jour) |
| 🇫🇷 **FR** | Jeu de données ED-269 | polygones/cercles côté client | `zones-fr.js` (filtre bbox) | `data/uas-zones-fr.json` (~3,6k zones, remplaçable) |
| 🇦🇹 **AT** | Austro Control ED-269 | toutes les zones dessinées côté client (env. 290) | `zones-at.js` (filtre bbox) | `data/uas-zones-at.json` — **mise à jour mensuelle automatique** via GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | Tuiles WMS | API REST **Identify** geo.admin.ch | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | Tuiles WMS | API REST **Identify** ArcGIS | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |
| 🇩🇰 **DK** | Trafikstyrelsen ArcGIS FeatureServer | polygones vectoriels côté client (~870, codés par couleur) | requête ArcGIS (bbox) | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |
| 🇮🇪 **IE** | EASA Common Repository `ie_geozones` | polygones vectoriels côté client (76) | requête ArcGIS (bbox) | service en direct (CORS ouvert, données EASA **préliminaires**) |
| 🇳🇱 **NL** | EASA Common Repository `Netherlands_ED318` | polygones vectoriels côté client (~162) | requête ArcGIS (bbox) | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |
| 🇵🇹 **PT** | EASA Common Repository / ANAC `Portugal_Geo_Zones_Polygons` | polygones vectoriels côté client (~314) | requête ArcGIS (bbox) | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |
| 🇱🇺 **LU** | DAC Luxembourg ED-269 | toutes les zones dessinées côté client (43) | `zones-ed269.js` (test de surface exact) | `data/uas-zones-lu.json` — **mise à jour hebdomadaire automatique** via GitHub Actions (`update-eu-zones.yml`) |
| 🇳🇴 **NO** | Luftfartstilsynet / dronesoner.no ED-269 | toutes les zones dessinées côté client (1390) | `zones-ed269.js` (test de surface exact) | `data/uas-zones-no.json` — **mise à jour hebdomadaire automatique** via GitHub Actions (`update-eu-zones.yml`) ; zones NOTAM en direct au clic (`notam-no.js`) |
| 🇪🇪 **EE** | EANS ED-269 | toutes les zones dessinées côté client (241) | `zones-ed269.js` (test de surface exact) | `data/uas-zones-ee.json` — **mise à jour hebdomadaire automatique** via GitHub Actions (`update-eu-zones.yml`) ; les zones à court terme peuvent dater de 7 jours |

Trois styles d'intégration : **WMS + requête ponctuelle** (DE, CH, ES — les services officiels en direct rendent l'ensemble du pays et répondent directement aux requêtes ponctuelles), **vecteur ArcGIS côté client** (DK, IE, NL, PT — GeoJSON récupéré en direct depuis un ArcGIS FeatureServer, dessiné en polygones codés par couleur) et **fichier ED-269 hébergé + fonction Netlify** (FR, AT, LU, NO, EE — un jeu de données JSON dans le dépôt, filtré côté serveur ; l'AT se met à jour lui-même chaque mois, LU/NO/EE chaque semaine).

### Combien de géozones par pays ?

Nombres de zones extraits directement de la source en direct de chaque pays (DE via DiPUL WFS sur l'ensemble des 31 catégories ; ES via ENAIRE ArcGIS ; FR/AT depuis les jeux de données ED-269 ; CH depuis le GeoJSON geo.admin.ch ; DK/IE via ArcGIS FeatureServer), normalisés par la superficie terrestre :

| Pays | Géozones | Superficie (km²) | Zones pour 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Allemagne** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 Espagne | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Suisse | 1 232 | 41 285 | ≈ 30 |
| 🇩🇰 Danemark | 870 | 42 952 | ≈ 20 |
| 🇫🇷 France | 3 642 | 551 695 | ≈ 6,6 |
| 🇦🇹 Autriche | env. 290 | 83 879 | ≈ 3,4 |
| 🇮🇪 Irlande\* | 76 | 70 273 | ≈ 1,1 |

\* Le chiffre de l'Irlande provient de l'EASA Common Repository, encore **préliminaire** (le jeu de données national de l'IAA en liste ~87) — son décompte est donc indicatif, non exhaustif.

**L'Allemagne se démarque massivement** — environ **5,6×** le nombre absolu du pays suivant (l'Espagne) et environ **8×** la densité de zones de l'Espagne/la Suisse, **37×** celle de la France et **73×** celle de l'Autriche. La raison tient au zonage particulièrement fin de l'Allemagne : elle désigne des zones pour des catégories que les autres ignorent largement — p. ex. **sites industriels (24 482), propriétés résidentielles (10 793), installations ferroviaires (9 819), réserves naturelles (9 012), et même piscines de plein air (6 600)**. (La granularité du décompte diffère entre les jeux de données nationaux, ce qui constitue précisément le point : l'Allemagne zone bien plus de catégories à une résolution bien plus fine.)

### Base légale — les zones sont publiques en vertu du droit de l'UE

En vertu de l'**article 15, paragraphe 3, du règlement d'exécution (UE) 2019/947**, chaque État membre qui définit des géozones UAS **doit rendre ces informations publiquement accessibles dans un format numérique commun unique** — la norme EUROCAE **ED-269 / ED-318** — explicitement *à des fins de sensibilisation géographique*, c'est-à-dire pour que des applications et systèmes comme SkyCheck puissent informer les pilotes. La **directive sur les données ouvertes (UE) 2019/1024** encadre en outre ces données géospatiales du secteur public comme réutilisables (le géospatial étant une catégorie de « jeux de données de forte valeur »). Autrement dit : la loi impose que les données soient librement accessibles ; SkyCheck ne fait qu'afficher la source officielle de chaque pays, avec attribution. Les conditions exactes de réutilisation restent fixées au niveau national ; les fournisseurs de données sont donc crédités ci-dessus.

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
| v26.10.117.2 | **L'application installée démarre en clair.** Les couleurs du splash et du thème de `manifest.json` passent du sombre au clair `#eef4fb`, et le style de la barre d'état iOS de `black-translucent` à `default`, en accord avec l'interface claire par défaut introduite en v26.10.117.0. Les applications déjà installées reprennent les nouvelles couleurs avec un délai ou après réinstallation, selon le système d'exploitation. |
| v26.10.117.1 | 🛟 **Panne des données de zones désormais visible.** Si la recherche de géozones échoue (erreur HTTP, délai dépassé, hors ligne), SkyCheck affiche maintenant **« Données de zones indisponibles »** avec un feu **jaune** au lieu de « aucune restriction » en vert — dans les douze pays. La liste des zones affiche un encadré avec un lien vers la source officielle ; le panneau de la carte affiche une entrée grise. Une requête réussie sans résultat reste verte ; les solutions de repli par fichiers locaux sont conservées. Un service qui ne répond plus mène à l'avis de panne après **20 secondes** ; pendant la recherche, le bandeau affiche **« Vérification de l'espace aérien … »** au lieu de « aucune restriction ». Allemagne : une réponse 200 qui n'est pas une sortie GeoServer compte comme une panne ; le Danemark et l'Allemagne affichent les résultats partiels avec l'avis de panne. Non couvert : (1) la superposition cartographique de tout le pays ; (2) Allemagne : une couche DiPUL qui répond par une erreur serveur est ignorée pour le reste de la session, ses zones manquent alors sans avis ; (3) pendant une recherche en cours, la liste des zones et le panneau de la carte peuvent encore afficher les entrées du point précédent ; (4) la ligne météo du bandeau garde l'ancienne langue après un changement de langue jusqu'à la prochaine vérification. 147 tests Node. |
| v26.10.117.0 | 🇱🇺🇳🇴🇪🇪 **Luxembourg, Norvège et Estonie.** Trois nouvelles variantes pays (`skycheck-lu`, `skycheck-no`, `skycheck-ee`) avec les géozones officielles ED-269 sous forme d'instantanés actualisés chaque semaine (`data/uas-zones-{lu,no,ee}.json`, 43 / 1390 / 241 zones ; sources : DAC Luxembourg CC0, Luftfartstilsynet / dronesoner.no NLOD 2.0, EANS). Nouvelle fonction Netlify `zones-ed269` avec test de surface exact (point dans le polygone ou arête dans le rayon de recherche). Les zones dont toutes les fenêtres d'activation sont terminées restent visibles comme « actuellement inactives » (jaune au lieu de rouge). **Norvège :** les zones de restriction temporaires NOTAM sont chargées en direct au clic via la nouvelle fonction `notam-no`, tracées en rouge pointillé et prises en compte pour le feu tricolore pendant 5 minutes. **Estonie :** une indication fixe précise que les zones à court terme peuvent avoir jusqu'à 7 jours. Les noms de zones sont désormais échappés en HTML dans la bannière d'état et le panneau de carte. **L'interface démarre désormais par défaut en mode clair** (un choix mémorisé, y compris le mode sombre, est respecté). 39 tests Node. |
| v26.08.116.8 | 🌍 **Page des règles d'altitude CTR : 5 langues de plus (FR/ES/IT/NL/PL), sélecteur de langue à drapeaux SVG + refonte du graphique.** `ctr-hoehenregeln.html`. **(1) Langues :** désormais en **7 langues** — allemand, anglais et les nouveaux **français, espagnol, italien, néerlandais, polonais** (i18n complète de tous les textes, blocs HTML, tableaux, libellés du graphique SVG et cartes). **(2) Sélecteur :** le bouton texte DE/EN a été remplacé par un **menu déroulant à drapeaux SVG** — affiche le drapeau actif, clic pour choisir ; drapeaux SVG robustes ; détection via `?lang=`, localStorage et `navigator.language`. **(3) Graphique :** la coupe a été retravaillée — la colline de la zone 2 devient un plateau plat de faible hauteur, l'aérodrome repose désormais sur sa propre altitude de référence, **barres de hauteur de la zone 1 supprimées** (pas de clairance générale → pas de règle de hauteur), ligne de référence flottante déroutante supprimée, ligne de plafond « plafond = alt. aérodrome + 25 m » ajoutée, groupe de bâtiments redessiné en silhouette urbaine plus large à cheval sur la limite zone 2/3, et mention « à l'échelle » trompeuse du repère 800 m retirée. |
| v26.08.116.7 | 🇩🇪 **Page des règles d'altitude CTR : ajout de la NfL 2026-1-3959 (principes du BMV) — conditions générales + annotation 800 m de visibilité.** `ctr-hoehenregeln.html` (DE+EN). Ajoute la NfL **2026-1-3959** supérieure (principes du BMV pour UAS en espace aérien classe D, base de 3960/3981) comme première référence. Nouvelle **encadré « Autres conditions »** reprenant les conditions générales de la 3959, en tête un **avertissement see-and-avoid** mis en évidence : l'ATC **n'assure aucune séparation** (ni séparation de turbulence de sillage) ni **information de trafic** — l'évitement des collisions incombe uniquement au télépilote. En outre : **visibilité minimale ≥ 800 m** (sauf à proximité d'obstacles / sous autorisation individuelle), vols autonomes interdits, BVLOS et essaim autorisés. La coupe SVG reçoit une **annotation à l'échelle « Visibilité ≥ 800 m »** (ciel en haut à gauche, à l'écart des scènes d'obstacles). Uniquement `ctr-hoehenregeln.html` ; incrément d'APP_VER. |
| v26.08.116.6 | 🇩🇪 **Page des règles d'altitude CTR : galerie étendue aux 24 CTR-D, regroupée par DFS/DAS + schéma de nommage autodescriptif.** `ctr-hoehenregeln.html`. La galerie de grilles d'altitude couvre désormais **les 24 CTR-D allemands** — les 6 aéroports manquants ont été ajoutés : **Erfurt-Weimar (EDDE), München (EDDM)** (DFS) et **Dortmund (EDLW), Paderborn-Lippstadt (EDLP), Niederrhein/Weeze (EDLV), Mönchengladbach (EDLN)** (DAS). La galerie est scindée en deux groupes étiquetés — **contrôle DFS · NfL 2026-1-3960 · 15 CTR-D** et **contrôle DAS · NfL 2026-1-3981 · 9 CTR-D**. Toutes les images renommées selon un schéma autodescriptif `hoehengrid_<nfl>_<dfs\|das>_<slug>_<icao>.webp` (18 existantes via `git mv`, 6 nouvelles converties) ; le tableau `ports` a reçu des champs NfL + autorité ; texte d'intro 18 → 24. |
| v26.08.116.5 | 🇩🇪 **Page des règles d'altitude CTR : deuxième disposition générale NfL 2026-1-3981 (DAS) + les deux NfL citées ensemble.** `ctr-hoehenregeln.html` (DE+EN). Ajoute la **NfL 2026-1-3981** (CTR avec contrôle d'aérodrome DAS / DFS Aviation Services) en pendant de la **NfL 2026-1-3960** (DFS) existante. Les deux NfL sont désormais citées **ensemble** à chaque point normatif (eyebrow, sous-titre, encadré d'autorisation, notes de précision, pied de page, méta, lien d'analyse d'obstacle, liste de références). Nouvelle ligne de sous-titre : **les mêmes altitudes s'appliquent dans les 24 CTR-D — 15 sous contrôle DFS, 9 sous contrôle DAS** ; plus une phrase expliquant DFS vs DAS (mêmes règles, organe ATC différent). Uniquement `ctr-hoehenregeln.html` ; incrément d'APP_VER. |
| v26.08.116.4 | 🇩🇪 **Graphique des règles d'altitude CTR : règle d'obstacle + liste de documents.** `ctr-hoehenregeln.html` (DE+EN). La coupe SVG visualise désormais la règle d'obstacle (enveloppe verte ±30 m / +15 m) : éolienne (zone 4, au-dessus du plafond), mât radio (zone 3, localement surélevé → sinon 0 m/rouge), et un groupe de 3 bâtiments sur un plateau plat en zone 3 où le plus haut dans un rayon de 30 m fixe la référence +15 m — chacun avec un drone ✓, plus un drone ⚠ juste au-delà (>30 m). Nouvelle section « Weitere Dokumente » (`.reflist`) avec 3 nouvelles références DFS (PDF de réglementation DFS, PDF d'info DFS-AS, page web DFS-AS) en plus des documents principaux existants. |
| v26.08.116.3 | 🇩🇪 **Lien vers les règles d'altitude CTR sur la page d'accueil.** La rangée de sources/boutons de la page d'accueil (`.l-sources`) affiche désormais en premier une puce de fonctionnalité au contour accentué **« 📐 CTR-Höhenregeln »** (lien relatif `ctr-hoehenregeln.html`, ouvre un nouvel onglet). Nouvelle classe CSS `.l-src-feature` qui la distingue des puces de source grises. Lien uniquement, aucun changement de logique. |
| v26.08.116.2 | 🇩🇪 **Page des règles d'altitude CTR : clarification de la règle d'obstacle + référence info-procédure DFS.** `ctr-hoehenregeln.html` (DE+EN), purement additif : (a) nouvel encadré « Obstacle rule: no blanket +15 m » (`obstacleNote`) — la proximité d'un obstacle (≤ 30 m latéralement, ≤ 15 m au-dessus) est le seul cas permettant de dépasser les plafonds de zone, et ne donne aucun droit de voler ≥ 15 m au-dessus du sol partout (le terrain n'est pas un obstacle) ; lie un document d'analyse juridique (Google Doc) ; (b) carte de règle « hindernisnah » précisée ; (c) **PDF info-procédure DFS** (dipul.de) ajouté comme lien « (DFS-Info) » à l'ensemble des 15 hyperliens NfL (HTML statique + i18n DE/EN). |
| v26.08.116.1 | 🔧 **Remplacement des fonds de carte CARTO.** CARTO a mis fin à l'accès anonyme à ses fonds de carte (les tuiles affichent désormais un filigrane « API KEY REQUIRED »). Le style « Dark » utilise maintenant des tuiles OSM classiques inversées par filtre CSS (sans clé API, zoom 19) ; le style clair CARTO « Hell », devenu redondant, a été supprimé (cycle : Dark → OSM → Satellite). CSP nettoyée. |
| v26.08.116.0 | 🇩🇪 **Page des règles d'altitude CTR : mode sombre, bascule DE/EN, traduction anglaise.** `ctr-hoehenregeln.html` gagne une barre supérieure avec une **bascule de thème** (☀️/🌙 ; définit `data-theme`, persiste dans `localStorage`, respecte `prefers-color-scheme` + `?theme=` ; setter inline précoce contre le FOUC) et une **bascule de langue DE/EN** (persiste `ctrhr-lang`, respecte `?lang=`, défaut selon la langue du navigateur). Un **système i18n** complet (`T={de,en}`, `applyLang`) traduit chaque nœud statique (`data-i18n`/`data-i18n-html`) et reconstruit la scène SVG, les cartes de règles et les textes alt de la galerie par langue. Le texte allemand reste dans le HTML comme repli sans-JS/SEO. |
| v26.08.115.1 | 🇩🇪 **Page des règles d'altitude CTR : chapitre précision, réserve de sécurité, liens NfL.** `ctr-hoehenregeln.html` : (a) un terme « − réserve de sécurité (≈ 5 m) » dans la formule explicative (en rouge, explicitement une recommandation que la grille en direct ne déduit PAS — le calcul dans `skycheck.html` est inchangé) ; (b) un chapitre final « Wie genau sind diese Höhenwerte ? » (source MNT & tableau zoom→résolution, précision altimétrique RMSE/LE90, effets forêt/pente, logique d'arrondi, note DGM1) ; (c) correctif : les deux cartes d'effets utilisaient à tort la classe numérotée `.steps` (un badge bleu « 1 » masquait le titre) → `.factgrid` sans numéro ; (d) NfL 2026-1-3960 désormais liée aux cinq emplacements visibles (auparavant seulement intro + pied de page). |
| v26.08.115.0 | 🇩🇪 **Page des règles d'altitude CTR : tutoriel + galerie d'aéroports.** `ctr-hoehenregeln.html` gagne (1) un tutoriel illustré « So funktioniert das Live-Höhengitter » — une capture d'écran annotée de Stuttgart avec cinq repères numérotés (bouton grille, trame de couleur, légende, infobulle, overlay d'état), une liste de cinq cartes-étapes et un encadré avec la formule `hauteur max (AGL) = min(plafond au-dessus du sol, altitude de l'aéroport + plafond − altitude du terrain)` ; (2) une galerie de 18 aéroports allemands avec CTR-D en grille WebP à chargement différé (`img/hoehengrid-flughoehen-drohnen-<ville>.webp`, ~2,5 Mo au total). Toutes les captures recompressées en WebP (1600 px). La NfL 2026-1-3960 est désormais aussi liée dans l'introduction. |
| v26.08.114.3 | 🇩🇪 **Légende de la grille de hauteurs + infographie des règles.** La légende de la grille de hauteurs affiche désormais des graduations d'altitude sous l'échelle (`0 · 25 · 45 · ≥65 · 100 m`), un bouton ⓘ ouvre une nouvelle page hébergée **`ctr-hoehenregeln.html`** (une infographie en coupe des hauteurs de vol maximales des drones par zone CTR selon la NfL 2026-1-3960 ; le PDF officiel de la NfL est lié dans son pied de page), et la légende a été remontée au-dessus du bouton plein écran pour qu'ils ne se chevauchent plus. CSP étendu avec Google Fonts pour la nouvelle page. |
| v26.08.114.2 | 🇩🇪 **Étiquettes de référence altimétrique.** L'altitude du terrain dans le panneau de zone indique désormais le référentiel vertical du MNT (« ≈ X m MSL (DEM, EGM96) » — tuiles Terrarium = EGM96, repli Open-Meteo = EGM2008), et l'infobulle de survol de la grille de hauteurs ajoute l'altitude du terrain au curseur en **DHHN2016** (« … m AGL · terrain ≈ X m DHHN2016 » ; l'altitude orthométrique du MNT égale la DHHN2016 en Allemagne à moins d'un mètre, en deçà de la précision propre du MNT). |
| v26.08.114.1 | 🇩🇪 **Altitude du sol ponctuelle depuis les tuiles DEM (fiable).** L'altitude du terrain affichée dans le panneau de zone (« ≈ X m MSL ») dépendait uniquement de l'API d'altitude d'Open-Meteo et restait vide (« — ») à sa limite quotidienne ; elle provient désormais principalement des **tuiles d'altitude DEM** (sans limite quotidienne, cohérent avec la grille de hauteurs), Open-Meteo n'étant plus qu'un repli tolérant (le point central suffit). La mention « m MSL » était déjà présente. |
| v26.08.114.0 | 🇩🇪 **Grille de hauteurs sur tuiles d'altitude DEM + robustesse du contrôle.** La grille lit désormais le relief depuis des **tuiles d'altitude DEM** (Terrarium/AWS Open Data, ~25 m/px) au lieu de nombreuses requêtes ponctuelles Open-Meteo : quelques tuiles PNG fournissent le relief pleine résolution de toute la CTR → reliefs naturels, le **Domberg est désormais visible**, calcul ~1,6 s, et le survol est **précis immédiatement** (plus d'attente). La carte thermique est un seul `L.imageOverlay` net (sans coutures/artefacts) et l'échelle feux tricolores est calée sur les plafonds DFS (25 m orange, 45 m jaune). **Robustesse** (corrige des bugs en production de 113.2) : météo/Kp/trafic sont chacun non fatals, une source défaillante ne vide plus tout le contrôle ; `fetchWeather` utilise une fenêtre de 6 jours + délai (la fenêtre de 7 jours expirait chez BrightSky) ; une coquille `$alarm` est corrigée. |
| v26.08.113.2 | 🇩🇪 **Grille de hauteurs affinée.** Cellules fines d'env. 300 m sur rendu canvas (au lieu d'env. 940 m), épousant les limites arrondies de la CTR — les grosses cellules débordaient des bords et pouvaient afficher une valeur verte de zone 4 en un point de zone 3. Le relief est désormais interpolé bilinéairement à partir d'une grille d'appui grossière, avec réessai par bloc et remplissage des trous au plus proche voisin, de sorte qu'une requête d'altitude limitée ne vide plus la moitié de la CTR. Le survol calcule maintenant la **hauteur maximale à la position exacte du curseur** (valeur interpolée immédiate, puis l'altitude Open-Meteo précise en ce point) — nettement plus basse sur les collines comme le Domberg — affichée en pastille sombre sous le curseur pour ne plus recouvrir l'infobulle de zone DiPUL. Mobile : le panneau des géozones est toujours placé sous la barre de boutons (multi-lignes), plus de chevauchement (S24 Ultra et plus petit). La formule de hauteur elle-même était déjà correcte. |
| v26.08.113.0 | 🇩🇪 **La grille de hauteurs couvre désormais toute la CTR (refonte WFS).** La carte thermique en feux tricolores couvre maintenant l'**intégralité** de la zone de contrôle DFS (comme la GRID tchèque) au lieu d'une grille de 3 km centrée sur le repère, et elle est **calculée une seule fois par CTR puis mise en cache** — cliquer sur de nouvelles positions au sein de la même CTR ne la reconstruit plus (corrige la disparition intermittente de la carte/du bouton après quelques clics). Nouvelle source : le **WFS de DiPUL** (`dipul:kontrollzonen`) fournit les polygones exacts des sous-zones (chaque `U_CONTROL_ZONE_1…4` avec sa limite inférieure MSL) ; chaque cellule est affectée à sa **bonne** sous-zone par point-dans-polygone, le relief (Open-Meteo) est récupéré et coloré via `computeCtrFlightInfo` — les paliers 2/3/4 sont donc réels au lieu d'une seule zone détectée appliquée partout. Le bouton reste visible dans toute l'Allemagne ; la référence contraignante reste DiPUL / NfL. |
| v26.08.112.0 | 🇩🇪 **Grille de hauteurs (activable).** Une carte thermique en feux tricolores de la hauteur de vol maximale par cellule à l'intérieur d'une zone de contrôle DFS (CTR 2–4) — inspirée de la GRID du DroneMap tchèque. Approche hybride : le WMS de DiPUL affiche les limites des sous-zones ; la nouvelle superposition colore une grille de terrain 13×13 (~3 km, lot Open-Meteo) via la fonction existante computeCtrFlightInfo, en s'appuyant sur la zone CTR détectée à l'emplacement. Bouton d'activation propre sur la carte + légende ; n'apparaît qu'à l'intérieur d'une CTR allemande 2/3/4. Il s'agit d'une approximation (une seule sous-zone détectée est appliquée à l'ensemble de la grille — sur terrain plat au sein d'une même zone, le rendu est assez uniforme ; les paliers 2/3/4 apparaissent lors du passage d'une sous-zone à l'autre) — la référence contraignante reste DiPUL / NfL. |
| v26.08.111.0 | 🇳🇱🇵🇹 **Pays-Bas et Portugal ajoutés** (`skycheck-nl`, `skycheck-pt`) via l'**EASA Common Repository** (vecteur ArcGIS, CORS ouvert) au moyen de l'adaptateur de type IE : NL = ED-318 (~162 zones, couleur selon la restriction), PT = schéma dérivé de KML (~314 zones, couleur selon `Restriction`, type depuis `FolderPath` — Aeroportos, CTR, zones militaires, zones protégées — contact ANAC). Câblage pays (détection, noms, bbox, point de repère, CC, barre de sources de zones, tuile pays) et mécanisme de superposition nationale étendus à `nl`/`pt`. La voie officielle ED-269 tchèque figure sur la feuille de route. |
| v26.08.110.2 | **Ordre de la page d’accueil clarifié.** Les variantes de SkyCheck spécifiques à chaque pays apparaissent désormais en premier, suivies de SkyAlarm, PointCloud Manager, GPS2UTM et MetaLens. |
| v26.08.110.1 | **Navigation inter-applications complétée.** SkyCheck inclut désormais une carte PointCloud Manager aux côtés de SkyAlarm et GPS2UTM. |
| v26.08.110.0 | **Intégration de GPS2UTM et format de version partagé.** La page d’accueil renvoie vers GPS2UTM avec le logotype blanc/rouge/cyan partagé. SkyCheck utilise désormais `vYY.MM.major.subversion`, affiché intégralement dans l’en-tête de l’application, le pied de page et l’onglet du navigateur. |
| v1.09 | **Commandes de carte repliables sur toutes les tailles d’écran.** La barre d’outils compacte sur une seule ligne ainsi que les détails repliés de la météo, de l’altitude et des coordonnées remplacent désormais aussi les anciennes superpositions de bureau : l’écran partagé et les aperçus larges utilisent la même interface que les téléphones. |
| v1.08 | **Superpositions de carte compactes sur mobile.** La barre d’outils de la carte est réduite à une seule ligne sur les téléphones ; les rayons de recherche 5/100/200 m et le cercle d’alarme de 1,5 km s’ouvrent à la demande. La liste des zones reste visible tandis que la météo, le terrain et les coordonnées sont repliables ; les fenêtres d’adresse ne dupliquent plus les coordonnées GPS. |
| v1.07 | **Conversion de coordonnées GPS et référence altimétrique verticale.** Les positions WGS84/ETRS89 affichent désormais l’UTM immédiatement, avec en plus des détails Gauß-Krüger et GCG2016/DHHN2016 dépliables. `coordinates.html` est un convertisseur GPS en direct pour mobile, avec le point de repère officiel de Lübben intégré comme contrôle numérique. |
| v1.06 | **Superpositions claires affinées.** Les commandes de carte, le panneau d’état, le plein écran et le sélecteur de fond utilisent désormais des surfaces claires translucides sur OSM. Les commandes suivent un système rectangulaire cohérent de 32 px, tandis que les couches contextuelles conservent leur couleur. Vérifié sur ordinateur et mobile 390 px. |
| v1.05 | **Thème/carte couplés et aperçu local autrichien réparé.** L’interface claire choisit OSM, l’interface sombre CARTO Dark ; le bouton de style de carte reste disponible. Sans Netlify Functions, l’aperçu local charge désormais le fichier ED-269 d’Austro Control et affiche les zones d’aéroport et de contrôle. |
| v1.04 | **Interface claire globale.** Un bouton soleil/lune sur l’accueil et dans la navigation des résultats bascule toute l’interface, mémorise le choix et synchronise la vue d’alarme intégrée. La fonction est disponible dans les sept variantes nationales ; le style de carte reste indépendant. |
| v1.03 | **Performance France.** Les quatre couches de contexte OSM ne sont plus chargées sous forme de fichiers nationaux complets, mais regroupées par tuile de fenêtre d’affichage de 2° — pour Paris, cela réduit le transfert de ~4,1 Mo à ~0,25 Mo gzip. La fonction des zones françaises ne lit également que les tuiles spatiales pertinentes lors d’un démarrage à froid, au lieu du jeu de données complet de 8,8 Mo. |
| v1.02 | **Performance de l’analyse ponctuelle.** Plus de chargeur plein écran bloquant, un cercle d’analyse animé, des requêtes parallèles, des caches spatiaux à courte durée de vie, un rendu sur canvas et une mise en cache navigateur/CDN améliorée. |
| v0.98 | **Le titre de l'onglet du navigateur suit désormais la langue de l'interface.** La balise `<title>` était une chaîne allemande statique jamais reliée à l'i18n — chaque site hors DE affichait un titre d'onglet en allemand. Désormais `document.title` est défini à partir d'une clé i18n `docTitle` dans `applyLang()` — il se met à jour au chargement (selon la langue par défaut du pays) et à chaque changement de langue, dans les cinq langues. |
| v0.97 | Couches de contexte étendues à CH, ES, DK, IE et FR. Les superpositions autrichiennes de la v0.96 (zones protégées, autoroutes, lignes électriques, voies ferrées) existent désormais pour tous les pays hors DE (l'Allemagne les possède déjà via DiPUL). Le client est généralisé — CONTEXT_META + CONTEXT_COUNTRIES, un fichier de données par pays (data/<cc>-<couche>.json) ; le groupe de boutons d'activation apparaît automatiquement pour tout pays répertorié. Le générateur est désormais un outil unique et réutilisable (scripts/gen-context.mjs + un pilote fetch-context.sh robuste avec relance curl et reprise) qui raccorde les segments OSM en longues polylignes avant de les simplifier, ce qui a fortement réduit la taille des grands pays (autoroutes FR 9 → 3,5 Mo, ES 6 → 2,9 Mo avant gzip). La France est découpée selon une boîte englobante métropolitaine (la zone ISO entraînerait l'inclusion des territoires d'outre-mer). Ajouter un pays à l'avenir = générer les données + ajouter le code à CONTEXT_COUNTRIES (voir scripts/README.md) |
| v0.96 | 🇦🇹 Couches de contexte pour l'Autriche. skycheck-at peut désormais superposer quatre couches supplémentaires, activables individuellement : zones protégées (parcs nationaux, sites Natura 2000, réserves naturelles, zones de protection du paysage, parcs naturels, réserves de biosphère, éléments paysagers protégés, monuments naturels), autoroutes, lignes électriques à haute tension et voies ferrées principales. Issues d'OpenStreetMap (ODbL) sous forme d'instantanés GeoJSON statiques et présimplifiés dans data/at-*.json (générateurs dans scripts/), chargées à la demande lors de leur activation et tracées comme superpositions vectorielles colorées côté client. Il s'agit d'un contexte informatif (aide au respect des distances) : la vérification contraignante des zones reste assurée par Austro Control / dronespace.at, de sorte que ces couches n'alimentent pas l'évaluation du statut de vol. Inspiré de drohnenkarte.at, qui s'appuie sur les mêmes sources ouvertes |
| v0.95 | Correctif pour la v0.94 : le remplacement global de-DE→_locale() avait aussi touché la définition même de la table `_LOCALES` (`de: _locale()`), qui lisait `_LOCALES` alors qu'elle était encore en cours d'initialisation — une erreur de zone morte temporelle (temporal dead zone) qui empêchait toute l'application de démarrer. Le littéral « de-DE » a été rétabli. (`node --check` passe au niveau de la syntaxe ; il s'agissait d'une régression purement à l'exécution, détectée lors du test de fumée en conditions réelles.) |
| v0.94 | Audit i18n complet — plus aucune fuite d'allemand vers les autres langues. Plusieurs sections rendues dynamiquement (analyse point de rosée/givrage, libellés METAR/TAF, base des nuages estimée, messages de chargement/erreur, infobulles des marqueurs d'aéronefs, alertes, l'horodatage « Mis à jour ») étaient soit codées en dur en allemand, soit ne réactualisaient que leurs libellés statiques lors d'un changement de langue — de sorte que les utilisateurs anglophones/francophones voyaient encore de l'allemand. Désormais, chaque chaîne visible par l'utilisateur passe par la table i18n (16 nouvelles clés × 5 langues), une fonction utilitaire `_locale()` pilote tout le formatage des dates et heures (auparavant codé en dur en de-DE), et le changement de langue réaffiche toutes les sections de résultats dynamiques, et non plus seulement les libellés statiques `data-i18n` |
| v0.93 | Peaufinage de l'écran d'accueil et exactitude par pays. (1) Nouvelle tuile de démarrage « SkyCheck dans d'autres pays » listant chaque variante nationale sous forme de lien direct, mise en forme comme le logotype (Sky en blanc · Check en cyan · -xx en corail) ; le pays en cours est omis et les libellés suivent la langue de l'interface. (2) Sources de géozones propres à chaque pays : la barre de sources sur les pages de démarrage et de résultats (ainsi que le bouton de calque de la carte, autrefois « zones DiPUL ») affiche désormais le fournisseur correct pour chaque pays au lieu de DiPUL partout — DE DiPUL/DFS, FR Géoportail, AT Austro Control, CH BAZL, ES ENAIRE/EASA, DK Trafikstyrelsen, IE EASA. (3) Réglages entièrement traduits dans les cinq langues (auparavant en allemand uniquement) ; l'option de mode de calque DiPUL — qui ne concerne que l'Allemagne — est désormais masquée en dehors du DE, ne laissant que le réglage de prévision sur 48 h, indépendant du pays |
| v0.92 | 🇪🇸 **Sélecteur de source pour l'Espagne** : l'écran de démarrage permet de choisir la source des géozones — **EASA** Common Repository (vecteur ArcGIS côté client, coloré par type de zone, basé sur la fenêtre d'affichage ; par défaut) ou **ENAIRE** servAIS (l'ancien WMS officiel). EASA affiche des polygones de zones plus nets et transparents au lieu de la nappe WMS couvrant toute l'Espagne ; le choix est conservé dans `localStorage` |
| v0.91 | 🇮🇪 Correctif : `getLegalLink` plantait sur des valeurs `legal` numériques (le champ `Paragraf` du Danemark est un nombre), ce qui bloquait tout le pipeline de rendu pour le DK — converti en chaîne avant la correspondance regex |
| v0.90 | 🇩🇰 **Danemark** (`skycheck-dk`) & 🇮🇪 **Irlande** (`skycheck-ie`) : deux adaptateurs **vecteur ArcGIS** côté client — DK depuis le FeatureServer de Trafikstyrelsen, IE depuis l'EASA Common Repository (ED-318, préliminaire) ; les deux récupèrent le GeoJSON directement (CORS ouvert), colorent les polygones par catégorie et prennent en charge la superposition nationale |
| v0.89 | Recherche d'adresse restreinte au pays actif via le filtre `countrycode` de Photon (supprime les voisins transfrontaliers que la bounding box laissait passer) |
| v0.88 | **Recherche d'adresse restreinte au pays** : `geocode()` était câblé en dur sur l'Allemagne (`lang=de` + une bounding box allemande) — chaque variante de pays ne renvoyait que des suggestions allemandes. Désormais, une bounding box par pays + la langue de l'interface sont utilisées |
| v0.87 | **Valeurs par défaut par pays** : placeholder de recherche avec point de repère de la capitale (DE porte de Brandebourg, FR tour Eiffel, AT cathédrale Saint-Étienne, CH Palais fédéral, ES Puerta del Sol) et langue d'interface par défaut selon le pays à la première visite |
| v0.86 | 🇪🇸 **Espagne** (`skycheck-es`) : nouvel adaptateur pays suivant le pattern DE/CH — couche **WMS** ENAIRE servAIS pour l'overlay + **ArcGIS Identify** ENAIRE pour la liste de détail/statut (limites d'altitude structurées, liens légaux). CORS ouvert, aucune fonction/fichier/workflow |
| v0.85 | 🇨🇭 **Suisse** (`skycheck-ch`) : nouvel adaptateur pays suivant le pattern DE — couche **WMS** geo.admin.ch pour l'overlay cartographique + API REST **Identify** geo.admin.ch pour la liste de détail/statut. Toutes deux CORS ouvert, donc aucune fonction Netlify, aucun fichier hébergé ni workflow de mise à jour ne sont nécessaires |
| v0.84 | L'overlay cartographique 🇦🇹 AT dessine désormais **toutes** les zones autrichiennes (overlay national complet via `?all=1`, comme le WMS DE) au lieu des seules zones filtrées ponctuellement à l'emplacement marqué |
| v0.83 | 🇦🇹 **Autriche** (`skycheck-at`) : nouvel adaptateur pays. `zones-at.js` analyse le jeu de données ED-269 d'Austro Control ; `data/uas-zones-at.json` est **mis à jour mensuellement de façon automatique** par un workflow GitHub Actions (`update-at-zones.yml`) |
| v0.78–v0.82 | Passe sécurité et qualité (échappement XSS + CSP, correction de l'unité de visibilité METAR, complétude des 5 langues, corrections de défauts d'alarme, glace/brouillard/visibilité dans la vue en direct) — voir `docs/code-review-2026-07-16.md` |
| v0.76 | Correction de race condition : les polygones / cercles de géozones FR s'affichent désormais dès le premier rendu de la carte (auparavant uniquement après un double-clic provoquant un re-fetch). `drawZoneOverlay` s'exécutait avant la création de la carte ; un re-tracé après l'init utilise désormais le cache `lastZones` |
| v0.75 | i18n du nom de pays : le badge de la page d'accueil et le pied de page affichent le nom du pays actif dans la langue d'interface choisie (ex. domaine FR + UI ES → « Verificación de vuelo de dron · Francia »). Nouvelle table `COUNTRY_NAMES`, helper `_country()`, placeholder `{country}` interpolé par `_t()`. `fltcatDisclaimer` désindexé du pays (règle UE valable sans mention de pays) |
| v0.74 | Superposition cartographique FR : les géozones en mode FR sont désormais dessinées sur la carte Leaflet (polygones / cercles) en plus de la liste. `zones-fr.js` renvoie la géométrie ; `drawZoneOverlay()` effectue le rendu côté client. Le commutateur de zones reste compatible |
| v0.73 | Architecture d'adaptateur par pays (étape 1) : support multi-pays pour les géozones. Détection du pays via paramètre URL (`?country=fr`) ou nom d'hôte ; nouvelle fonction Netlify `zones-fr.js` lit le JSON ED-269 pour la France (`data/uas-zones-fr.json`, ~3,6k zones), DE conserve DiPUL WMS |
| v0.72 | Texte de la modale Info corrigé (public cible, catégorie spécifique, nouvelle section confidentialité) ; README étendu de l'allemand uniquement → 5 langues |
| v0.71 | 5 langues supportées (DE / EN / FR / ES / PL) ; sélecteur sur la page d'accueil |
| v0.70 | Modale info catégorie de vol (VFR / MVFR / IFR / LIFR) |
| v0.69 | Lien couverture nuageuse vers Windy ; vent METAR avec symbole ° et codes couleur |
| v0.68 | Lien SkyAlarm sur la page d'accueil |
| v0.67 | Bouton de style de carte remonté au-dessus de l'attribution Leaflet (correctif z-index) |
| v0.66 | Overlay basse altitude resserré, cycleur de style de carte dans la carte principale |
| v0.65 | Correction : caractères `\n` littéraux dans le HTML de la section METAR |
| v0.64 | Nouvelle Netlify Function `awc.js` comme proxy CORS pour NOAA AWC (METAR/TAF) |
| v0.63 | Formule δ de `fetchZones` calibrée empiriquement, rayon par défaut 100 m |
| v0.58 | Couplage rayon géozone 5 m / 100 m |
| v0.57 | Bannière d'installation PWA (`beforeinstallprompt`) |
| v0.54 | Intégration METAR/TAF, marqueurs d'aérodromes sur la carte, carte METAR |
| v0.35 | Vue Alarme Aéronef (plein écran, ADS-B, Haversine, Web Audio, carte Leaflet) |
| v0.27 | Sélecteur de langue DE/EN, I18N complet |
| v0.20 | Variable `APP_VER`, horodatage de la mesure Kp |
| v0.15 | GFZ chargé en asynchrone, Netlify Function comme proxy principal, temps de chargement ~1 s |
| v0.14 | Fonction serverless Netlify `gfz.js` comme proxy CORS fiable |
| v0.10 | Graphique Hp30 du GFZ (4 × mesure + prévision) |

---

## Confidentialité

SkyCheck ne suit ni ne stocke aucune donnée utilisateur. L'application est une simple application web — même « l'installation » en PWA ne fait que poser une icône d'app et n'installe rien de durable. Les données ne sont chargées que temporairement et disparaissent lorsque vous quittez l'app.

---

## Licence et responsabilité

Allemagne, France, Autriche, Suisse, Espagne, Danemark et Irlande · Exploitation en VLOS · Aucune responsabilité quant à l'exhaustivité ou l'exactitude des données affichées. L'utilisation de l'application ne remplace aucune autorisation officielle requise. SkyCheck est une **aide à l'orientation** — l'autorisation légale requise et la libération finale de l'espace aérien sont délivrées via les portails nationaux compétents (p. ex. **DFS Aviation Services** pour la DE, **Austro Control Dronespace** pour l'AT, **skyguide** pour la CH).

Les sources de données sont soumises à leurs licences respectives (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch, ENAIRE, Trafikstyrelsen, EASA).
