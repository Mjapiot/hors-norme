import { resolveDuel, scoreRound, shareTie } from './scoring'
import type { Answer, DuelQuestion, GameConfig, GameState, Round, RoundResult } from './types'

export type Action =
  | { type: 'start'; config: GameConfig; rounds: Round[]; duels: DuelQuestion[] }
  | { type: 'beginAnswers' }
  | { type: 'ready' }
  | { type: 'submit'; answer: Answer }
  | { type: 'undo' }
  | { type: 'reveal' }
  | { type: 'startDuel' }
  | { type: 'resolveDuel'; winner: number | null }
  | { type: 'next' }
  | { type: 'quit' }

export function initialState(config: GameConfig, rounds: Round[], duels: DuelQuestion[] = []): GameState {
  return {
    config,
    rounds,
    duels,
    index: 0,
    phase: 'question',
    turn: 0,
    answers: [],
    scores: config.names.map(() => 0),
    results: [],
  }
}

/** L'ordre de passage tourne : à la manche k, c'est le participant k qui commence. */
export function participantAt(state: GameState, turn: number): number {
  const n = state.config.names.length
  return (state.index + turn) % n
}

/** Peut-on revenir corriger la réponse précédente ? (jamais au chrono : le temps repartirait à zéro) */
export function canUndo(state: GameState): boolean {
  const kind = state.rounds[state.index]?.kind
  return kind !== 'chrono' && state.turn > 0 && (state.phase === 'handoff' || state.phase === 'allin')
}

/** Dernière question d'une partie en nombre de questions : elle compte double. */
export function isDoubleRound(state: GameState): boolean {
  return state.config.end.type === 'rounds' && state.index === state.rounds.length - 1
}

/** Nombre de duels déjà joués = position dans la réserve. */
export function duelCursor(state: GameState): number {
  return state.results.filter((r) => r.duel?.resolved).length
}

export function currentDuel(state: GameState): DuelQuestion | null {
  return state.duels[duelCursor(state)] ?? null
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

/** Les scores ne descendent jamais sous zéro. */
function applyPoints(scores: number[], points: number[]): number[] {
  return scores.map((s, i) => Math.max(0, s + points[i]))
}

function replaceLast(results: RoundResult[], result: RoundResult): RoundResult[] {
  return [...results.slice(0, -1), result]
}

export function reducer(state: GameState | null, action: Action): GameState | null {
  if (action.type === 'start') return initialState(action.config, action.rounds, action.duels)
  if (action.type === 'quit') return null
  if (!state) return state

  switch (action.type) {
    case 'beginAnswers':
      if (state.phase !== 'question') return state
      return { ...state, phase: 'handoff', turn: 0, answers: state.config.names.map(() => null) }

    case 'ready':
      if (state.phase !== 'handoff') return state
      return { ...state, phase: 'input' }

    case 'submit': {
      if (state.phase !== 'input') return state
      const answers = state.answers.map((a, i) => (i === participantAt(state, state.turn) ? action.answer : a))
      const turn = state.turn + 1
      return { ...state, answers, turn, phase: turn < state.config.names.length ? 'handoff' : 'allin' }
    }

    case 'undo': {
      if (!canUndo(state)) return state
      const turn = state.turn - 1
      const answers = state.answers.map((a, i) => (i === participantAt(state, turn) ? null : a))
      return { ...state, answers, turn, phase: 'handoff' }
    }

    case 'reveal': {
      if (state.phase !== 'allin') return state
      const answers = state.answers.map((a) => a ?? ({ kind: 'number', value: null } as Answer))
      let result = scoreRound(state.rounds[state.index], answers, { multiplier: isDoubleRound(state) ? 2 : 1 })
      if (result.duel && !currentDuel(state)) result = shareTie(result)
      return {
        ...state,
        answers,
        phase: 'reveal',
        scores: applyPoints(state.scores, result.points),
        results: [...state.results, result],
      }
    }

    case 'startDuel': {
      const last = state.results[state.results.length - 1]
      if (state.phase !== 'reveal' || !last?.duel || last.duel.resolved) return state
      return { ...state, phase: 'duel' }
    }

    case 'resolveDuel': {
      if (state.phase !== 'duel') return state
      const last = state.results[state.results.length - 1]
      const resolved = resolveDuel(last, action.winner)
      const delta = resolved.points.map((p, i) => p - last.points[i])
      return {
        ...state,
        phase: 'reveal',
        scores: applyPoints(state.scores, delta),
        results: replaceLast(state.results, resolved),
      }
    }

    case 'next': {
      if (state.phase !== 'reveal') return state
      const last = state.results[state.results.length - 1]
      if (last?.duel && !last.duel.resolved) return state
      if (isOver(state)) return { ...state, phase: 'end' }
      return { ...state, index: state.index + 1, phase: 'question', turn: 0, answers: [] }
    }
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
  if (!saved || !Array.isArray(saved.rounds) || saved.rounds.length === 0 || !Array.isArray(saved.duels)) return null
  return saved.phase === 'input' ? { ...saved, phase: 'handoff' } : saved
}
