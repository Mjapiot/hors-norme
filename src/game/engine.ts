import { scoreRound } from './scoring'
import type { Answer, GameConfig, GameState, Round } from './types'

export type Action =
  | { type: 'start'; config: GameConfig; rounds: Round[] }
  | { type: 'beginAnswers' }
  | { type: 'ready' }
  | { type: 'submit'; answer: Answer }
  | { type: 'next' }
  | { type: 'quit' }

export function initialState(config: GameConfig, rounds: Round[]): GameState {
  return {
    config,
    rounds,
    index: 0,
    phase: 'question',
    turn: 0,
    answers: [],
    scores: config.names.map(() => 0),
    results: [],
  }
}

/** La partie s'arrête-t-elle après la manche courante ? */
export function isOver(state: GameState): boolean {
  if (state.index + 1 >= state.rounds.length) return true
  const { end } = state.config
  if (end.type === 'rounds') return false
  const best = Math.max(...state.scores)
  const leaders = state.scores.filter((s) => s === best).length
  // Objectif atteint par un leader unique ; en cas d'égalité on joue une manche de plus.
  return best >= end.points && leaders === 1
}

export function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'start') return initialState(action.config, action.rounds)
  if (action.type === 'quit') return null
  if (!state) return state

  switch (action.type) {
    case 'beginAnswers':
      if (state.phase !== 'question') return state
      return { ...state, phase: 'handoff', turn: 0, answers: [] }

    case 'ready':
      if (state.phase !== 'handoff') return state
      return { ...state, phase: 'input' }

    case 'submit': {
      if (state.phase !== 'input') return state
      const answers = [...state.answers, action.answer]
      if (answers.length < state.config.names.length) {
        return { ...state, answers, turn: state.turn + 1, phase: 'handoff' }
      }
      const result = scoreRound(state.rounds[state.index], answers)
      return {
        ...state,
        answers,
        phase: 'reveal',
        scores: state.scores.map((s, i) => s + result.points[i]),
        results: [...state.results, result],
      }
    }

    case 'next':
      if (state.phase !== 'reveal') return state
      if (isOver(state)) return { ...state, phase: 'end' }
      return { ...state, index: state.index + 1, phase: 'question', turn: 0, answers: [] }
  }
}

/** Classement final : indices triés par score décroissant, avec rang partagé. */
export function standings(scores: number[]): { index: number; score: number; rank: number }[] {
  return scores
    .map((score, index) => ({ index, score, rank: 1 + scores.filter((s) => s > score).length }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
}

/** À la reprise d'une partie, on ne réaffiche jamais un écran de saisie : on repasse par le passe-téléphone. */
export function resumeState(saved: GameState | null): GameState | null {
  if (!saved || !Array.isArray(saved.rounds) || saved.rounds.length === 0) return null
  return saved.phase === 'input' ? { ...saved, phase: 'handoff' } : saved
}
