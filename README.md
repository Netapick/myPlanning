# myPlanning

Application locale de gestion de planning — personnel, tranches horaires et créneaux
hebdomadaires. Usage strictement personnel et mono-utilisateur : pas de compte, pas de cloud. Les
données ne quittent jamais le poste ; la seule connexion réseau est la vérification des mises à
jour au démarrage de l'application desktop (voir plus bas).

Deux façons de la faire tourner :

- **Navigateur** — `npm run dev`, pratique pour développer (rechargement à chaud).
- **Application desktop Windows** — un installateur à double-clic, sans terminal, sans commande à
  taper, en français. C'est la cible pour un usage au quotidien.

## Stack

- **React 19** + **Vite 8** + **TypeScript** strict
- **Tailwind CSS 4** en configuration CSS-first (`src/styles/theme.css`)
- **Zustand** pour l'état
- **react-router-dom 7**, **date-fns**
- **Tauri 2** (Rust) pour la coquille desktop Windows, avec les plugins `dialog`, `opener`,
  `updater` et `process`

## Stockage des données

Les données vivent dans un vrai fichier JSON sur le disque — jamais dans le `localStorage` du
navigateur. Vider le cache ou changer de navigateur ne perd donc rien. L'emplacement dépend du
mode d'exécution :

- **Mode navigateur** : `data/planning.json`, dans le dossier du projet.
- **Mode desktop (Tauri)** : `%APPDATA%\com.myplanning.app\planning.json` — le dossier de données
  standard de Windows, indépendant de l'endroit où l'app est installée (pas de souci de droits
  d'écriture même si elle est dans `Program Files`).

Ce sont deux fichiers distincts : les données créées dans un mode n'apparaissent pas dans l'autre.

Un navigateur peut *lire* un fichier local tout seul, mais aucune page web n'a le droit de le
*réécrire* — restriction de sécurité volontaire. Deux mécanismes comblent ce trou, un par mode :

- **Navigateur** — un petit serveur Node expose `GET`/`PUT /api/data`, branché sur le serveur de
  développement Vite (`npm run dev`), ou lancé seul via `npm start` une fois l'app construite. Il
  n'écoute que sur `127.0.0.1` : rien sur le réseau local ne peut y accéder.
- **Desktop** — pas de serveur du tout : la lecture/écriture passe par des commandes Rust
  (`src-tauri/src/store.rs`) invoquées directement depuis l'interface. C'est ce qui permet à
  l'app de se lancer par double-clic, sans rien démarrer soi-même.

Dans les deux cas, `src/lib/api.ts` est le seul point de contact entre l'interface et le stockage :
aucun écran ne sait dans quel mode il tourne.

À chaque modification (ajout d'une personne, d'un créneau…), l'app réécrit le fichier entier après
un court délai — l'indicateur en haut à droite affiche « Enregistrement… » puis « Enregistré ». Une
copie de la version précédente est gardée à côté (`planning.backup.json`).

Le jeu de données de démarrage (`data/planning.example.json`, commité, copié dans
`src-tauri/resources/` pour le desktop) est vierge : aucune personne, équipe ni créneau. Au tout
premier lancement, `planning.json` en est une copie.

## Démarrage — mode navigateur

```bash
npm install
npm run dev
```

Ouvre `http://127.0.0.1:1430`.

### Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement Vite + API de persistance |
| `npm run build` | Type-check (`tsc -b`) + build de production dans `dist/` |
| `npm start` | Sert le build de production (`dist/`) + l'API, sans Vite |
| `npm run lint` | Lint (oxlint) |
| `npm run preview` | Sert le build de production via Vite (pratique pour le tester avant `npm start`) |

## Démarrage — application desktop (Tauri)

Prérequis : [Rust](https://www.rust-lang.org/tools/install) (toolchain `stable-msvc` sur
Windows) et [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (préinstallé sur
Windows 11, sinon installé automatiquement par Tauri au premier lancement).

```bash
npm install
npm run tauri:dev     # fenêtre desktop, avec rechargement à chaud
npm run tauri:build   # produit l'installateur .exe et le .msi dans src-tauri/target/release/bundle/
```

Les installateurs sont en français et s'installent pour l'utilisateur courant, sans droits
administrateur. L'application se lance ensuite par double-clic : pas de terminal, pas de commande,
pas de serveur à démarrer soi-même.

### Avertissement Windows à l'installation

L'installateur est signé avec un certificat **auto-signé** : Windows ne le connaît pas et peut
afficher « éditeur inconnu » ou un blocage SmartScreen. Poste par poste, avant d'installer :
copier le dossier [`certificate/`](certificate/) sur le PC, puis lancer
`Installer-le-certificat.ps1` (clic droit > Exécuter avec PowerShell). Si le fichier téléchargé
reste bloqué : clic droit > Propriétés > Débloquer. Seul un certificat de signature de code payant
supprime cet avertissement pour tout le monde.

## Mises à jour

Au démarrage, l'application desktop interroge les releases GitHub du dépôt. Si une version plus
récente existe, une bannière propose **Mettre à jour** : l'app télécharge la nouvelle version (avec
progression), vérifie sa signature, l'installe puis redémarre toute seule. Aucune donnée n'est
envoyée ; hors connexion, la vérification échoue silencieusement et l'app fonctionne normalement.
En mode navigateur, il n'y a pas de mise à jour (pas de version installée).

### Publier une version

1. Passer le numéro de version à `X.Y.Z` dans `package.json`, `package-lock.json`,
   `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` et `src-tauri/Cargo.lock`.
2. Mettre à jour [`CHANGELOG.md`](CHANGELOG.md), commiter, puis `git tag vX.Y.Z` et pousser le tag.
3. Le workflow `.github/workflows/release.yml` construit, signe et publie la release, avec les
   installateurs, leurs signatures `.sig` et le fichier `latest.json` que l'app interroge.

Un tag contenant `-demo` est publié en pré-release : il n'est jamais proposé comme mise à jour.

La signature des mises à jour utilise une clé privée Tauri, stockée dans le secret GitHub
`TAURI_SIGNING_PRIVATE_KEY` (copie locale hors dépôt dans `~/.tauri/`). La clé publique est dans
`tauri.conf.json`. **Perdre la clé privée empêche de publier des mises à jour pour les
installations existantes.** La signature de l'installateur Windows utilise, elle, les secrets
`WINDOWS_CERTIFICATE` et `WINDOWS_CERTIFICATE_PASSWORD`.

## Sauvegarder ou déplacer les données

Paramètres > Données propose, dans les deux modes :

- **Exporter** — enregistre un instantané JSON horodaté du planning (boîte « Enregistrer sous »
  sur le desktop, téléchargement dans le navigateur).
- **Importer** — remplace les données actuelles par un fichier exporté (confirmation demandée).
- **Réinitialiser** — revient au jeu de départ vierge (confirmation demandée).

Pour une sauvegarde à froid, il suffit aussi de copier `planning.json` ailleurs (voir son
emplacement plus haut selon le mode).

## Écrans

- **Tableau de bord** — effectif actif, heures planifiées de la semaine, taux d'occupation,
  histogramme des heures par jour, prochains créneaux.
- **Planning** — grille hebdomadaire Employé × 7 jours, filtre par équipe, création/édition de
  créneau, glisser-déposer pour déplacer, export CSV de la semaine, impression.
- **Personnels** — fiches (contrat, statut, équipe, couleur), filtres, recherche,
  ajout/édition/suppression. Les noms prennent automatiquement une majuscule à chaque mot.
- **RH** — soldes de congés payés et d'heures supplémentaires, événements (absences, congés,
  récupérations).
- **Paramètres** — tranches horaires (modèles de poste réutilisables), équipes, seuils
  d'alerte, données, apparence (clair/sombre/système).

Une cloche dans la barre du haut signale, à partir des données du planning : fins de contrat
proches, dépassements ou sous-charges d'heures, créneaux qui se chevauchent, créneaux posés sur
une personne absente, et jours d'ouverture sans personne planifiée.
