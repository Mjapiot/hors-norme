# Hors Norme — le jeu des records

Jeu d'estimation sur les superlatifs (« Combien mesure le plus grand homme du monde ? »), jouable **sur un seul téléphone** :
en équipes (2 à 6) ou chacun pour soi (2 à 10). PWA installable sur iPhone, jouable hors connexion.

## Lancer en local

```bash
npm install
npm run dev        # développement
npm test           # tests unitaires (Vitest)
npm run build && npm run preview   # version de production + service worker
```

Pour tester sur un iPhone du même réseau Wi-Fi : `npm run dev -- --host`, puis ouvrir l'URL affichée dans Safari.

## Règles du jeu

**Questions chiffrées** (classique et Chrono 30 s) — chacun marque selon *sa* précision :

| Écart avec la bonne réponse | Points |
| --- | --- |
| Tout pile | 3 |
| moins de 5 % | 2 |
| moins de 20 % | 1 |
| au-delà | 0 |

- **Plus proche +1**, seulement s'il a marqué (deux équipes trop loin → 0 pour tout le monde).
- **Égalité parfaite** pour ce point → **duel de rapidité** (plus ou moins, sur l'écran partagé ; une erreur élimine).
- **Malus « Hors Norme » −1** à partir de 3 participants : réponse plus du double ou moins de la moitié de la vraie valeur. Les scores ne descendent jamais sous 0.
- Années : paliers à 0 / 5 / 20 ans d'écart.

**Manches bonus** (toutes les 4 questions) : Classement express (3 pts si parfait, 1 si 2 bien placés), Plus ou moins (1 pt si juste).

**Dernière question** (mode 5 ou 10 questions) : gains doublés (le malus reste à −1).

**Déroulé** : l'ordre de passage tourne à chaque manche ; chacun peut « corriger » la réponse précédente avant de passer
le téléphone (sauf au Chrono, dont la question reste secrète jusqu'à la saisie) ; deux questions sur le même sujet
ne tombent jamais dans la même partie ; balle de match annoncée à 4 pts de l'objectif.

**Fin de partie** : 5 ou 10 questions, ou objectif 8 / 12 / 15 pts (leader unique requis). Objectifs calibrés par simulation :
le leader marque ≈ 1,2 pt/manche, soit ≈ 8, 11 et 14 manches en médiane.

## Structure

```
src/
  game/        cœur du jeu, pur et testé : types, scoring, deck (tirage), engine (machine d'état)
  data/        questions.ts — 257 questions (8 thèmes), dont 126 vérifiées en ligne (verified_at)
  screens/     Accueil, Configuration, Question / Passe-téléphone / Saisie, Révélation / Podium
  components/  NumPad, Timer, InstallHint, Icons (Phosphor, MIT)
  lib/         stockage local, formatage français
```

## Mode admin

Ouvrir l'app avec `?admin=1` affiche, sous chaque réponse, l'état de vérification et l'identifiant de la question
(`?admin=0` pour revenir au mode public).

## ⚠️ Contenu à relire

Les questions ont été générées par IA : **chaque réponse doit être vérifiée** avant un lancement public
(`verified_at` passe alors à une date). Les questions `perishable` (records de personnes vivantes, sport…)
doivent être revérifiées régulièrement.

## Feuille de route

- **Lot 2** : Supabase (tables `themes`, `questions`, `packs`), back-office de relecture, pipeline de génération IA, synchro hors connexion (IndexedDB).
- **Lot 3** : packs payants (Stripe puis RevenueCat), compte optionnel, mode solo / défi du jour, offre B2B, emballage Capacitor (App Store / Play Store).
