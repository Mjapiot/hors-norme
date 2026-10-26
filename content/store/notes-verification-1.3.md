# Notes pour App Review — version 1.3.0

À coller dans App Store Connect → version 1.3.0 → Informations de vérification de l'app → Remarques
(remplace les notes précédentes, qui indiquaient « no advertising »).

---

Hello, and thank you for reviewing Hors Norme 1.3.

WHAT'S NEW: ADVERTISING (Google AdMob)
The app is free and now shows ads from Google AdMob:
1. Interstitial ad at the end of a game, when the players leave the podium screen ("Revanche !" or "Accueil").
2. Optional rewarded video: on the last setup step ("Les thèmes"), tap a locked premium theme (e.g. "Football"), then "Regarder une vidéo". After the video, the theme is unlocked for one game (up to 3 videos per day). The reward is confirmed by AdMob server-side verification before the questions are downloaded, so an Internet connection is needed for this step.

CONSENT
- On first launch (after the tutorial), the Google UMP consent message is shown to users in the EEA/UK/Switzerland, with "Autoriser", "Refuser" and "Gérer les options".
- Then the App Tracking Transparency prompt is shown. If the user declines, only non-personalized ads are requested.
- Users can change their choices at any time with the "Choix publicitaires" link at the bottom of the home screen.
- Ad content is limited to the "Parental guidance" rating (the app is played by families).

NO PURCHASES, NO ACCOUNT
There are no in-app purchases and no account. Premium themes can only be unlocked by watching a rewarded video.

HOW TO PLAY (unchanged)
Tap "Nouvelle partie", choose "Jouer en équipes", keep the default names, choose "5 questions", keep the level and themes, tap "C'est parti !". For each question, tap "À vos réponses", type a number, hand over the phone, then tap "Révéler !". The interstitial ad appears when leaving the final podium.

EXTERNAL SERVICES
- Google AdMob (ads and consent message).
- Supabase (supabase.com): question database, and server-side verification of rewarded videos (stores a random app-generated device identifier and the chosen theme for 7 days, to enforce the daily limit).
- Vercel (vercel.com): website, privacy policy, support and legal pages.

Best regards,
Maxence Japiot
