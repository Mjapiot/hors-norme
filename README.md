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

| Manche | Principe | Points |
| --- | --- | --- |
| Question | Chacun tape un chiffre en secret | 1er 3 pts · 2e 2 pts · 3e 1 pt (le dernier ne marque jamais) · +1 si à moins de 5 % · +3 si tout pile |
| ⚡ Chrono 30 s | Pareil, mais 30 s par équipe (la saisie en cours est validée à la fin) | idem |
| 📊 Classement express | Ordonner 4 éléments | 1 pt par bonne position, +2 si parfait |
| ↕️ Plus ou moins | Au-dessus ou en dessous d'un seuil | 2 pts si juste |

Une manche bonus toutes les 4 questions. Fin de partie : 5 ou 10 questions, ou 10/15/20 points (leader unique requis).
Pour les questions « en quelle année », l'écart se juge en années (bonus à ±5 ans).

## Structure

```
src/
  game/        cœur du jeu, pur et testé : types, scoring, deck (tirage), engine (machine d'état)
  data/        questions.ts — 157 questions de départ (toutes verified_at = null)
  screens/     Accueil, Configuration, Question / Passe-téléphone / Saisie, Révélation / Podium
  components/  NumPad, Timer, InstallHint
  lib/         stockage local, formatage français
```

## ⚠️ Contenu à relire

Les questions ont été générées par IA : **chaque réponse doit être vérifiée** avant un lancement public
(`verified_at` passe alors à une date). Les questions `perishable` (records de personnes vivantes, sport…)
doivent être revérifiées régulièrement.

## Feuille de route

- **Lot 2** : Supabase (tables `themes`, `questions`, `packs`), back-office de relecture, pipeline de génération IA, synchro hors connexion (IndexedDB).
- **Lot 3** : packs payants (Stripe puis RevenueCat), compte optionnel, mode solo / défi du jour, offre B2B, emballage Capacitor (App Store / Play Store).
