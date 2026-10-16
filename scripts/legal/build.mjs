import { writeFileSync } from 'node:fs'
import { CONTACT, page } from './layout.mjs'

const mail = `<a href="mailto:${CONTACT}">${CONTACT}</a>`

const confidentialite = page({
  title: 'Politique de confidentialité',
  description: 'Hors Norme ne collecte aucune donnée personnelle : pas de compte, pas de publicité, pas de pistage.',
  body: `
<div class="card"><strong>En résumé : Hors Norme ne collecte aucune donnée personnelle.</strong> Pas de compte, pas de publicité, pas de pistage, pas de revente de données. Tout ce que vous saisissez (noms d'équipes, réponses, scores) reste sur votre appareil.</div>

<h2>1. Qui est responsable ?</h2>
<p>L'application et le site Hors Norme sont édités par Maxence Japiot, particulier (voir les <a href="/mentions-legales">mentions légales</a>). Pour toute question sur vos données : ${mail}.</p>

<h2>2. Données enregistrées sur votre appareil</h2>
<p>Pour fonctionner, le jeu enregistre localement, <strong>uniquement sur votre téléphone ou votre navigateur</strong> :</p>
<ul>
  <li>les noms d'équipes ou de joueurs et les réglages de la dernière partie ;</li>
  <li>la partie en cours (pour la reprendre après une interruption) ;</li>
  <li>la liste des questions déjà jouées (pour éviter les répétitions) ;</li>
  <li>vos préférences (son activé ou non, tutoriel déjà vu, nombre de parties terminées).</li>
</ul>
<p>Ces informations ne sont jamais envoyées à nos serveurs. Vous pouvez les effacer à tout moment en supprimant l'application ou en effaçant les données du site dans votre navigateur.</p>

<h2>3. Téléchargement des questions</h2>
<p>Lorsque vous êtes connecté à Internet, l'application télécharge la liste des questions depuis notre base de données hébergée par Supabase. Cette requête ne contient <strong>aucune donnée vous concernant</strong> (ni nom, ni réponse, ni identifiant). Comme pour toute connexion à Internet, les hébergeurs techniques (Supabase pour la base de questions, Vercel pour le site) peuvent traiter temporairement l'adresse IP de votre appareil dans leurs journaux techniques, à des fins de sécurité et de bon fonctionnement. Nous n'utilisons pas ces informations.</p>

<h2>4. Mesure d'audience (site web uniquement)</h2>
<p>Le site web (version jouable dans le navigateur) utilise Vercel Web Analytics, un outil de mesure d'audience <strong>sans cookie</strong> qui produit uniquement des statistiques agrégées et anonymes (nombre de visites, pages vues, type d'appareil). Il ne permet pas de vous identifier ni de vous suivre d'un site à l'autre.</p>
<p><strong>Les applications iOS et Android n'utilisent aucun outil de mesure d'audience.</strong></p>

<h2>5. Fonctions du téléphone</h2>
<p>L'application peut utiliser les vibrations, maintenir l'écran allumé pendant une partie et ouvrir la feuille de partage de votre téléphone lorsque vous choisissez de partager vos résultats. Elle n'accède ni à vos contacts, ni à votre position, ni à vos photos, ni au micro ou à l'appareil photo. L'image de résultats est générée sur votre appareil et n'est partagée que si vous le décidez.</p>

<h2>6. Enfants</h2>
<p>Hors Norme convient à tous les âges et ne collecte aucune donnée, y compris pour les enfants.</p>

<h2>7. Vos droits</h2>
<p>Conformément au RGPD et à la loi Informatique et Libertés, vous disposez de droits d'accès, de rectification et d'effacement. Comme nous ne détenons aucune donnée personnelle vous concernant, ces droits s'exercent simplement en supprimant les données locales de l'application. Pour toute question : ${mail}. Vous pouvez aussi saisir la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).</p>

<h2>8. Évolutions</h2>
<p>Si le fonctionnement de l'application change (par exemple l'ajout d'achats intégrés), cette page sera mise à jour avant la publication de la nouvelle version.</p>
`,
})

