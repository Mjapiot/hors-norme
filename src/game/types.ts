/** Thèmes gratuits (inclus dans le jeu). */
export type FreeTheme = 'corps' | 'animaux' | 'geo' | 'espace' | 'sport' | 'constructions' | 'histoire' | 'insolite' | 'amour'
/** Thèmes premium, vendus à l'unité ou en pack global (achats intégrés). */
export type PaidTheme = 'football' | 'rugby' | 'cinema' | 'musique' | 'jo'
export type Theme = FreeTheme | PaidTheme

export const THEMES: Record<Theme, { label: string }> = {
  corps: { label: 'Corps humain' },
  animaux: { label: 'Animaux' },
  geo: { label: 'Géographie' },
  espace: { label: 'Espace' },
  sport: { label: 'Sport' },
  constructions: { label: 'Constructions' },
  histoire: { label: 'Histoire' },
  insolite: { label: 'Insolite' },
  amour: { label: 'Amour & séduction' },
  football: { label: 'Football' },
  rugby: { label: 'Rugby' },
  cinema: { label: 'Cinéma & séries' },
  musique: { label: 'Musique' },
  jo: { label: 'Jeux olympiques' },
}

export const FREE_THEMES: FreeTheme[] = ['corps', 'animaux', 'geo', 'espace', 'sport', 'constructions', 'histoire', 'insolite', 'amour']
/** Thèmes cochés par défaut : tous les thèmes gratuits. */
export const DEFAULT_THEMES: FreeTheme[] = FREE_THEMES
export const PAID_THEMES: PaidTheme[] = ['football', 'rugby', 'cinema', 'musique', 'jo']
export const isPaidTheme = (t: Theme): t is PaidTheme => (PAID_THEMES as Theme[]).includes(t)

interface QuestionBase {
  id: string
  theme: Theme
  prompt: string
  unit: string
  /** Texte libre (source à confirmer lors de la relecture). */
  source: string
  /** Record susceptible d'être battu ou de changer (personne vivante, sport…). */
  perishable: boolean
  difficulty: 1 | 2 | 3
  /** null tant que la question n'a pas été relue par un humain. */
  verified_at: string | null
  /** Sujet principal (« burj-khalifa ») : deux questions sur le même sujet ne tombent jamais dans la même partie. */
  subject?: string
}

/**
 * Façon de juger l'écart d'une réponse :
 *  - relative : en % (quantités : km, kg, habitants…) ;
 *  - tight : en %, mais très strict (records serrés : sprints, sauts, lancers) ;
 *  - years / age / degrees : en unités (années, années d'âge, degrés Celsius).
 */
export type Tolerance = 'relative' | 'tight' | 'years' | 'age' | 'degrees'
export const TOLERANCES: Tolerance[] = ['relative', 'tight', 'years', 'age', 'degrees']

export interface NumberQuestion extends QuestionBase {
  type: 'number'
  answer: number
  /** Réponse = une année : l'écart se juge en années, pas en %. */
  year?: boolean
  /** Réglage explicite (back-office) ; sinon déduit de la question (voir toleranceOf). */
  tolerance?: Tolerance
}

export interface RankingQuestion extends QuestionBase {
  type: 'ranking'
  /** Éléments à classer par valeur croissante. */
  items: { label: string; value: number }[]
}

export type Question = NumberQuestion | RankingQuestion

export type Round =
  | { kind: 'classic'; question: NumberQuestion }
  | { kind: 'chrono'; question: NumberQuestion }
  | { kind: 'higherlower'; question: NumberQuestion; threshold: number }
  /** order = indices des items dans l'ordre d'affichage (mélangé). */
  | { kind: 'ranking'; question: RankingQuestion; order: number[] }
  /** Fourchette : chacun donne un minimum et un maximum. */
  | { kind: 'range'; question: NumberQuestion }

export type RoundKind = Round['kind']

export const ROUND_LABELS: Record<RoundKind, string> = {
  classic: 'Question',
  chrono: 'Bonus · Chrono 30 s',
  higherlower: 'Bonus · Plus ou moins',
  ranking: 'Bonus · Classement express',
  range: 'Bonus · Fourchette',
}

/** Question de départage : estimation éclair, chaque ex æquo à tour de rôle. */
export type DuelQuestion = { question: NumberQuestion }

export type Answer =
  | { kind: 'number'; value: number | null }
  /** Indices des items, du plus petit au plus grand selon le joueur. */
  | { kind: 'ranking'; order: number[] }
  | { kind: 'higherlower'; choice: 'plus' | 'moins' | null }
  | { kind: 'range'; min: number | null; max: number | null }

export type EndCondition = { type: 'rounds'; count: 5 | 10 } | { type: 'target'; points: 15 | 20 | 25 }

/** Niveau de la partie : quelles questions sont tirées et à quel point les paliers sont tolérants. */
export type Level = 'detente' | 'classique' | 'expert'
export const LEVELS: Record<Level, { label: string; hint: string }> = {
  detente: { label: 'Détente', hint: 'Surtout des questions faciles, des paliers plus larges' },
  classique: { label: 'Classique', hint: 'Le mélange de toutes les questions' },
  expert: { label: 'Expert', hint: 'Des questions plus dures, des paliers plus stricts' },
}

export interface GameConfig {
  mode: 'teams' | 'players'
  names: string[]
  end: EndCondition
  themes: Theme[]
  bonus: boolean
  /** Absent dans les parties sauvegardées avant la V1.2 : « classique ». */
  level?: Level
}

/** Niveau atteint par une réponse — sert à l'affichage (icône, couleur). */
export type Tier = 'exact' | 'close' | 'near' | 'far' | 'absurd' | 'none' | 'perfect' | 'partial' | 'miss' | 'good' | 'bad'

export interface Breakdown {
  /** Points de précision (0 à 3) ou points de la manche bonus. */
  precision: number
  /** +2 pour le plus proche de la manche (0 tant qu'un duel est en attente). */
  win: number
  /** −1 pour une réponse « Hors Norme » (à partir de 3 participants). */
  malus: number
}

export interface RoundResult {
  /** Total de la manche par participant, multiplicateur inclus. */
  points: number[]
  /** Points réellement ajoutés au score (le score ne descend jamais sous zéro : un malus peut être absorbé). */
  applied?: number[]
  breakdown: Breakdown[]
  /** Écart affiché (« à 12 % », « 2/4 bien placés »…). */
  labels: string[]
  tiers: Tier[]
  multiplier: 1 | 2
  /**
   * Égalité parfaite pour le point de la manche : départage par une estimation éclair.
   * winners = gagnants du duel (plusieurs si nouvelle égalité : ils se partagent le point).
   */
  duel: { tied: number[]; winners: number[]; guesses: (number | null)[]; resolved: boolean } | null
}

/** allin = toutes les réponses sont saisies, on attend la révélation (dernière chance de corriger). */
export type Phase = 'question' | 'handoff' | 'input' | 'allin' | 'reveal' | 'duel' | 'end'

export interface GameState {
  config: GameConfig
  rounds: Round[]
  /** Réserve de questions pour les duels de rapidité. */
  duels: DuelQuestion[]
  index: number
  phase: Phase
  /** Nombre de participants ayant déjà répondu à la manche en cours. */
  turn: number
  /** Réponses indexées par participant (null = pas encore répondu). */
  answers: (Answer | null)[]
  scores: number[]
  results: RoundResult[]
  /** Manche chrono : heure limite de la saisie en cours (le temps continue même hors de l'écran). */
  deadline?: number | null
}
