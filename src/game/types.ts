export type Theme =
  | 'corps'
  | 'animaux'
  | 'geo'
  | 'espace'
  | 'sport'
  | 'constructions'
  | 'histoire'
  | 'insolite'

export const THEMES: Record<Theme, { label: string; emoji: string }> = {
  corps: { label: 'Corps humain', emoji: '🧍' },
  animaux: { label: 'Animaux', emoji: '🐘' },
  geo: { label: 'Géographie', emoji: '🌍' },
  espace: { label: 'Espace', emoji: '🪐' },
  sport: { label: 'Sport', emoji: '🏅' },
  constructions: { label: 'Constructions', emoji: '🏗️' },
  histoire: { label: 'Histoire', emoji: '📜' },
  insolite: { label: 'Insolite', emoji: '🤯' },
}

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
  chrono: '⚡ Bonus · Chrono 30 s',
  higherlower: '↕️ Bonus · Plus ou moins',
  ranking: '📊 Bonus · Classement express',
}

export type Answer =
  | { kind: 'number'; value: number | null }
  /** Indices des items, du plus petit au plus grand selon le joueur. */
  | { kind: 'ranking'; order: number[] }
  | { kind: 'higherlower'; choice: 'plus' | 'moins' | null }

export type EndCondition = { type: 'rounds'; count: 5 | 10 } | { type: 'target'; points: 10 | 15 | 20 }

export interface GameConfig {
  mode: 'teams' | 'players'
  names: string[]
  end: EndCondition
  themes: Theme[]
  bonus: boolean
}

export interface RoundResult {
  points: number[]
  /** Étiquette affichée par participant (« Tout pile ! », « à 3 % »…). */
  notes: string[]
}

export type Phase = 'question' | 'handoff' | 'input' | 'reveal' | 'end'

export interface GameState {
  config: GameConfig
  rounds: Round[]
  index: number
  phase: Phase
  turn: number
  answers: Answer[]
  scores: number[]
  results: RoundResult[]
}
