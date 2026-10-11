# Changelog

## 1.0.7 — 11 octobre 2026

### Nouveautés
- **Paramètres > À propos** : affiche la version installée et permet de vérifier manuellement les mises à jour. Le résultat est explicite : à jour, nouvelle version disponible (avec le bouton « Mettre à jour »), pas de connexion internet, ou vérification impossible.

### Corrections
- **Mise à jour sans réseau** : le bouton « Mettre à jour » affiche désormais un message clair (« pas de connexion internet ») au lieu d'une erreur technique.

## 1.0.6 — 11 octobre 2026

### Nouveautés
- **Mise à jour automatique dans l'app** : la bannière propose « Mettre à jour », l'app télécharge (avec progression), installe et redémarre toute seule. L'archive est vérifiée par signature avant installation.
- **Couleur par personnel** : choix d'une couleur parmi 8 dans la fiche, appliquée à l'avatar partout dans l'app.
- **Majuscule automatique** à chaque mot pour les prénoms, noms, équipes et tranches horaires.
- **Logo calendrier** (menu, écran de démarrage, favicon, icônes de l'application).
- **Installateur en français** (`.exe` et `.msi`), installation pour l'utilisateur courant sans droits administrateur.

### Corrections
- **Planning** : la carte de survol d'un personnel ne recouvre plus la case du lundi et n'empêche plus d'y ajouter un créneau.
- **Export CSV du planning** : ouvre la boîte « Enregistrer sous » de Windows et indique où le fichier est enregistré (le téléchargement par lien ne fonctionnait pas dans l'application).

### Autres
- Retrait de la bannière « Version de développement — Démo ».
- Certificat public de signature fourni dans `certificate/` avec un script d'installation, pour supprimer l'avertissement Windows « éditeur inconnu » poste par poste.

## 1.0.0 — 10 août 2026
- Première version : planning hebdomadaire, personnels, ressources humaines (CP, heures supplémentaires), export et import JSON, impression, thème clair/sombre, application desktop Windows.
