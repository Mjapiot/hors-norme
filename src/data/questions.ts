import type { NumberQuestion, Question, RankingQuestion, Theme } from '../game/types'

/*
 * Base de départ générée par IA — TOUTES les questions sont à relire
 * (verified_at = null). Lot 2 : migration vers Supabase + back-office.
 * Les records « perishable » doivent être revérifiés régulièrement.
 */

type Opts = { perishable?: boolean; difficulty?: 1 | 2 | 3; year?: boolean; verified?: string; subject?: string }

let counter = 0
const nextId = (theme: Theme) => `${theme}-${String(++counter).padStart(3, '0')}`

function n(theme: Theme, prompt: string, unit: string, answer: number, source: string, opts: Opts = {}): NumberQuestion {
  return {
    id: nextId(theme),
    type: 'number',
    theme,
    prompt,
    unit,
    answer,
    ...(opts.year ? { year: true } : {}),
    source,
    perishable: opts.perishable ?? false,
    difficulty: opts.difficulty ?? 2,
    verified_at: opts.verified ?? null,
    ...(opts.subject ? { subject: opts.subject } : {}),
  }
}

function r(
  theme: Theme,
  prompt: string,
  unit: string,
  items: [string, number][],
  source: string,
  opts: Opts = {},
): RankingQuestion {
  return {
    id: nextId(theme),
    type: 'ranking',
    theme,
    prompt,
    unit,
    items: items.map(([label, value]) => ({ label, value })),
    source,
    perishable: opts.perishable ?? false,
    difficulty: opts.difficulty ?? 2,
    verified_at: opts.verified ?? null,
    ...(opts.subject ? { subject: opts.subject } : {}),
  }
}

const P = { perishable: true }
/** Vérifié en ligne lors de la relecture du 2026-10-15. */
const V = { verified: '2026-10-15' }
const PV = { ...P, ...V }

