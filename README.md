# myPlanning

Application web locale de gestion de planning — personnel, tranches horaires et créneaux
hebdomadaires. Usage strictement personnel et mono-utilisateur : pas de compte, pas de cloud, pas
de réseau.

## Stack

- **React 19** + **Vite 8** + **TypeScript** strict
- **Tailwind CSS 4** en configuration CSS-first (`src/styles/theme.css`)
- **Zustand** pour l'état
- **react-router-dom 7**, **date-fns**

## Stockage des données

Les données vivent dans un vrai fichier sur le disque, `data/planning.json` — pas dans le
`localStorage` du navigateur. Vider le cache ou changer de navigateur ne perd donc rien.

Un navigateur peut *lire* un fichier local tout seul, mais aucune page web n'a le droit de le
*réécrire* — c'est une restriction de sécurité volontaire. Un petit serveur Node comble ce trou :
il expose `GET`/`PUT /api/data`, branché sur le serveur de développement Vite en mode `npm run
dev`, ou lancé seul via `npm start` une fois l'app construite. Il n'écoute que sur `127.0.0.1` :
rien sur le réseau local ne peut y accéder.

À chaque modification (ajout d'une personne, d'un créneau…), l'app réécrit le fichier entier après
un court délai — l'indicateur en haut à droite affiche « Enregistrement… » puis « Enregistré ». Une
copie de la version précédente est gardée dans `data/planning.backup.json`.

`data/planning.example.json` est le jeu de données de démarrage (commité) : au tout premier
lancement, `data/planning.json` (gitignoré, propre à ta machine) en est une copie.

## Démarrage

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

## Sauvegarder ou déplacer les données

Paramètres > Données propose :

- **Exporter** — télécharge un instantané JSON horodaté du planning.
- **Importer** — remplace les données actuelles par un fichier exporté (confirmation demandée).
- **Réinitialiser** — revient au jeu d'exemple (confirmation demandée).

Pour une sauvegarde à froid, il suffit aussi de copier `data/planning.json` ailleurs.

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
