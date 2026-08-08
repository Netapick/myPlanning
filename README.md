# myPlanning

Application locale de gestion de planning — personnel, tranches horaires et créneaux
hebdomadaires. Usage strictement personnel et mono-utilisateur : pas de compte, pas de cloud, pas
de réseau.

Deux façons de la faire tourner :

- **Navigateur** — `npm run dev`, pratique pour développer (rechargement à chaud).
- **Application desktop Windows** — un `.exe` à double-clic, sans terminal, sans commande à
  taper. C'est la cible pour un usage au quotidien.

## Stack

- **React 19** + **Vite 8** + **TypeScript** strict
- **Tailwind CSS 4** en configuration CSS-first (`src/styles/theme.css`)
- **Zustand** pour l'état
- **react-router-dom 7**, **date-fns**
- **Tauri 2** (Rust) pour la coquille desktop Windows

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

Le jeu de données de démarrage (`data/planning.example.json`, commité) sert de graine identique
dans les deux modes : au tout premier lancement, `planning.json` en est une copie avec les dates
résolues sur la semaine en cours.

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
npm run tauri:build   # produit le .exe/.msi final dans src-tauri/target/release/bundle/
```

Le `.exe` généré par `tauri:build` se lance par double-clic : pas de terminal, pas de commande,
pas de serveur à démarrer soi-même.

## Sauvegarder ou déplacer les données

Paramètres > Données propose, dans les deux modes :

- **Exporter** — télécharge un instantané JSON horodaté du planning.
- **Importer** — remplace les données actuelles par un fichier exporté (confirmation demandée).
- **Réinitialiser** — revient au jeu d'exemple (confirmation demandée).

Pour une sauvegarde à froid, il suffit aussi de copier `planning.json` ailleurs (voir son
emplacement plus haut selon le mode).

## Écrans

- **Tableau de bord** — effectif actif, heures planifiées de la semaine, taux d'occupation,
  histogramme des heures par jour, prochains créneaux.
- **Planning** — grille hebdomadaire Employé × 7 jours, filtre par équipe, création/édition de
  créneau, glisser-déposer pour déplacer.
- **Personnel** — fiches (contrat, statut, équipe), filtres, recherche, ajout/édition/suppression.
- **Paramètres** — tranches horaires (modèles de poste réutilisables), équipes, seuils
  d'alerte, données, apparence (clair/sombre/système).

Une cloche dans la barre du haut signale, à partir des données du planning : fins de contrat
proches, dépassements ou sous-charges d'heures, créneaux qui se chevauchent, créneaux posés sur
une personne absente, et jours d'ouverture sans personne planifiée.
