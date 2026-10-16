# Hors Norme — dossier de fiche store

Textes à copier-coller : `content/store/textes.json` (limites de caractères vérifiées).
Visuels : `content/store/visuels/` (captures iPhone 6,9", Android, bannière, icône).

## Informations communes

| Champ | Valeur |
| --- | --- |
| Nom | Hors Norme – Jeu des records |
| Identifiant de l'app (bundle ID / package) | `app.horsnorme` |
| Éditeur | Maxence Japiot (particulier) |
| E-mail de contact | maxoujapiot@gmail.com |
| Site web | https://hors-norme.vercel.app |
| Politique de confidentialité | https://hors-norme.vercel.app/confidentialite |
| Page d'assistance | https://hors-norme.vercel.app/support |
| Langue principale | Français (France) |
| Prix | Gratuit, sans achats intégrés, sans publicité |
| Copyright | © 2026 Maxence Japiot |

## App Store (App Store Connect)

**Fiche**
- Nom : `Hors Norme – Jeu des records` (28/30)
- Sous-titre : `Le quiz d'estimation en groupe` (30/30)
- Texte promotionnel, description, mots-clés, nouveautés : voir `textes.json`
- Catégorie principale : **Jeux** → sous-catégories **Questions-réponses** et **Famille**
- Appareils : iPhone uniquement (l'iPad affiche l'app en mode compatibilité)

**Confidentialité de l'app** (« App Privacy ») : **Données non collectées.**
L'app n'utilise aucun outil d'analyse ni de publicité ; le téléchargement des questions ne transmet aucune donnée utilisateur.

**Classification par âge** (questionnaire) : répondre « Aucun » partout → **4+**.
(Aucune violence, aucun contenu sexuel, aucun jeu d'argent, aucune référence à l'alcool ou au tabac, pas de contenu généré par les utilisateurs, pas de navigation web libre.)

**Conformité à l'exportation** : l'app n'utilise que le chiffrement standard du système (HTTPS) → exemptée.
`ITSAppUsesNonExemptEncryption = NO` est déjà déclaré dans `Info.plist`.

**DSA (Union européenne)** : se déclarer **non-commerçant** tant que l'app est gratuite et sans revenus.
⚠️ À revoir avant d'activer des packs payants (le statut de commerçant impose d'afficher une adresse et un téléphone).

**Notes pour l'équipe de validation Apple** (« App Review Information ») :
> Aucun compte n'est nécessaire. Hors Norme est un jeu d'estimation qui se joue à plusieurs sur un seul téléphone.
> Pour tester : Nouvelle partie → Jouer en équipes → Continuer → 5 questions → C'est parti ! → À vos réponses → saisir un chiffre au pavé → Valider, puis faire de même pour l'équipe 2 → Révéler.
> Le jeu fonctionne hors connexion ; les questions sont mises à jour depuis notre serveur quand une connexion est disponible.
> Fonctions natives : vibrations (Haptics), écran maintenu allumé pendant une partie, partage des résultats en image, demande de note après quelques parties.

## Google Play (Play Console)

**Fiche principale**
- Titre : `Hors Norme – Jeu des records` (28/30)
- Description courte : voir `textes.json` (77/80)
- Description complète : voir `textes.json`
- Catégorie : **Jeux → Quiz** ; tags : Quiz, Jeu de société, Famille, Multijoueur local
- Bannière (1024 × 500) et icône (512 × 512) : `visuels/android/`

**Classification du contenu (IARC)** : catégorie « Jeu de quiz / culture générale », aucun contenu sensible → **PEGI 3**.

**Public cible** : recommandé **13 ans et plus**.
Le jeu convient à tous, mais cibler les moins de 13 ans fait entrer l'app dans le programme « Familles » de Google (exigences et examen supplémentaires). On pourra l'élargir plus tard.

**Sécurité des données** (« Data safety ») :
- L'app collecte-t-elle ou partage-t-elle des données utilisateur ? **Non.**
- Données chiffrées en transit : **Oui** (HTTPS).
- Possibilité de demander la suppression des données : sans objet (aucune donnée collectée).

**Annonces** : l'app ne contient **pas** de publicité.
**Accès à l'application** : toutes les fonctionnalités sont accessibles sans identifiants.

**Test fermé obligatoire** (compte personnel) : **au moins 12 testeurs inscrits pendant 14 jours consécutifs** avant de pouvoir demander l'accès à la production.

## Captures d'écran

| Store | Format | Dossier |
| --- | --- | --- |
| App Store — iPhone 6,9" | 1320 × 2868 px (PNG) | `visuels/ios-6.9/` |
| Google Play — téléphone | 1080 × 1920 px (PNG) | `visuels/android/` |

Ordre conseillé (6 visuels, accroche + capture) : 1. accueil · 2. question · 3. saisie secrète · 4. révélation « tout pile » · 5. duel de rapidité · 6. tutoriel.
Conseil : mettre la **révélation « tout pile »** en premier sur Google Play (c'est l'écran le plus parlant).

Régénérer : captures brutes dans `visuels/raw/` (build de démo : `HN_DEMO=1 npm run build:native`, simulateur iPhone 17 Pro Max, barre d'état 9:41), puis `node scripts/store-visuals.cjs`.
