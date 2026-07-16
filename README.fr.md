**🌍 Langue :** [English](README.md) · [Deutsch](README.de.md) · **Français** · [Español](README.es.md) · [Polski](README.pl.md)

---

# SkyCheck — Vérification de vol de drone (DE · FR · AT · CH · ES)

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
| 🇪🇸 **Espagne** | [skycheck-es.netlify.app](https://skycheck-es.netlify.app/) | ENAIRE servAIS — WMS + ArcGIS Identify |

> Les cinq sont le **même** déploiement de `skycheck.html` issu de ce dépôt, chacun servi sur son propre site Netlify. Détection du pays : nom d'hôte (`skycheck-<xx>.netlify.app`) ou paramètre URL `?country=de|fr|at|ch|es`. Défaut : `de`. Chaque variante de pays prédéfinit aussi la **langue de l'interface**, un **indice de recherche de point de repère de la capitale** et une **recherche d'adresse restreinte au pays**.

📦 **Version actuelle :** v0.89

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
| **Carte des espaces aériens** | Géozones drone spécifiques au pays (DE : DiPUL · FR/AT : ED-269 · CH : geo.admin.ch · ES : ENAIRE) — zones d'interdiction, zones de contrôle, réserves naturelles ; rayon de recherche commutable entre 5 m et 100 m |
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
| **Géozones 🇪🇸** [ENAIRE servAIS](https://www.enaire.es/) | Zones UAS espagnoles `SRV_UAS_ZG_V0` (WMS + ArcGIS Identify) | ✅ |

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
    zones-at.js             ← zones UAS Autriche (lit data/uas-zones-at.json ; ?all=1 = overlay complet)
data/
  uas-zones-fr.json         ← zones UAS France ED-269 (snapshot mensuel, remplaçable)
  uas-zones-at.json         ← zones UAS Autriche ED-269 (286 zones, mise à jour automatique)
  uas-zones-at.version      ← marqueur de la dernière version Austro Control importée (idempotence)
.github/
  workflows/
    update-at-zones.yml     ← tâche mensuelle : récupère le dernier ED-269 Austro Control → commit du fichier de données
redirect.html               ← page de redirection optionnelle
```

> 🇨🇭 **La CH n'a besoin de rien de ce qui précède** — l'overlay cartographique est la couche WMS geo.admin.ch et le détail des zones provient de l'API REST Identify de geo.admin.ch, toutes deux appelées directement depuis le navigateur (CORS ouvert). Aucune fonction Netlify, aucun fichier de données hébergé, aucun workflow de mise à jour.

### Support multi-pays (depuis v0.73)

SkyCheck utilise un **pattern d'adaptateur** pour les sources de géozones par pays. Le pays est détecté via le nom d'hôte (ex. `skycheck-ch.netlify.app`) ou le paramètre URL `?country=de|fr|at|ch|es`. Défaut : `de`. Météo, ADS-B, METAR/TAF et indice Kp sont mondiaux ; la **langue de l'interface, le point de repère de l'indice de recherche et la bounding box de géocodage** sont définis par pays.

| Pays | Source des géozones | Overlay | Liste de détail / statut | Données et mises à jour |
|---|---|---|---|---|
| 🇩🇪 **DE** (défaut) | DiPUL WMS (`uas-betrieb.de`) | Tuiles WMS | WMS GetFeatureInfo | service en direct (officiel, toujours à jour) |
| 🇫🇷 **FR** | Jeu de données ED-269 | polygones/cercles côté client | `zones-fr.js` (filtre bbox) | `data/uas-zones-fr.json` (~3,6k zones, remplaçable) |
| 🇦🇹 **AT** | Austro Control ED-269 | toutes les zones dessinées côté client (286) | `zones-at.js` (filtre bbox) | `data/uas-zones-at.json` — **mise à jour mensuelle automatique** via GitHub Actions (`update-at-zones.yml`) |
| 🇨🇭 **CH** | BAZL / geo.admin.ch `ch.bazl.einschraenkungen-drohnen` | Tuiles WMS | API REST **Identify** geo.admin.ch | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |
| 🇪🇸 **ES** | ENAIRE servAIS `SRV_UAS_ZG_V0` | Tuiles WMS | API REST **Identify** ArcGIS | service en direct (CORS ouvert) — **aucune fonction, aucun fichier, aucun workflow** |

Deux styles d'intégration : **WMS + requête ponctuelle** (DE, CH, ES — les services officiels en direct rendent l'ensemble du pays et répondent directement aux requêtes ponctuelles) et **fichier ED-269 hébergé + fonction Netlify** (FR, AT — un jeu de données JSON dans le dépôt, filtré par bbox côté serveur ; l'AT se met à jour lui-même chaque mois).

### Combien de géozones par pays ?

Nombres de zones extraits directement de la source en direct de chaque pays (DE via DiPUL WFS sur l'ensemble des 31 catégories ; ES via ENAIRE ArcGIS ; FR/AT depuis les jeux de données ED-269 ; CH depuis le GeoJSON geo.admin.ch), normalisés par la superficie terrestre :

| Pays | Géozones | Superficie (km²) | Zones pour 1 000 km² |
|---|--:|--:|--:|
| 🇩🇪 **Allemagne** | **88 635** | 357 592 | **≈ 248** |
| 🇪🇸 Espagne | 15 787 | 505 990 | ≈ 31 |
| 🇨🇭 Suisse | 1 232 | 41 285 | ≈ 30 |
| 🇫🇷 France | 3 642 | 551 695 | ≈ 6,6 |
| 🇦🇹 Autriche | 286 | 83 879 | ≈ 3,4 |

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

Allemagne, France, Autriche, Suisse et Espagne · Exploitation en VLOS · Aucune responsabilité quant à l'exhaustivité ou l'exactitude des données affichées. L'utilisation de l'application ne remplace aucune autorisation officielle requise. SkyCheck est une **aide à l'orientation** — l'autorisation légale requise et la libération finale de l'espace aérien sont délivrées via les portails nationaux compétents (p. ex. **DFS Aviation Services** pour la DE, **Austro Control Dronespace** pour l'AT, **skyguide** pour la CH).

Les sources de données sont soumises à leurs licences respectives (DWD Open Data, GFZ CC BY 4.0, Airplanes.live Fair Use, NOAA Public Domain, DiPUL, Austro Control, BAZL / swisstopo geo.admin.ch, ENAIRE).
