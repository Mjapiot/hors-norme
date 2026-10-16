/** Thèmes gratuits (inclus dans le jeu). */
export type FreeTheme = 'corps' | 'animaux' | 'geo' | 'espace' | 'sport' | 'constructions' | 'histoire' | 'insolite'
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
  football: { label: 'Football' },
  rugby: { label: 'Rugby' },
  cinema: { label: 'Cinéma & séries' },
  musique: { label: 'Musique' },
  jo: { label: 'Jeux olympiques' },
}

export const FREE_THEMES: FreeTheme[] = ['corps', 'animaux', 'geo', 'espace', 'sport', 'constructions', 'histoire', 'insolite']
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

export interface NumberQuestion extends QuestionBase {
  type: 'number'
  answer: number
  /** Réponse = une année : l'écart se juge en années, pas en %. */
  year?: boolean
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

export type RoundKind = Round['kind']

export const ROUND_LABELS: Record<RoundKind, string> = {
  classic: 'Question',
  chrono: 'Bonus · Chrono 30 s',
  higherlower: 'Bonus · Plus ou moins',
  ranking: 'Bonus · Classement express',
}

/** Question de départage : plus ou moins d'un seuil, sur l'écran partagé. */
export type DuelQuestion = { question: NumberQuestion; threshold: number }

export type Answer =
  | { kind: 'number'; value: number | null }
  /** Indices des items, du plus petit au plus grand selon le joueur. */
  | { kind: 'ranking'; order: number[] }
  | { kind: 'higherlower'; choice: 'plus' | 'moins' | null }

export type EndCondition = { type: 'rounds'; count: 5 | 10 } | { type: 'target'; points: 8 | 12 | 15 }

export interface GameConfig {
  mode: 'teams' | 'players'
  names: string[]
  end: EndCondition
  themes: Theme[]
  bonus: boolean
}

/** Niveau atteint par une réponse — sert à l'affichage (icône, couleur). */
export type Tier = 'exact' | 'close' | 'near' | 'far' | 'absurd' | 'none' | 'perfect' | 'partial' | 'miss' | 'good' | 'bad'

export interface Breakdown {
  /** Points de précision (0 à 3) ou points de la manche bonus. */
  precision: number
  /** +1 pour le plus proche (0 tant qu'un duel est en attente). */
  win: number
  /** −1 pour une réponse « Hors Norme » (à partir de 3 participants). */
  malus: number
}

export interface RoundResult {
  /** Total de la manche par participant, multiplicateur inclus. */
  points: number[]
  breakdown: Breakdown[]
  /** Écart affiché (« à 12 % », « 2/4 bien placés »…). */
  labels: string[]
  tiers: Tier[]
  multiplier: 1 | 2
  /** Égalité parfaite pour le point de la manche : départage au duel de rapidité. */
  duel: { tied: number[]; winner: number | null; resolved: boolean } | null
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
}