const support = page({
  title: 'Aide & contact',
  description: "Questions fréquentes sur Hors Norme, le jeu des records, et contact de l'éditeur.",
  body: `
<div class="card"><strong>Une question, un bug, une réponse qui vous semble fausse ?</strong><br />Écrivez-nous à ${mail} — nous répondons en général sous quelques jours.</div>

<h2>Comment joue-t-on ?</h2>
<p>Une question sur un record s'affiche (« Quelle est l'altitude de l'Everest ? »). Chaque équipe tape un chiffre en secret, puis on se passe le téléphone. À la révélation, plus vous êtes proche, plus vous marquez : 3 points si c'est tout pile, 2 points à moins de 5 %, 1 point à moins de 20 %, et +1 pour l'équipe la plus proche. Le tutoriel complet est accessible depuis l'accueil (« Comment on joue ? ») et pendant la partie (icône « ? »).</p>

<h2>Faut-il une connexion Internet ?</h2>
<p>Non. Le jeu fonctionne hors connexion, avec les questions intégrées à l'application. Lorsqu'une connexion est disponible, il récupère automatiquement les nouvelles questions et les corrections.</p>

<h2>Combien de joueurs ?</h2>
<p>De 2 à 6 équipes, ou de 2 à 10 joueurs en « chacun pour soi », sur un seul téléphone.</p>

<h2>Je n'entends pas le son / le téléphone ne vibre pas</h2>
<p>Vérifiez l'icône de son en haut de l'écran pendant une partie, ainsi que le mode silencieux de votre téléphone (il coupe les sons du jeu). Les vibrations dépendent aussi des réglages de votre appareil.</p>

<h2>Une réponse me semble fausse</h2>
<p>Les records évoluent et nous vérifions régulièrement nos sources (Guinness World Records, encyclopédies, organismes officiels). Envoyez-nous le texte de la question et, si possible, votre source à ${mail} : nous corrigerons la base, et la correction arrivera automatiquement dans votre application.</p>

<h2>Mes données</h2>
<p>Hors Norme ne collecte aucune donnée personnelle. Détails dans la <a href="/confidentialite">politique de confidentialité</a>.</p>
`,
})

const mentions = page({
  title: 'Mentions légales',
  description: 'Éditeur, hébergement et crédits de Hors Norme, le jeu des records.',
  body: `
<h2>Éditeur</h2>
<p>Hors Norme est édité par <strong>Maxence Japiot</strong>, particulier, à titre non professionnel.<br />Contact : ${mail}</p>
<p>Directeur de la publication : Maxence Japiot.</p>

<h2>Hébergement</h2>
<table>
  <tr><th>Site web</th><td>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — <a href="https://vercel.com">vercel.com</a></td></tr>
  <tr><th>Base de questions</th><td>Supabase Inc. — <a href="https://supabase.com">supabase.com</a></td></tr>
  <tr><th>Applications</th><td>Distribuées via l'App Store (Apple) et Google Play (Google).</td></tr>
</table>

<h2>Propriété intellectuelle</h2>
<p>Le nom, le logo, les textes, les questions rédigées et l'interface de Hors Norme sont la propriété de l'éditeur. Les faits et records cités sont issus de sources publiques (notamment Guinness World Records, encyclopédies et organismes officiels), mentionnées dans le jeu lors de chaque révélation ; les marques citées appartiennent à leurs propriétaires respectifs.</p>

<h2>Crédits</h2>
<ul>
  <li>Icônes : <a href="https://phosphoricons.com">Phosphor Icons</a> (licence MIT).</li>
  <li>Police : Bricolage Grotesque (licence SIL Open Font License).</li>
  <li>Confettis : canvas-confetti (licence ISC).</li>
</ul>

<h2>Données personnelles</h2>
<p>Hors Norme ne collecte aucune donnée personnelle : voir la <a href="/confidentialite">politique de confidentialité</a>.</p>
`,
})

writeFileSync('public/confidentialite.html', confidentialite)
writeFileSync('public/support.html', support)
writeFileSync('public/mentions-legales.html', mentions)
console.log('pages légales générées dans public/')
