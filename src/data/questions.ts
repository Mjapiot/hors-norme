import type { NumberQuestion, Question, RankingQuestion, Theme } from '../game/types'

/*
 * Base de départ générée par IA — TOUTES les questions sont à relire
 * (verified_at = null). Lot 2 : migration vers Supabase + back-office.
 * Les records « perishable » doivent être revérifiés régulièrement.
 */

type Opts = { perishable?: boolean; difficulty?: 1 | 2 | 3; year?: boolean; verified?: string }

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
  n('animaux', 'Quelle vitesse de pointe atteint environ le guépard, l’animal terrestre le plus rapide ?', 'km/h', 110, 'Wikipédia : Guépard', { difficulty: 1 }),
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
  n('geo', 'Combien mesure le Nil, traditionnellement considéré comme le plus long fleuve du monde ?', 'km', 6650, 'Wikipédia : Nil'),
  n('geo', 'Quelle est la superficie de la Russie, le plus grand pays du monde ?', 'millions de km²', 17.1, 'Wikipédia : Russie'),
  n('geo', 'Quelle est la superficie du Vatican, le plus petit pays du monde ?', 'hectares', 44, 'Wikipédia : Vatican'),
  n('geo', 'Quelle est la superficie du Sahara, le plus grand désert chaud du monde ?', 'millions de km²', 9, 'Wikipédia : Sahara'),
  n('geo', 'Quelle est la superficie de la mer Caspienne, la plus grande étendue d’eau fermée du monde ?', 'km²', 371000, 'Wikipédia : Mer Caspienne', { difficulty: 3 }),
  n('geo', 'Quelle est la profondeur du lac Baïkal, le lac le plus profond du monde ?', 'm', 1642, 'Wikipédia : Lac Baïkal'),
  n('geo', 'Quelle est la hauteur du Salto Angel, la plus haute chute d’eau du monde ?', 'm', 979, 'Wikipédia : Salto Angel'),
  n('geo', "Quelle est la superficie de l'océan Arctique, le plus petit océan ?", 'millions de km²', 14, 'Wikipédia : Océan Arctique'),
  n('geo', "Quelle est la superficie de l'océan Pacifique, le plus grand océan ?", 'millions de km²', 165, 'Wikipédia : Océan Pacifique'),
  n('geo', 'Quelle est l’altitude du mont Blanc, le plus haut sommet des Alpes (relevé 2026) ?', 'm', 4807, 'Relevé 2026 (géomètres de Haute-Savoie)', { difficulty: 1, ...PV }),
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
  n('geo', "À quelle altitude se trouve le lac Titicaca, le plus haut lac navigable du monde ?", 'm', 3812, 'Wikipédia : Lac Titicaca'),
  n('geo', "Combien d'îles compte la Suède, le pays qui en a le plus ?", 'îles', 267570, 'Statistiska centralbyrån', { difficulty: 3 }),
  n('geo', 'Combien mesure le Mauna Kea de sa base sous-marine à son sommet, la plus haute montagne du monde mesurée ainsi ?', 'm', 10210, 'Wikipédia : Mauna Kea', { difficulty: 3 }),

  // ───────── Espace ─────────
  n('espace', 'Quelle est la distance moyenne entre la Terre et la Lune ?', 'km', 384400, 'NASA', { difficulty: 1 }),
  n('espace', 'Combien de Terres pourraient tenir dans Jupiter, la plus grande planète ?', 'Terres', 1321, 'NASA'),
  n('espace', 'Quel est le diamètre de Mercure, la plus petite planète du Système solaire ?', 'km', 4879, 'NASA'),
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
  n('sport', 'Quel est le record du monde du saut en longueur (Mike Powell) ?', 'm', 8.95, 'World Athletics'),
  n('sport', 'Quel est le record du monde du lancer du poids (Ryan Crouser) ?', 'm', 23.56, 'World Athletics', P),
  n('sport', 'Combien de tournois du Grand Chelem a remportés Novak Djokovic, le record masculin ?', 'titres', 24, 'ATP', P),
  n('sport', 'Combien de médailles olympiques a remportées Michael Phelps, le sportif le plus médaillé ?', 'médailles', 28, 'CIO'),
  n('sport', 'Combien de Tours de France a gagnés au maximum un même coureur ?', 'victoires', 5, 'ASO', { difficulty: 1 }),
  n('sport', "Combien de Ballons d'or Lionel Messi, le recordman, avait-il remportés avant l'édition 2026 ?", 'Ballons d’or', 8, 'France Football', P),
  n('sport', 'Combien de Coupes du monde a remportées le Brésil, la nation la plus titrée ?', 'titres', 5, 'FIFA', { difficulty: 1 }),
  n('sport', "Combien de minutes a duré le plus long match de l'histoire du tennis (Isner–Mahut, 2010) ?", 'minutes', 665, 'Wimbledon'),
  n('sport', 'Combien de points a marqués Wilt Chamberlain lors de son match record en NBA ?', 'points', 100, 'NBA'),
  n('sport', 'Combien a coûté le transfert de Neymar au PSG, le plus cher de l’histoire ?', 'millions €', 222, 'PSG (2017)', P),
  n('sport', 'Quelle vitesse a atteint le service le plus rapide jamais mesuré en match professionnel (Sam Groth, 2012) ?', 'km/h', 263, 'Challenger de Busan 2012 (non homologué par l’ATP)', V),
  n('sport', 'Combien de Grands Prix de F1 Lewis Hamilton, le recordman, avait-il remportés à l’automne 2026 ?', 'victoires', 106, 'FIA (2026)', PV),
  n('sport', "Quel âge avait Oscar Swahn, le plus vieux médaillé de l'histoire des Jeux olympiques ?", 'ans', 72, 'CIO', { difficulty: 3 }),

  // ───────── Constructions ─────────
  n('constructions', 'Quelle est la hauteur de la Burj Khalifa, le plus haut gratte-ciel du monde ?', 'm', 828, 'Emaar', P),
  n('constructions', 'Quelle est la hauteur de la tour Eiffel (avec antennes) ?', 'm', 330, 'SETE', { difficulty: 1 }),
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
  n('histoire', 'En quelle année a été inaugurée la tour Eiffel, alors le plus haut monument du monde ?', '', 1889, 'SETE', { difficulty: 1, year: true }),
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
]