export const QUESTIONS: Question[] = [
  // ───────── Corps humain ─────────
  n('corps', "Combien mesurait Robert Wadlow, l'homme le plus grand de l'histoire ?", 'cm', 272, 'Guinness World Records'),
  n('corps', "Combien mesure Sultan Kösen, l'homme vivant le plus grand du monde ?", 'cm', 251, 'Guinness World Records', P),
  n('corps', 'Combien mesure Rumeysa Gelgi, la femme vivante la plus grande du monde ?', 'cm', 215, 'Guinness World Records', P),
  n('corps', "Combien mesurait Chandra Bahadur Dangi, l'homme adulte le plus petit jamais authentifié ?", 'cm', 54.6, 'Guinness World Records', { difficulty: 3 }),
  n('corps', "Jusqu'à quel âge a vécu Jeanne Calment, la doyenne de l'humanité ?", 'ans', 122, 'Wikipédia : Jeanne Calment', { difficulty: 1 }),
  n('corps', "Jusqu'à quel âge a vécu Jiroemon Kimura, l'homme le plus âgé de l'histoire ?", 'ans', 116, 'Guinness World Records'),
  n('corps', "Quelle est la longueur de l'étrier, le plus petit os du corps humain ?", 'mm', 3, 'Wikipédia : Étrier (os)'),
  n('corps', "Quel était le poids estimé de Jon Brower Minnoch, l'homme le plus lourd jamais recensé ?", 'kg', 635, 'Guinness World Records', { difficulty: 3 }),
  n('corps', "Selon le Guinness, combien d'enfants a eus la mère la plus prolifique de l'histoire (Mme Vassilyev) ?", 'enfants', 69, 'Guinness World Records', { difficulty: 3 }),
  n('corps', 'Combien d’heures Randy Gardner est-il resté sans dormir, record scientifiquement documenté ?', 'heures', 264, 'Wikipédia : Randy Gardner'),
  n('corps', 'Pendant combien d’années Charles Osborne a-t-il eu le hoquet, le plus long jamais enregistré ?', 'ans', 68, 'Guinness World Records'),
  n('corps', "Pendant combien de jours Donna Griffiths a-t-elle éternué sans s'arrêter (record) ?", 'jours', 976, 'Guinness World Records', { difficulty: 3, ...V }),
  n('corps', 'Combien mesure le nez le plus long du monde (Mehmet Özyürek) ?', 'cm', 8.8, 'Guinness World Records', { difficulty: 3 }),
  n('corps', 'Combien mesure la langue la plus longue du monde (Nick Stoeberl) ?', 'cm', 10.1, 'Guinness World Records', { difficulty: 3 }),
  n('corps', "Combien d'os compte le squelette d'un adulte ?", 'os', 206, 'Anatomie humaine', { difficulty: 1 }),

  // ───────── Animaux ─────────
  n('animaux', "Combien pèse environ le colibri d'Hélène, le plus petit oiseau du monde ?", 'g', 2, "Wikipédia : Colibri d'Hélène"),
  n('animaux', 'Quelle longueur peut atteindre la baleine bleue, le plus grand animal du monde ?', 'm', 30, 'Wikipédia : Baleine bleue', { difficulty: 1 }),
  n('animaux', "Combien pèse le cœur d'une baleine bleue ?", 'kg', 180, 'Royal Ontario Museum (2014)', { difficulty: 3 }),
  n('animaux', "Combien pèse un éléphant d'Afrique mâle adulte, le plus gros animal terrestre ?", 'tonnes', 6, "Wikipédia : Éléphant de savane d'Afrique"),
  n('animaux', 'Quelle hauteur peut atteindre une girafe, l’animal terrestre le plus haut ?', 'm', 5.5, 'Wikipédia : Girafe', V),
  n('animaux', 'À quelle vitesse pique le faucon pèlerin, l’animal le plus rapide du monde ?', 'km/h', 389, 'Wikipédia : Faucon pèlerin'),
  n('animaux', 'Quelle vitesse de pointe atteint environ le guépard, l’animal terrestre le plus rapide ?', 'km/h', 110, 'Wikipédia : Guépard', { difficulty: 1, subject: 'Guépard' }),
  n('animaux', "Quelle hauteur peut atteindre l'autruche, le plus grand oiseau du monde ?", 'm', 2.7, 'Wikipédia : Autruche'),
  n('animaux', "Quelle est l'envergure maximale mesurée de l'albatros hurleur, la plus grande des oiseaux ?", 'm', 3.6, 'Wikipédia : Albatros hurleur', V),
  n('animaux', "Jusqu'à quel âge estime-t-on que peut vivre le requin du Groenland, le vertébré à la plus grande longévité ?", 'ans', 400, 'Science (2016)', { difficulty: 3, ...V }),
  n('animaux', 'En quelle année serait environ née Jonathan, la plus vieille tortue terrestre vivante ?', '', 1832, 'Guinness World Records', { perishable: true, year: true, ...V }),
  n('animaux', 'Combien mesure Medusa, le plus long serpent jamais gardé en captivité ?', 'm', 7.67, 'Guinness World Records', { difficulty: 3 }),
  n('animaux', 'Combien de pattes possède Eumillipes persephone, l’animal qui en a le plus ?', 'pattes', 1306, 'Scientific Reports (2021)', { difficulty: 3 }),
  n('animaux', 'Combien de décibels peut émettre le cachalot, l’animal le plus bruyant ?', 'dB', 230, 'Wikipédia : Cachalot', { difficulty: 3 }),
  n('animaux', 'Combien mesurait Zeus, le plus grand chien de tous les temps, au garrot ?', 'cm', 112, 'Guinness World Records'),
  n('animaux', "Jusqu'à quel âge a vécu Creme Puff, le chat le plus âgé de l'histoire ?", 'ans', 38, 'Guinness World Records'),
  n('animaux', 'Au moins combien de kilomètres parcourt chaque année la sterne arctique, la plus longue migration ?', 'km', 70000, 'Wikipédia : Sterne arctique', { difficulty: 3 }),
  n('animaux', 'Combien pèse la chauve-souris bourdon, l’un des plus petits mammifères du monde ?', 'g', 2, 'Wikipédia : Chauve-souris bourdon'),
  n('animaux', 'Quelle taille peut atteindre un manchot empereur, le plus grand des manchots ?', 'cm', 120, 'Wikipédia : Manchot empereur'),
  n('animaux', 'Combien mesure en moyenne un requin-baleine adulte, le plus grand poisson du monde ?', 'm', 12, 'Wikipédia : Requin-baleine'),

  // ───────── Géographie ─────────
  n('geo', "Quelle est l'altitude de l'Everest, la plus haute montagne du monde ?", 'm', 8849, 'Mesure Chine/Népal 2020', { difficulty: 1 }),
  n('geo', 'Quelle est la profondeur du Challenger Deep, le point le plus profond des océans (mesure Guinness 2020) ?', 'm', 10935, 'Guinness World Records', V),
  n('geo', 'Combien mesure le Nil, traditionnellement considéré comme le plus long fleuve du monde ?', 'km', 6650, 'Wikipédia : Nil', { subject: 'Nil' }),
  n('geo', 'Quelle est la superficie de la Russie, le plus grand pays du monde ?', 'millions de km²', 17.1, 'Wikipédia : Russie'),
  n('geo', 'Quelle est la superficie du Vatican, le plus petit pays du monde ?', 'hectares', 44, 'Wikipédia : Vatican'),
  n('geo', 'Quelle est la superficie du Sahara, le plus grand désert chaud du monde ?', 'millions de km²', 9, 'Wikipédia : Sahara', { subject: 'Sahara' }),
  n('geo', 'Quelle est la superficie de la mer Caspienne, la plus grande étendue d’eau fermée du monde ?', 'km²', 371000, 'Wikipédia : Mer Caspienne', { difficulty: 3 }),
  n('geo', 'Quelle est la profondeur du lac Baïkal, le lac le plus profond du monde ?', 'm', 1642, 'Wikipédia : Lac Baïkal', { subject: 'Baïkal' }),
  n('geo', 'Quelle est la hauteur du Salto Angel, la plus haute chute d’eau du monde ?', 'm', 979, 'Wikipédia : Salto Angel'),
  n('geo', "Quelle est la superficie de l'océan Arctique, le plus petit océan ?", 'millions de km²', 14, 'Wikipédia : Océan Arctique', { subject: 'Arctique' }),
  n('geo', "Quelle est la superficie de l'océan Pacifique, le plus grand océan ?", 'millions de km²', 165, 'Wikipédia : Océan Pacifique'),
  n('geo', 'Quelle est l’altitude du mont Blanc, le plus haut sommet des Alpes (relevé 2026) ?', 'm', 4807, 'Relevé 2026 (géomètres de Haute-Savoie)', { difficulty: 1, ...PV, subject: 'Mont Blanc' }),
  n('geo', "Combien d'habitants compte Jakarta, la ville la plus peuplée du monde selon l'ONU en 2025 ?", 'millions', 42, 'ONU World Urbanization Prospects 2025', PV),
  n('geo', "Combien d'habitants compte l'Inde, le pays le plus peuplé du monde, en 2026 ?", 'millions', 1475, 'ONU World Population Prospects 2024', PV),
  n('geo', 'Quelle est la superficie du Groenland, la plus grande île du monde ?', 'km²', 2166000, 'Wikipédia : Groenland', { difficulty: 3 }),
  n('geo', 'À combien de mètres sous le niveau de la mer se trouvait la mer Morte en 2025, le point le plus bas des terres émergées ?', 'm', 440, 'Wikipédia : Mer Morte', PV),
  n('geo', 'À quelle altitude se trouve La Paz, la capitale (siège du gouvernement) la plus haute du monde ?', 'm', 3640, 'Wikipédia : La Paz'),
  n('geo', "Quelle est l'altitude de l'Ojos del Salado, le plus haut volcan du monde ?", 'm', 6893, 'Wikipédia : Ojos del Salado', { difficulty: 3, ...V }),
  n('geo', 'Combien de fuseaux horaires compte la France, le pays qui en a le plus ?', 'fuseaux', 12, 'Wikipédia : Heure en France'),
  n('geo', 'Combien de kilomètres de long mesure le Chili, le pays le plus étiré du monde ?', 'km', 4300, 'Wikipédia : Chili'),
  n('geo', "Quelle est la superficie de la forêt amazonienne, la plus grande forêt tropicale ?", 'millions de km²', 5.5, 'Wikipédia : Forêt amazonienne'),
  n('geo', 'Quelle est la température la plus chaude officiellement homologuée sur Terre (Vallée de la Mort, 1913) ?', '°C', 56.7, 'Organisation météorologique mondiale'),
  n('geo', 'De combien de degrés sous zéro est la température la plus froide jamais mesurée (station Vostok) ?', '°C sous zéro', 89.2, 'Organisation météorologique mondiale'),
  n('geo', "À quelle altitude se trouve le lac Titicaca, le plus haut lac navigable du monde ?", 'm', 3812, 'Wikipédia : Lac Titicaca', { subject: 'Titicaca' }),
  n('geo', "Combien d'îles compte la Suède, le pays qui en a le plus ?", 'îles', 267570, 'Statistiska centralbyrån', { difficulty: 3 }),
  n('geo', 'Combien mesure le Mauna Kea de sa base sous-marine à son sommet, la plus haute montagne du monde mesurée ainsi ?', 'm', 10210, 'Wikipédia : Mauna Kea', { difficulty: 3 }),

  // ───────── Espace ─────────
  n('espace', 'Quelle est la distance moyenne entre la Terre et la Lune ?', 'km', 384400, 'NASA', { difficulty: 1 }),
  n('espace', 'Combien de Terres pourraient tenir dans Jupiter, la plus grande planète ?', 'Terres', 1321, 'NASA', { subject: 'Jupiter' }),
  n('espace', 'Quel est le diamètre de Mercure, la plus petite planète du Système solaire ?', 'km', 4879, 'NASA', { subject: 'Mercure' }),
  n('espace', 'Quelle est la température à la surface de Vénus, la planète la plus chaude ?', '°C', 464, 'NASA'),
  n('espace', "Quelle est la hauteur d'Olympus Mons, la plus haute montagne du Système solaire ?", 'km', 22, 'NASA'),
  n('espace', 'Combien de lunes connues comptait Saturne en 2026, la planète qui en a le plus ?', 'lunes', 293, 'NASA (août 2026)', PV),
  n('espace', 'Quelle est la distance moyenne entre la Terre et le Soleil ?', 'millions de km', 150, 'NASA', { difficulty: 1 }),
  n('espace', 'Combien de secondes met la lumière du Soleil pour arriver jusqu’à nous ?', 'secondes', 499, 'NASA'),
  n('espace', "À combien d'années-lumière se trouve Proxima du Centaure, l'étoile la plus proche du Soleil ?", 'années-lumière', 4.24, 'ESA'),
  n('espace', "Combien de jours a duré le plus long séjour continu dans l'espace (Valeri Poliakov) ?", 'jours', 437, 'Wikipédia : Valeri Poliakov'),
  n('espace', "Combien de jours cumulés Oleg Kononenko a-t-il passés dans l'espace, le record absolu ?", 'jours', 1111, 'Roscosmos (2024)', P),
  n('espace', 'Quelle est la vitesse de la lumière, la plus grande vitesse possible ?', 'km/s', 299792, 'BIPM'),
  n('espace', 'Combien de jours terrestres dure une rotation de Vénus, le jour le plus long du Système solaire ?', 'jours', 243, 'NASA', { difficulty: 3 }),
  n('espace', "Quel est l'âge de l'Univers ?", "milliards d'années", 13.8, 'Mission Planck (ESA)'),
  n('espace', 'Quel est le diamètre de Cérès, le plus gros objet de la ceinture d’astéroïdes ?', 'km', 940, 'NASA Dawn', { difficulty: 3 }),
  n('espace', 'Quelle est la température au cœur du Soleil ?', 'millions de °C', 15, 'NASA'),
  n('espace', "Combien d'humains ont marché sur la Lune ?", 'personnes', 12, 'NASA', { difficulty: 1 }),
  n('espace', "À quelle altitude orbite la Station spatiale internationale, le plus grand objet habité de l'espace ?", 'km', 400, 'NASA'),

  // ───────── Sport ─────────
  n('sport', 'Quel est le record du monde du 100 m (Usain Bolt, 2009) ?', 'secondes', 9.58, 'World Athletics', { difficulty: 1 }),
  n('sport', 'Quel est le record du monde du saut en hauteur (Javier Sotomayor) ?', 'm', 2.45, 'World Athletics'),
  n('sport', 'Quel est le record du monde du saut en longueur (Mike Powell) ?', 'm', 8.95, 'World Athletics', { subject: 'Saut en longueur' }),
  n('sport', 'Quel est le record du monde du lancer du poids (Ryan Crouser) ?', 'm', 23.56, 'World Athletics', { ...P, subject: 'Lancer du poids' }),
  n('sport', 'Combien de tournois du Grand Chelem a remportés Novak Djokovic, le record masculin ?', 'titres', 24, 'ATP', P),
  n('sport', 'Combien de médailles olympiques a remportées Michael Phelps, le sportif le plus médaillé ?', 'médailles', 28, 'CIO'),
  n('sport', 'Combien de Tours de France a gagnés au maximum un même coureur ?', 'victoires', 5, 'ASO', { difficulty: 1 }),
  n('sport', "Combien de Ballons d'or Lionel Messi, le recordman, avait-il remportés avant l'édition 2026 ?", 'Ballons d’or', 8, 'France Football', { ...P, subject: 'messi' }),
  n('sport', 'Combien de Coupes du monde a remportées le Brésil, la nation la plus titrée ?', 'titres', 5, 'FIFA', { difficulty: 1 }),
  n('sport', "Combien de minutes a duré le plus long match de l'histoire du tennis (Isner–Mahut, 2010) ?", 'minutes', 665, 'Wimbledon'),
  n('sport', 'Combien de points a marqués Wilt Chamberlain lors de son match record en NBA ?', 'points', 100, 'NBA'),
  n('sport', 'Combien a coûté le transfert de Neymar au PSG, le plus cher de l’histoire ?', 'millions €', 222, 'PSG (2017)', P),
  n('sport', 'Quelle vitesse a atteint le service le plus rapide jamais mesuré en match professionnel (Sam Groth, 2012) ?', 'km/h', 263, 'Challenger de Busan 2012 (non homologué par l’ATP)', V),
  n('sport', 'Combien de Grands Prix de F1 Lewis Hamilton, le recordman, avait-il remportés à l’automne 2026 ?', 'victoires', 106, 'FIA (2026)', PV),
  n('sport', "Quel âge avait Oscar Swahn, le plus vieux médaillé de l'histoire des Jeux olympiques ?", 'ans', 72, 'CIO', { difficulty: 3 }),

  // ───────── Constructions ─────────
  n('constructions', 'Quelle est la hauteur de la Burj Khalifa, le plus haut gratte-ciel du monde ?', 'm', 828, 'Emaar', { ...P, subject: 'Burj Khalifa' }),
  n('constructions', 'Quelle est la hauteur de la tour Eiffel (avec antennes) ?', 'm', 330, 'SETE', { difficulty: 1, subject: 'Tour Eiffel' }),
  n('constructions', 'Quelle est la longueur totale de la Grande Muraille de Chine, la plus longue construction humaine ?', 'km', 21196, 'Administration du patrimoine chinois (2012)', { difficulty: 3 }),
  n('constructions', 'Combien mesure le grand pont de Danyang–Kunshan, le plus long pont du monde ?', 'km', 164, 'Guinness World Records'),
  n('constructions', 'Combien mesure le tunnel de base du Saint-Gothard, le plus long tunnel ferroviaire ?', 'km', 57, 'AlpTransit Gotthard'),
  n('constructions', 'Combien mesure Icon of the Seas, l’un des plus grands paquebots du monde ?', 'm', 365, 'Royal Caribbean', P),
  n('constructions', "Combien de passagers peut transporter au maximum l'Airbus A380, le plus grand avion de ligne ?", 'passagers', 853, 'Airbus'),
  n('constructions', "Quelle est la hauteur de la Statue de l'Unité (Inde), la plus haute statue du monde ?", 'm', 182, 'Guinness World Records', P),
  n('constructions', 'Quelle était la hauteur d’origine de la pyramide de Khéops, la plus grande d’Égypte ?', 'm', 146, 'Wikipédia : Pyramide de Khéops'),
  n('constructions', 'Quelle est la hauteur du viaduc de Millau, le pont à la structure la plus haute du monde ?', 'm', 343, 'Compagnie Eiffage du Viaduc de Millau'),
  n('constructions', "Quelle est la superficie de l'aéroport international du roi Fahd, le plus grand aéroport du monde ?", 'km²', 776, 'Guinness World Records', { difficulty: 3 }),
  n('constructions', 'Quelle est la longueur du barrage des Trois-Gorges, la plus grande centrale électrique du monde ?', 'm', 2335, 'China Three Gorges Corporation', { difficulty: 3, ...V }),
  n('constructions', 'Quelle est la hauteur d’Ain Dubai, la plus grande grande roue du monde ?', 'm', 250, 'Guinness World Records', P),
  n('constructions', 'Quelle profondeur a atteint le forage de Kola, le trou le plus profond jamais creusé verticalement ?', 'm', 12262, 'Wikipédia : Forage sg3 de Kola', V),
  n('constructions', "Combien de marches compte l'escalier de la Niesenbahn (Suisse), le plus long escalier du monde ?", 'marches', 11674, 'Guinness World Records', { difficulty: 3 }),

  // ───────── Histoire ─────────
  n('histoire', 'Combien d’années a régné Louis XIV, le plus long règne vérifié d’un monarque d’un grand État souverain ?', 'ans', 72, 'Wikipédia : Louis XIV', { difficulty: 1, ...V }),
  n('histoire', 'Combien de minutes a duré la guerre anglo-zanzibarite, la plus courte guerre de l’histoire ?', 'minutes', 38, 'Wikipédia : Guerre anglo-zanzibarite'),
  n('histoire', 'Combien d’années a duré la guerre de Cent Ans ?', 'ans', 116, 'Wikipédia : Guerre de Cent Ans'),
  n('histoire', "Quelle était la superficie de l'Empire britannique à son apogée, le plus grand empire de l'histoire ?", 'millions de km²', 35.5, 'Wikipédia : Empire britannique', { difficulty: 3 }),
  n('histoire', "En quelle année a été fondée l'université Al Quaraouiyine, la plus ancienne université encore en activité ?", '', 859, 'UNESCO / Guinness World Records', { difficulty: 3, year: true }),
  n('histoire', 'Combien de jours a duré la présidence de William Harrison, la plus courte des États-Unis ?', 'jours', 31, 'Maison-Blanche'),
  n('histoire', 'Combien d’années a duré la construction de Notre-Dame de Paris ?', 'ans', 182, 'Wikipédia : Cathédrale Notre-Dame de Paris'),
  n('histoire', 'Combien mesurait le Titanic, le plus grand paquebot de son époque ?', 'm', 269, 'Wikipédia : Titanic'),
  n('histoire', "Combien d'épouses a eues Henri VIII, le roi d'Angleterre le plus marié ?", 'épouses', 6, 'Wikipédia : Henri VIII', { difficulty: 1 }),
  n('histoire', 'Combien de minutes aurait duré le « règne » de Louis XIX, le plus court de l’histoire de France ?', 'minutes', 20, 'Wikipédia : Louis-Antoine d’Artois'),
  n('histoire', "Combien d'années a régné Élisabeth II, le plus long règne de l'histoire britannique ?", 'ans', 70, 'Wikipédia : Élisabeth II'),
  n('histoire', 'En quelle année a été inaugurée la tour Eiffel, alors le plus haut monument du monde ?', '', 1889, 'SETE', { difficulty: 1, year: true, subject: 'Tour Eiffel' }),
  n('histoire', "Combien d'années a duré l'Empire byzantin, de la partition de l'Empire romain (395) à la chute de Constantinople (1453) ?", 'ans', 1058, 'Wikipédia : Empire byzantin', { difficulty: 3, ...V }),

  // ───────── Insolite ─────────
  n('insolite', 'Quelle était la superficie de la plus grande pizza sans gluten du monde (Rome, 2012) ?', 'm²', 1261, 'Guinness World Records', { difficulty: 3, ...V }),
  n('insolite', 'Combien de hot-dogs Joey Chestnut a-t-il avalés en 10 minutes, le record du monde ?', 'hot-dogs', 76, 'Major League Eating', P),
  n('insolite', 'Combien mesurait la plus longue moustache du monde (Ram Singh Chauhan) ?', 'm', 4.29, 'Guinness World Records'),
  n('insolite', "Combien de lettres compte « anticonstitutionnellement », longtemps considéré comme le plus long mot de la langue française ?", 'lettres', 25, 'Dictionnaire de l’Académie française', { difficulty: 1 }),
  n('insolite', 'Combien de langues parle-t-on en Papouasie-Nouvelle-Guinée, le pays qui en compte le plus ?', 'langues', 840, 'Ethnologue', { difficulty: 3 }),
  n('insolite', "À combien d'exemplaires a été diffusée la Bible, le livre le plus vendu de l'histoire ?", "milliards d'exemplaires", 5, 'Guinness World Records'),
  n('insolite', 'Combien de vues comptait « Baby Shark Dance », la vidéo la plus vue de YouTube, en 2026 ?', 'milliards', 17, 'YouTube / Guinness World Records', PV),
  n('insolite', 'Combien a été vendu « Salvator Mundi », le tableau le plus cher de l’histoire ?', 'millions $', 450, "Christie's (2017)"),
  n('insolite', 'Combien pesait le Cullinan, le plus gros diamant brut jamais découvert ?', 'carats', 3106, 'Wikipédia : Cullinan', { difficulty: 3 }),
  n('insolite', 'Combien pesait la citrouille de Travis Gienger, record du monde en 2023 ?', 'kg', 1247, 'Guinness World Records', V),
  n('insolite', 'Combien d’heures a duré le plus long baiser du monde (Thaïlande, 2013) ?', 'heures', 58, 'Guinness World Records', { difficulty: 3 }),
  n('insolite', 'Quel était le record du monde de résolution du Rubik’s Cube 3×3 en octobre 2026 ?', 'secondes', 2.51, 'World Cube Association (Xuanyi Geng, 2026)', PV),
  n('insolite', 'Combien mesurait le plus grand bonhomme de neige du monde (Olympia, Maine, 2008) ?', 'm', 37, 'Guinness World Records'),
  n('insolite', 'Combien de coups a duré la plus longue partie d’échecs de tournoi (Nikolić–Arsović, 1989) ?', 'coups', 269, 'FIDE / Chessgames'),
  n('insolite', "Quel âge a environ Mathusalem, le plus vieil arbre non cloné connu (pin de Bristlecone) ?", 'ans', 4858, 'Wikipédia : Mathusalem (arbre)', PV),
  n('insolite', "Quelle est la hauteur d'Hyperion, le plus grand arbre vivant du monde ?", 'm', 116, 'Wikipédia : Hyperion (arbre)', P),
  n('insolite', 'Combien de dominos ont été renversés lors du record du Domino Day 2009 ?', 'millions', 4.49, 'Guinness World Records', { difficulty: 3 }),

  // ───────── Classements express ─────────
  r('geo', 'Classe ces océans du plus petit au plus grand', 'millions de km²', [['Arctique', 14], ['Austral', 21.96], ['Indien', 70.56], ['Atlantique', 106.46]], 'Wikipédia'),
  r('espace', 'Classe ces planètes de la plus petite à la plus grande', 'km de diamètre', [['Mercure', 4879], ['Mars', 6779], ['Terre', 12742], ['Neptune', 49244]], 'NASA'),
  r('constructions', 'Classe ces monuments du plus petit au plus haut', 'm', [['Statue de la Liberté', 93], ['Big Ben', 96], ['Tour Eiffel', 330], ['Burj Khalifa', 828]], 'Sites officiels'),
  r('animaux', 'Classe ces animaux du plus léger au plus lourd', 'kg', [['Autruche', 130], ['Ours polaire', 450], ['Girafe', 1200], ['Hippopotame', 1500]], 'Wikipédia'),
  r('geo', 'Classe ces fleuves du plus court au plus long', 'km', [['Seine', 777], ['Loire', 1006], ['Danube', 2850], ['Nil', 6650]], 'Wikipédia'),
  r('geo', 'Classe ces pays du plus petit au plus grand', 'km²', [['Italie', 302073], ['Allemagne', 357592], ['Espagne', 505990], ['France métropolitaine', 551695]], 'Wikipédia'),
  r('geo', 'Classe ces pays du moins peuplé au plus peuplé (2026)', "millions d'hab.", [['Canada', 41], ['Espagne', 49], ['France', 69], ['Allemagne', 84]], 'Insee / Eurostat / StatCan', PV),
  r('geo', 'Classe ces sommets du plus bas au plus haut', 'm', [['Mont Blanc', 4807], ['Kilimandjaro', 5895], ['Aconcagua', 6961], ['K2', 8611]], 'Wikipédia'),
  r('animaux', 'Classe du plus lent au plus rapide (vitesse de pointe)', 'km/h', [['Usain Bolt', 44.7], ['Chat domestique', 48], ['Lévrier', 70], ['Guépard', 110]], 'Wikipédia'),
  r('histoire', 'Classe ces inventions de la plus ancienne à la plus récente', '', [['Imprimerie (Gutenberg)', 1450], ['Téléphone', 1876], ['Avion (Wright)', 1903], ['Internet (ARPANET)', 1969]], 'Wikipédia'),
  r('geo', 'Classe ces lacs du moins profond au plus profond', 'm', [['Titicaca', 281], ['Léman', 310], ['Tanganyika', 1470], ['Baïkal', 1642]], 'Wikipédia', { difficulty: 3 }),
  r('geo', 'Classe ces déserts du plus petit au plus grand', 'km²', [['Kalahari', 900000], ['Gobi', 1295000], ["Désert d'Arabie", 2330000], ['Sahara', 9200000]], 'Wikipédia'),
  r('constructions', 'Classe ces tours de la plus petite à la plus haute', 'm', [['One World Trade Center', 541], ['Shanghai Tower', 632], ['Tokyo Skytree', 634], ['Burj Khalifa', 828]], 'CTBUH', { difficulty: 3 }),
  r('animaux', 'Classe ces animaux de la plus courte à la plus longue espérance de vie', 'ans', [['Hamster', 2.5], ['Chat', 15], ['Éléphant', 65], ['Tortue géante', 150]], 'Wikipédia'),
  r('espace', 'Classe ces planètes de celle qui a le moins de lunes à celle qui en a le plus (2026)', 'lunes', [['Mars', 2], ['Neptune', 16], ['Uranus', 29], ['Jupiter', 101]], 'NASA / IAU Minor Planet Center (2026)', PV),
  r('sport', 'Classe ces balles de la plus petite à la plus grande', 'cm de diamètre', [['Balle de golf', 4.27], ['Balle de tennis', 6.7], ['Boule de pétanque', 7.5], ['Ballon de basket', 24]], 'Règlements officiels'),
  r('histoire', 'Classe ces événements du plus ancien au plus récent', '', [['Prise de la Bastille', 1789], ['Bataille de Waterloo', 1815], ['Commune de Paris', 1871], ['Première Guerre mondiale', 1914]], 'Wikipédia', { difficulty: 1 }),
  r('sport', 'Classe ces records du monde du plus court au plus long', 'm', [['Saut en longueur', 8.95], ['Triple saut', 18.29], ['Lancer du poids', 23.56], ['Lancer du disque', 75.56]], 'World Athletics', PV),

  // ═════════ Lot 2 : 100 questions vérifiées en ligne le 2026-10-15 (URL en commentaire) ═════════
  // ───────── Corps humain (nouveau lot) ─────────
  n('corps', 'Combien mesurait Zeng Jinlian, la femme la plus grande de tous les temps ?', 'cm', 246.3, 'Guinness World Records', { ...V, difficulty: 1, subject: 'zeng-jinlian' }), // https://guinnessworldrecords.com/world-records/tallest-woman
  n('corps', 'Combien mesure Jyoti Amge, la plus petite femme vivante du monde (mesure de 2011) ?', 'cm', 62.8, 'Guinness World Records', { ...V, perishable: true, difficulty: 2, subject: 'jyoti-amge' }), // https://www.guinnessworldrecords.com/world-records/730291-shortest-woman-living
  n('corps', 'Combien mesuraient les cheveux de Xie Qiuping, les plus longs du monde (mesure de 2004) ?', 'm', 5.627, 'Guinness World Records', { ...V, difficulty: 1, subject: 'cheveux' }), // https://www.guinnessworldrecords.com/world-records/longest-hair-female
  n('corps', 'Combien mesurait la barbe de Hans Langseth, la plus longue de tous les temps ?', 'm', 5.33, 'Guinness World Records', { ...V, difficulty: 2, subject: 'barbe' }), // https://guinnessworldrecords.com/world-records/longest-beard-male
  n('corps', 'Quelle longueur totale atteignaient les ongles de Lee Redmond en 2008, les plus longs jamais mesurés chez une femme ?', 'm', 8.65, 'Guinness World Records', { ...V, difficulty: 2, subject: 'ongles' }), // https://www.guinnessworldrecords.com/records/hall-of-fame/lee-redmond-longest-fingernails-on-a-pair-of-hands
  n('corps', 'Combien mesure le pied droit de Jeison Rodríguez, le plus grand pied d’un homme vivant (mesure de 2018) ?', 'cm', 40.55, 'Guinness World Records', { ...V, perishable: true, difficulty: 1, subject: 'pieds' }), // https://www.guinnessworldrecords.com/world-records/largest-feet-on-a-living-person-male
  n('corps', 'Combien de jours Angus Barbieri a-t-il tenu sans manger, le plus long jeûne jamais documenté (1965-1966) ?', 'jours', 382, 'Guinness World Records / Wikipédia', { ...V, difficulty: 2, subject: 'jeune' }), // https://en.wikipedia.org/wiki/Angus_Barbieri%27s_fast
  n('corps', 'À quelle température corporelle est descendue Anna Bågenholm, la plus basse jamais survécue après une hypothermie accidentelle ?', '°C', 13.7, 'Wikipédia : Anna Bågenholm', { ...V, difficulty: 2, subject: 'hypothermie' }), // https://en.wikipedia.org/wiki/Anna_B%C3%A5genholm
  n('corps', 'Combien pesait à la naissance le bébé le plus lourd né d’une mère en bonne santé (Italie, 1955) ?', 'kg', 10.2, 'Guinness World Records', { ...V, difficulty: 1, subject: 'bebe-lourd' }), // https://www.guinnessworldrecords.jp/world-records/longest-baby
  n('corps', 'Combien de minutes a duré la plus longue apnée sous l’eau jamais homologuée (Vitomir Maričić, avec oxygène pur, 2025) ?', 'minutes', 29, 'Guinness World Records', { ...V, perishable: true, difficulty: 2, subject: 'apnee' }), // https://www.guinnessworldrecords.com/world-records/longest-time-breath-held-voluntarily-male
  n('corps', 'Combien de décibels a atteint le cri de Jill Drake, le cri humain le plus puissant jamais mesuré ?', 'dB', 129, 'Guinness World Records', { ...V, difficulty: 2, subject: 'cri' }), // https://www.guinnessworldrecords.com/world-records/67537-loudest-scream-individual
  n('corps', 'Combien pèse environ le foie d’un adulte, le plus volumineux des organes internes ?', 'kg', 1.5, 'Kenhub / AlloDocteurs', { ...V, difficulty: 1, subject: 'foie' }), // https://www.allodocteurs.fr/est-ce-que-le-foie-repousse-43585.html
  n('corps', 'Combien mesure environ le fémur d’un homme de 1,80 m, l’os le plus long du corps humain ?', 'cm', 50, 'Guinness World Records', { ...V, difficulty: 1, subject: 'femur' }), // https://www.guinnessworldrecords.es/world-records/67745-longest-bone
  r('corps', 'Classe ces organes du plus léger au plus lourd (adulte)', 'g', [['Thyroïde', 30], ['Rein', 150], ['Cœur', 300], ['Cerveau', 1300]], 'Taber’s Medical Dictionary / Abrikosov', { ...V, difficulty: 1, subject: 'organes-poids' }), // https://www.tabers.com/tabersonline/view/Tabers-Dictionary/751215/0/organ
  r('corps', 'Classe ces pays de la plus petite à la plus grande taille moyenne des hommes (nés en 1996)', 'cm', [['Timor oriental', 159.8], ['Inde', 164.9], ['Japon', 170.8], ['Pays-Bas', 182.5]], 'NCD-RisC via Our World in Data', { ...V, difficulty: 1, subject: 'taille-pays' }), // https://ourworldindata.org/grapher/average-height-of-men?tab=table
  r('corps', 'Classe ces pays de la plus faible à la plus forte espérance de vie à la naissance (2023)', 'ans', [['Nigeria', 54.5], ['Inde', 72], ['États-Unis', 78.4], ['Japon', 84]], 'Banque mondiale (2023)', { ...V, perishable: true, difficulty: 2, subject: 'esperance-vie' }), // https://www.populationpyramid.net/life-expectancy-by-country/

  // ───────── Histoire (nouveau lot) ─────────
  n('histoire', 'Combien de jours a duré le siège de Leningrad, l’un des plus longs et des plus meurtriers de l’histoire ?', 'jours', 872, 'Britannica', { ...V, difficulty: 1, subject: 'leningrad' }), // https://www.britannica.com:443/print/article/335949
  n('histoire', 'Selon le Guinness, quelle superficie couvrait l’Empire mongol à son apogée, le plus grand empire d’un seul tenant de l’histoire ?', 'millions de km²', 24, 'Guinness World Records', { ...V, difficulty: 2, subject: 'empire-mongol' }), // https://www.guinnessworldrecords.com/world-records/86621-largest-empire-contiguous
  n('histoire', 'Combien d’années a duré le pontificat de Pie IX, le plus long de l’histoire (hors saint Pierre) ?', 'ans', 31, 'Catholic News Agency', { ...V, difficulty: 2, subject: 'pie-ix' }), // https://www.catholicnewsagency.com/news/256758/the-remarkable-life-and-papacy-of-blessed-pope-pius-ix
  n('histoire', 'Combien de jours a duré le pontificat d’Urbain VII (1590), le plus court de l’histoire ?', 'jours', 13, 'EWTN / Aleteia', { ...V, difficulty: 2, subject: 'urbain-vii' }), // https://www.ewtnnews.com/vatican/the-shortest-papacies-of-all-time-pope-john-paul-i-barely-makes-the-list
  n('histoire', 'Combien de minutes a duré le discours de Fidel Castro en 1960, le plus long de l’histoire de l’Assemblée générale de l’ONU ?', 'minutes', 269, 'ONU', { ...V, difficulty: 1, subject: 'castro' }), // https://ask.un.org/faq/37127
  n('histoire', 'En quelle année a été rédigée la Constitution des États-Unis, la plus ancienne constitution nationale écrite encore en vigueur ?', '', 1787, 'Britannica / Wikisource', { ...V, year: true, difficulty: 2, subject: 'constitution-usa' }), // https://en.wikisource.org/wiki/Constitution_of_the_United_States_of_America
  n('histoire', 'En quelle année aurait été fondée Kongō Gumi, la plus vieille entreprise du monde (selon la tradition) ?', '', 578, 'Wikipédia : Kongō Gumi', { ...V, year: true, difficulty: 3, subject: 'kongo-gumi' }), // https://en.wikipedia.org/wiki/Kong%C5%8D_Gumi
  n('histoire', 'En quelle année a ouvert Sobrino de Botín (Madrid), le plus vieux restaurant du monde selon le Guinness ?', '', 1725, 'Guinness World Records', { ...V, year: true, difficulty: 2, subject: 'botin' }), // https://www.theculturetrip.com/europe/spain/articles/madrids-sobrino-de-botin-is-the-oldest-restaurant-in-the-world
  n('histoire', 'En quelle année est paru le premier numéro du Figaro, le plus ancien quotidien national français encore publié ?', '', 1826, 'Le Figaro (bicentenaire 2026)', { ...V, year: true, difficulty: 2, subject: 'figaro' }), // https://fr.themedialeader.com/ne-en-1826-le-figaro-fete-ses-200-ans-au-grand-palais/
  n('histoire', 'En quelle année a été inaugurée la première ligne du métro de Londres, le plus ancien métro du monde ?', '', 1863, 'Wikipédia : History of the London Underground', { ...V, year: true, difficulty: 1, subject: 'metro-londres' }), // https://en.wikipedia.org/wiki/History_of_the_London_Underground
  n('histoire', 'En quelle année situe-t-on traditionnellement la fondation de l’université de Bologne, la plus ancienne université d’Europe encore en activité ?', '', 1088, 'Wikipédia : Université de Bologne', { ...V, year: true, difficulty: 2, subject: 'bologne' }), // https://en.wikipedia.org/wiki/University_of_Bologna
  n('histoire', 'Combien d’années a régné la reine Victoria, longtemps le plus long règne de l’histoire britannique ?', 'ans', 63, 'History of Royal Women', { ...V, difficulty: 1, subject: 'victoria' }), // https://www.historyofroyalwomen.com/victoria-united-kingdom/the-year-of-queen-victoria-becoming-the-longest-reigning-monarch-until-queen-elizabeth-ii
  n('histoire', 'Combien d’années a régné Sobhuza II du Swaziland, le plus long règne vérifiable de tous les monarques (régence comprise) ?', 'ans', 82, 'Wikipédia : Sobhuza II', { ...V, difficulty: 3, subject: 'sobhuza-ii' }), // https://en.wikipedia.org/wiki/Sobhuza_II
  n('histoire', 'Combien d’années a duré la dynastie Zhou, la plus longue de l’histoire de la Chine ?', 'ans', 790, 'World History Encyclopedia', { ...V, difficulty: 3, subject: 'dynastie-zhou' }), // https://www.worldhistory.org/trans/fr/1-12403/dynastie-zhou/
  r('histoire', 'Classe ces monuments du plus ancien au plus récent', '', [['Stonehenge (cercle de pierres)', -2500], ['Parthénon', -438], ['Colisée', 80], ['Taj Mahal', 1648]], 'English Heritage / World History / Wikipédia', { ...V, difficulty: 1, subject: 'monuments-dates' }), // https://english-heritage.org.uk/visit/places/stonehenge/things-to-do/stone-circle/stones-of-stonehenge
  r('histoire', 'Classe ces présidents de la Ve République du plus jeune au plus âgé lors de leur première élection', 'ans', [['Emmanuel Macron', 39], ['Valéry Giscard d’Estaing', 48], ['Nicolas Sarkozy', 52], ['Charles de Gaulle', 68]], 'Wikipédia : Liste des présidents de la République française', { ...V, difficulty: 1, subject: 'presidents-age' }), // https://fr.wikipedia.org/wiki/Liste_des_pr%C3%A9sidents_de_la_R%C3%A9publique_fran%C3%A7aise
  r('histoire', 'Classe ces guerres de la plus courte à la plus longue', 'mois', [['Guerre des Six Jours (1967)', 0.2], ['Guerre franco-prussienne (1870-1871)', 6.3], ['Première Guerre mondiale', 51.5], ['Guerre de Trente Ans', 365]], 'Universalis / Hérodote / Larousse', { ...V, difficulty: 1, subject: 'guerres-duree' }), // https://www.universalis.fr/encyclopedie/guerre-de-trente-ans/

  // ───────── Espace (nouveau lot) ─────────
  n('espace', 'À quelle distance de la Terre Voyager 1, l’objet humain le plus lointain, franchit-elle le cap d’un jour-lumière le 18 novembre 2026 ?', 'milliards de km', 25.9, 'NASA (2026)', { ...V, difficulty: 2, subject: 'voyager-1' }), // https://earthsky.org/space/voyager-1-1-light-day-from-earth-november-17-18-2026/
  n('espace', 'Quelle vitesse a atteint Parker Solar Probe, l’objet le plus rapide jamais construit par l’homme (record en 2026) ?', 'milliers de km/h', 692, 'Guinness World Records / NASA (déc. 2024)', { ...PV, difficulty: 2, subject: 'parker-solar-probe' }), // https://www.guinnessworldrecords.com/world-records/66135-fastest-spacecraft-speed
  n('espace', 'Quel est le diamètre de Ganymède, la plus grande lune du Système solaire ?', 'km', 5268, 'NASA', { ...V, difficulty: 2, subject: 'ganymede' }), // https://science.nasa.gov/resource/ganymede-new-horizons/
  n('espace', 'Quel est le diamètre de Pluton, la plus grande planète naine du Système solaire ?', 'km', 2377, 'Guinness World Records / New Horizons', { ...V, difficulty: 2, subject: 'pluton' }), // https://www.guinnessworldrecords.com/world-records/84699-largest-dwarf-planet
  n('espace', 'Combien de jours cumulés Peggy Whitson, l’astronaute américaine et la femme ayant passé le plus de temps dans l’espace, y avait-elle passés en 2026 ?', 'jours', 695, 'Axiom Space (après Ax-4, 2025)', { ...PV, difficulty: 2, subject: 'peggy-whitson' }), // https://axiomspace.com/team/peggy-whitson
  n('espace', 'Combien pèse la météorite de Hoba (Namibie), la plus grosse météorite connue ?', 'tonnes', 60, 'Guinness World Records', { ...V, difficulty: 1, subject: 'hoba' }), // https://www.guinnessworldrecords.com/world-records/largest-meteorite
  n('espace', 'Combien de minutes a duré la plus longue sortie extravéhiculaire de l’histoire (Shenzhou-19, record en 2026) ?', 'minutes', 546, 'Agence spatiale habitée chinoise (17 déc. 2024)', { ...PV, difficulty: 3, subject: 'sortie-extravehiculaire' }), // https://en.wikipedia.org/wiki/List_of_longest_spacewalks
  n('espace', 'À quelle distance se trouve la galaxie d’Andromède, l’objet le plus lointain facilement visible à l’œil nu ?', 'millions d’années-lumière', 2.5, 'NASA (APOD) / Guinness World Records', { ...V, difficulty: 1, subject: 'andromede' }), // https://www.guinnessworldrecords.com/world-records/most-remote-object-visible-by-the-naked-eye
  n('espace', 'Combien de minutes a duré le vol de Youri Gagarine, le tout premier vol habité dans l’espace (1961) ?', 'minutes', 108, 'Wikipédia : Vostok 1', { ...V, difficulty: 1, subject: 'gagarine' }), // https://en.wikipedia.org/wiki/Vostok_1
  n('espace', 'En 2026, à quelle distance maximale de la Terre se sont trouvés les astronautes d’Artemis II, les humains allés le plus loin de l’histoire ?', 'milliers de km', 407, 'NASA (6 avril 2026)', { ...PV, difficulty: 2, subject: 'artemis-2' }), // https://www.thenewdaily.com.au/news/2026/04/07/artemis-breaks-distance-record
  n('espace', 'En quelle année a été lancé Spoutnik 1, le tout premier satellite artificiel ?', '', 1957, 'Wikipédia : Spoutnik 1', { ...V, difficulty: 1, year: true, subject: 'spoutnik' }), // https://www.astronomy.com/today-in-the-history-of-astronomy/oct-4th-1957-sputnik-launches
  r('espace', 'Classe ces fusées de la plus petite à la plus haute (2026)', 'm', [['Soyouz-2', 46.3], ['Falcon 9', 70], ['Saturn V', 110.6], ['Starship V3', 124.4]], 'Wikipédia / SpaceX (2026)', { ...PV, difficulty: 1, subject: 'fusees' }), // https://space.com/space-exploration/launches-spacecraft/spacex-fuels-up-starship-v3-megarocket-for-1st-time-ahead-of-crucial-test-flight-photos (+ https://en.wikipedia.org/wiki/Saturn_V, https://en.wikipedia.org/wiki/Falcon_9, https://en.wikipedia.org/wiki/Soyuz-2)

  // ───────── Constructions (nouveau lot) ─────────
  n('constructions', 'Combien mesure le pont Hong Kong–Zhuhai–Macao, la plus longue traversée maritime du monde (tunnel compris) ?', 'km', 55, 'Wikipédia : Pont Hong Kong-Zhuhai-Macao', { ...V, difficulty: 2, subject: 'pont-hong-kong-macao' }), // https://en.wikipedia.org/wiki/Hong_Kong%E2%80%93Zhuhai%E2%80%93Macau_Bridge
  n('constructions', 'En 2026, à quelle hauteur au-dessus de la rivière passe le tablier du pont du Grand Canyon de Huajiang (Chine), le pont le plus haut du monde ?', 'm', 625, 'Inauguration (28 sept. 2025)', { ...PV, difficulty: 2, subject: 'pont-huajiang' }), // https://www.smithsonianmag.com/smart-news/the-highest-bridge-in-the-world-just-opened-in-china-at-more-than-2000-feet-above-the-ground-180987429/
  n('constructions', 'Combien mesure le tunnel de Lærdal (Norvège), le plus long tunnel routier du monde en 2026 ?', 'km', 24.5, 'Statens vegvesen', { ...PV, difficulty: 2, subject: 'tunnel-laerdal' }), // https://www.vegvesen.no/en/road-projects/project/e16lardalstunnelen/
  n('constructions', 'Combien de places compte le Narendra Modi Stadium (Inde), le plus grand stade du monde en 2026 ?', 'milliers de places', 132, 'ICC', { ...PV, difficulty: 2, subject: 'narendra-modi-stadium' }), // https://en.wikipedia.org/wiki/Narendra_Modi_Stadium
  n('constructions', 'Quelle hauteur a atteinte la Sagrada Família en 2026, devenue l’église la plus haute du monde ?', 'm', 172.5, 'Basilique de la Sagrada Família (fév. 2026)', { ...PV, difficulty: 2, subject: 'sagrada-familia' }), // https://www.catalannews.com/society-science/item/sagrada-familia-reaches-1725-metres
  n('constructions', 'Quelle est la hauteur du dôme de Saint-Pierre de Rome (croix comprise), le plus haut dôme du monde ?', 'm', 136.6, 'CIA World Factbook', { ...V, difficulty: 2, subject: 'saint-pierre-rome' }), // https://www.cia.gov/the-world-factbook/countries/holy-see-vatican-city/images
  n('constructions', 'Combien mesure le Grand Canal de Chine (Pékin–Hangzhou), le plus long canal artificiel du monde ?', 'km', 1794, 'UNESCO / Wikipédia (1 776 à 1 797 km selon les sources)', { ...V, difficulty: 2, subject: 'grand-canal-chine' }), // https://en.wikipedia.org/wiki/Grand_Canal_(China)
  n('constructions', 'Quelle est la hauteur de la flèche de la cathédrale de Rouen, la plus haute de France ?', 'm', 151, 'Ministère de la Culture (DRAC Normandie)', { ...V, difficulty: 1, subject: 'cathedrale-rouen' }), // https://www.culture.gouv.fr/regions/drac-normandie/Dossiers/ressources/Travaux-de-refection-de-la-fleche-de-la-cathedrale-de-Rouen2
  n('constructions', 'En quelle année a été achevé le Pont-Neuf, le plus ancien pont de Paris encore debout ?', '', 1607, 'Structurae / Paris ZigZag', { ...V, difficulty: 1, year: true, subject: 'pont-neuf' }), // https://www.pariszigzag.fr/insolite/histoire-insolite-paris/pont-neuf-vieux-paris/
  n('constructions', 'Quelle est la hauteur du pont du Gard, le plus haut pont-aqueduc romain connu ?', 'm', 48.8, 'Structurae / UNESCO', { ...V, difficulty: 1, subject: 'pont-du-gard' }), // https://structurae.net/fr/ouvrages/pont-du-gard
  n('constructions', 'En quelle année a été inauguré le tunnel sous la Manche, qui possède la plus longue section sous-marine du monde ?', '', 1994, 'Wikipédia : Tunnel sous la Manche', { ...V, difficulty: 1, year: true, subject: 'tunnel-manche' }), // https://en.wikipedia.org/wiki/Channel_Tunnel
  n('constructions', 'Combien de pièces compte le château de Chambord, le plus vaste des châteaux de la Loire ?', 'pièces', 426, 'France.fr', { ...V, difficulty: 2, subject: 'chambord' }), // https://www.france.fr/fr/article/9-choses-a-savoir-sur-le-chateau-de-chambord/
  r('constructions', 'Classe ces gratte-ciel du plus petit au plus haut (hauteur architecturale)', 'm', [['Empire State Building', 381], ['Tours Petronas', 451.9], ['Taipei 101', 508], ['Merdeka 118', 678.9]], 'CTBUH', { ...V, difficulty: 1, subject: 'gratte-ciel' }), // https://skyscrapercenter.info/building/merdeka-118/10115 (+ https://en.wikipedia.org/wiki/List_of_tallest_buildings_by_city)
  r('constructions', 'Classe ces ponts de la plus courte à la plus longue travée principale', 'm', [['Pont de Brooklyn', 486], ['Pont de Normandie', 856], ['Golden Gate Bridge', 1280], ['Pont du détroit d’Akashi', 1991]], 'Structurae / Wikipédia', { ...V, difficulty: 1, subject: 'ponts-portee' }), // https://en.wikipedia.org/wiki/List_of_longest_suspension_bridge_spans (+ https://structurae.net/fr/ouvrages/pont-de-normandie)

  // ───────── Animaux (nouveau lot) ─────────
  n('animaux', 'Combien pesait le plus gros calmar colossal jamais capturé, le plus lourd des invertébrés ?', 'kg', 495, 'Te Papa / Guinness World Records (2007)', { ...V, difficulty: 2, subject: 'calmar-colossal' }), // https://en.wikipedia.org/wiki/Colossal_squid
  n('animaux', 'Combien mesurait Lolong, le plus grand crocodile jamais gardé en captivité ?', 'm', 6.17, 'Guinness World Records', { ...V, difficulty: 1, subject: 'crocodile-lolong' }), // https://en.wikipedia.org/wiki/Lolong
  n('animaux', 'Quel âge avait la plus vieille baleine boréale étudiée, le mammifère à la plus grande longévité ?', 'ans', 211, 'Guinness World Records (étude de 1999)', { ...V, difficulty: 2, subject: 'baleine-boreale' }), // https://www.guinnessworldrecords.com/world-records/465873-oldest-mammal
  n('animaux', 'Combien de kilomètres a parcourus sans escale une barge rousse en 2022, le plus long vol sans escale d’un oiseau (record en 2026) ?', 'km', 13560, 'Guinness World Records', { ...PV, difficulty: 2, subject: 'barge-rousse' }), // https://earthsky.org/earth/longest-nonstop-bird-flight-world-record-bar-tailed-godwit-2022/
  n('animaux', 'Combien pesait le poisson-lune trouvé aux Açores en 2021, le plus lourd poisson osseux jamais mesuré ?', 'kg', 2744, 'Guinness World Records / Journal of Fish Biology', { ...V, difficulty: 3, subject: 'poisson-lune' }), // https://www.guinnessworldrecords.com/world-records/heaviest-bony-fish
  n('animaux', 'Quelle était la longueur des tentacules de la plus grande méduse à crinière de lion jamais observée, la plus grande des méduses ?', 'm', 36.5, 'Wikipédia : Cyanea capillata (spécimen de 1870)', { ...V, difficulty: 2, subject: 'meduse-criniere' }), // https://untamedscience.com/biodiversity/lions-mane-jellyfish/
  n('animaux', 'Combien de minutes a duré la plus longue plongée jamais enregistrée chez un mammifère (baleine à bec de Cuvier) ?', 'minutes', 222, 'Guinness World Records / J. Exp. Biol. (2020)', { ...V, difficulty: 2, subject: 'baleine-cuvier' }), // https://www.guinnessworldrecords.com/world-records/341455-longest-dive-by-a-mammal
  n('animaux', 'Jusqu’à combien d’heures par jour peut dormir le koala, l’un des plus grands dormeurs du règne animal ?', 'heures', 22, 'Australian Koala Foundation', { ...V, difficulty: 1, subject: 'koala' }), // https://www.discoverwildlife.com/wildlife/mammals/which-animal-sleeps-the-most
  n('animaux', 'Quelle vitesse a atteint Winning Brew, le cheval de course le plus rapide jamais chronométré ?', 'km/h', 70.76, 'Guinness World Records (2008)', { ...V, difficulty: 1, subject: 'winning-brew' }), // https://www.guinnessworldrecords.com/world-records/fastest-speed-for-a-race-horse
  r('animaux', 'Classe ces femelles de la gestation la plus courte à la plus longue', 'jours', [['Lapine', 31], ['Brebis', 150], ['Vache', 280], ['Ânesse', 365]], 'Techno-Science : Gestation', { ...V, difficulty: 1, subject: 'gestation' }), // https://www.techno-science.net/fr/definitions/gestation

  // ───────── Sport (nouveaux) ─────────
  n('sport', 'Quel est le record du monde du lancer du javelot, détenu par Jan Železný depuis 1996 ?', 'm', 98.48, 'World Athletics / Guinness World Records', { ...V, difficulty: 2, subject: 'javelot' }), // https://www.guinnessworldrecords.com/news/2024/8/why-jan-zeleznys-javelin-world-record-remains-unbroken-nearly-30-years-on
  n('sport', 'Quelle distance a parcourue Filippo Ganna en une heure, le record de l’heure cycliste toujours valable en 2026 ?', 'km', 56.792, 'UCI (Granges, 2022)', { ...V, perishable: true, difficulty: 2, subject: 'record-heure' }), // https://en.wikipedia.org/wiki/List_of_world_records_in_track_cycling
  n('sport', 'Quelle vitesse a atteint le Français Simon Billy, record du monde de ski de vitesse en 2026 ?', 'km/h', 255.5, 'FIS / Vars (2023)', { ...V, perishable: true, difficulty: 2, subject: 'ski-vitesse' }), // https://en.wikipedia.org/wiki/Speed_skiing_world_records
  n('sport', 'Quelle hauteur a franchie Huaso en 1949, le plus haut saut d’obstacle jamais réalisé par un cheval ?', 'm', 2.47, 'Guinness World Records / FEI', { ...V, difficulty: 1, subject: 'saut-cheval' }), // https://www.guinnessworldrecords.com/world-records/highest-jump-by-a-horse
  n('sport', 'Combien de buts l’Australie a-t-elle marqués contre les Samoa américaines en 2001, la plus large victoire de l’histoire du football international ?', 'buts', 31, 'FIFA (qualifications Mondial 2002)', { ...V, difficulty: 1, subject: 'australie-samoa' }), // https://en.wikipedia.org/wiki/Australia_31%E2%80%930_American_Samoa
  n('sport', 'Combien de points les All Blacks ont-ils marqués contre le Japon en 1995, le plus gros total d’une équipe en Coupe du monde de rugby ?', 'points', 145, 'Guinness World Records', { ...V, difficulty: 2, subject: 'rugby-score' }), // https://www.guinnessworldrecords.com/world-records/63597-highest-rugby-union-world-cup-aggregate-match-score
  n('sport', 'Combien de buts Lionel Messi a-t-il marqués en 2012, le record sur une année civile ?', 'buts', 91, 'Guinness World Records', { ...V, difficulty: 1, subject: 'messi' }), // https://guinnessworldrecords.com/world-records/106274-most-football-goals-scored-in-a-calendar-year
  n('sport', 'Quel est le score le plus bas jamais réalisé sur 18 trous du PGA Tour, record toujours valable en 2026 (Jim Furyk) ?', 'coups', 58, 'Guinness World Records / PGA Tour', { ...V, perishable: true, difficulty: 1, subject: 'golf' }), // https://www.guinnessworldrecords.com/world-records/629783-lowest-single-round-score-18-holes-on-golfs-pga-tour
  n('sport', 'Combien pesait Ōrora, le sumotori le plus lourd de l’histoire ?', 'kg', 292.6, 'Wikipédia : Ōrora Satoshi', { ...V, difficulty: 1, subject: 'sumo' }), // https://en.wikipedia.org/wiki/List_of_the_heaviest_sumo_wrestlers
  n('sport', 'Combien de rounds a duré le plus long combat de boxe de l’histoire (Bowen–Burke, 1893) ?', 'rounds', 110, 'Guinness World Records', { ...V, difficulty: 2, subject: 'boxe' }), // https://www.guinnessworldrecords.com/world-records/64545-longest-boxing-match-duration
  n('sport', 'Quelle distance a parcourue l’Audi victorieuse en 2010, record absolu des 24 Heures du Mans ?', 'km', 5410, 'ACO / Audi', { ...V, difficulty: 3, subject: '24h-du-mans' }), // https://www.24h-lemans.com/en/news/the-key-figures-of-the-2026-24-hours-of-le-mans-60817
  n('sport', 'De quelle hauteur a plongé Laso Schaller en 2015, le plus haut plongeon jamais homologué ?', 'm', 58.8, 'Guinness World Records', { ...V, perishable: true, difficulty: 2, subject: 'plongeon' }), // https://www.guinnessworldrecords.com/world-records/high-diving-board-men/
  n('sport', 'De quelle distance le gardien Tom King a-t-il marqué en 2021, le but le plus lointain de l’histoire du football ?', 'm', 96.01, 'Guinness World Records', { ...V, perishable: true, difficulty: 2, subject: 'but-lointain' }), // https://en.wikipedia.org/wiki/List_of_goalscoring_goalkeepers
  r('sport', 'Classe ces stades du plus petit au plus grand', 'milliers de places', [['Parc des Princes', 48], ['Orange Vélodrome', 67], ['Stade de France', 81], ['Wembley', 90]], 'Sites officiels / presse', { ...V, difficulty: 1, subject: 'stades' }), // https://www.pleinsoleilparis.fr/stade-de-france-capacite-nombre-de-places-et-configurations/ + https://www.flashscore.fr/actualites/les-18-stades-des-clubs-de-ligue-1-pour-la-saison-2026-27/KC7dQ4fd/
  r('sport', 'Classe ces sportifs du plus petit au plus grand', 'cm', [['Muggsy Bogues (plus petit joueur NBA)', 160], ['Antoine Dupont', 174], ['Teddy Riner', 204], ['Manute Bol (plus grand joueur NBA)', 231]], 'Wikipédia / presse sportive', { ...V, difficulty: 1, subject: 'taille-sportifs' }), // https://www.mentalfloss.com/sports/basketball/muggsy-bogues-shortest-nba-player + https://en.wikipedia.org/wiki/Teddy_Riner

  // ───────── Insolite (nouveaux) ─────────
  n('insolite', 'Combien mesurait la plus longue baguette du monde, cuite à Suresnes en 2024 ?', 'm', 140.53, 'Guinness World Records', { ...V, difficulty: 1, subject: 'baguette' }), // https://boulangerie.org/wp-content/uploads/CP-A-Suresnes-les-boulangers-battent-le-record-de-la-plus-longue-baguette-du-monde.pdf
  n('insolite', 'Combien pesait le plus gros hamburger du monde (Pilsting, Allemagne, 2017) ?', 'kg', 1164, 'Guinness World Records', { ...V, difficulty: 1, subject: 'burger' }), // https://www.guinnessworldrecords.com/news/2026/4/take-the-biggest-bite-5-food-records-that-might-surprise-you
  n('insolite', 'Quel était le montant du plus gros jackpot de loterie de l’histoire en 2026 (Powerball, 2022) ?', 'milliards $', 2.04, 'Powerball', { ...V, perishable: true, difficulty: 2, subject: 'loterie' }), // https://www.fox26houston.com/news/powerball-dec-2025-vs-biggest-lottery-jackpots-history
  n('insolite', 'Quel cap d’abonnés MrBeast, la chaîne YouTube la plus suivie, a-t-il été le premier à franchir en juin 2026 ?', 'millions', 500, 'YouTube', { ...V, difficulty: 1, subject: 'mrbeast' }), // https://blog.youtube/creator-and-artist-stories/mrbeast-500-million-youtube-subscribers/
  n('insolite', 'Combien mesurent les cheveux de Xie Qiuping, les plus longs jamais mesurés ?', 'm', 5.627, 'Guinness World Records', { ...V, difficulty: 2, subject: 'cheveux' }), // https://www.guinnessworldrecords.com/world-records/longest-hair-female
  n('insolite', 'Quel est le score maximal possible à Pac-Man, atteint lors d’une « partie parfaite » ?', 'millions de points', 3.33, 'Twin Galaxies', { ...V, difficulty: 3, subject: 'pac-man' }), // https://arcadeblogger.com/2015/08/23/pac-man-achieving-the-perfect-game/
  n('insolite', 'Combien a été vendue la carte Pikachu Illustrator de Logan Paul, la carte Pokémon la plus chère de l’histoire en 2026 ?', 'millions $', 16.5, 'Guinness World Records / Goldin (2026)', { ...V, perishable: true, difficulty: 2, subject: 'carte-pokemon' }), // https://www.guinnessworldrecords.com/news/2026/2/logan-pauls-rare-pokemon-card-becomes-most-expensive-ever-sold-in-record-setting-auction
  n('insolite', 'En quelle année a ouvert Sobrino de Botín (Madrid), le plus ancien restaurant du monde encore en activité ?', '', 1725, 'Guinness World Records', { ...V, year: true, difficulty: 2, subject: 'restaurant' }), // https://www.theculturetrip.com/europe/spain/articles/madrids-sobrino-de-botin-is-the-oldest-restaurant-in-the-world
  n('insolite', 'Combien de Schtroumpfs se sont réunis à Landerneau en 2025, le plus grand rassemblement de l’histoire ?', 'personnes', 3076, 'Guinness World Records', { ...V, perishable: true, difficulty: 1, subject: 'schtroumpfs' }), // https://www.guinnessworldrecords.com/world-records/most-people-dressed-as-smurfs
  n('insolite', 'Combien pesait la plus grosse tablette de chocolat du monde (Thorntons, 2011) ?', 'kg', 5792.5, 'Guinness World Records', { ...V, difficulty: 2, subject: 'chocolat' }), // https://www.guinnessworldrecords.com/world-records/largest-chocolate-bar
  n('insolite', 'En quelle année a été jetée à la mer la plus vieille bouteille à message jamais retrouvée ?', '', 1886, 'Guinness World Records', { ...V, year: true, difficulty: 1, subject: 'bouteille-mer' }), // https://guinnessworldrecords.com/world-records/oldest-message-in-a-bottle
  n('insolite', 'Combien mesurait le plus long voile de mariée du monde (Chypre, 2018) ?', 'km', 6.96, 'Guinness World Records', { ...V, difficulty: 3, subject: 'voile-mariee' }), // https://www.guinnessworldrecords.com/news/2019/2/brides-dreams-comes-true-with-wedding-veil-thats-longer-than-63-football-fields
  n('insolite', 'Combien mesure « The American Dream », la plus longue voiture du monde ?', 'm', 30.54, 'Guinness World Records', { ...V, difficulty: 1, subject: 'limousine' }), // https://www.guinnessworldrecords.com/news/2022/3/worlds-longest-car-over-100-ft-restored-to-its-former-glory-694607
  r('insolite', 'Classe ces ventes aux enchères de la moins chère à la plus chère', 'millions $', [['Banane scotchée de Cattelan (2024)', 6.2], ['Sac Birkin original (2025)', 10], ['NFT « Everydays » de Beeple (2021)', 69.3], ['Mercedes 300 SLR Uhlenhaut (2022)', 143]], 'Sotheby’s / Christie’s / RM Sotheby’s', { ...V, difficulty: 2, subject: 'encheres' }), // https://artreview.com/maurizio-cattelan-banana-sold-for-6-2-million/ + https://fashionunited.uk/news/fashion/the-10-million-dollar-bag-original-birkin-smashes-records-at-paris-auction/2025071082754 + https://decrypt.co/60971/beeples-nft-artwork-sells-for-60-3-million-in-christies-auction?amp=1 + https://www.cbsnews.com/amp/news/mercedes-sothebys-record-price-143-million
  r('insolite', 'Classe ces films du moins au plus rentable au box-office mondial', 'milliards $', [['Intouchables', 0.48], ['Barbie', 1.45], ['Titanic', 2.26], ['Avengers: Endgame (n° 1 de l’histoire)', 2.94]], 'Box Office Mojo / The Numbers', { ...V, difficulty: 1, subject: 'box-office' }), // https://en.wikipedia.org/wiki/List_of_highest-grossing_films + https://www.the-numbers.com/movie/Intouchables-les
  r('insolite', 'Classe ces jeux vidéo du moins vendu au plus vendu (2026)', "millions d'exemplaires", [['Super Mario Bros.', 58], ['Wii Sports', 82.9], ['GTA V', 230], ['Minecraft', 425]], 'Wikipédia : liste des jeux vidéo les plus vendus (2026)', { ...V, perishable: true, difficulty: 2, subject: 'jeux-video' }), // https://en.wikipedia.org/wiki/List_of_best-selling_video_games
]
