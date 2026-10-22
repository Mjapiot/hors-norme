import { resolveDuel, scoreRound, shareTie } from './scoring'
import type { Answer, DuelQuestion, GameConfig, GameState, Phase, Round, RoundResult } from './types'

/** Durée de la saisie d'une manche chrono. */
export const CHRONO_SECONDS = 30

export type Action =
  | { type: 'start'; config: GameConfig; rounds: Round[]; duels: DuelQuestion[] }
  | { type: 'beginAnswers' }
  /** now : horodatage du début de saisie (sert d'heure de départ au chrono). */
  | { type: 'ready'; now: number }
  | { type: 'submit'; answer: Answer }
  | { type: 'undo' }
  | { type: 'reveal' }
  | { type: 'startDuel' }
  | { type: 'resolveDuel'; winners: number[]; guesses: (number | null)[] }
  | { type: 'next' }
  /** Mise en pause (retour à l'accueil) : une saisie hors chrono repasse par le passe-téléphone. */
  | { type: 'pause' }
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

    case 'ready': {
      if (state.phase !== 'handoff') return state
      const chrono = state.rounds[state.index].kind === 'chrono'
      return { ...state, phase: 'input', deadline: chrono ? action.now + CHRONO_SECONDS * 1000 : null }
    }

    case 'submit': {
      if (state.phase !== 'input') return state
      const answers = state.answers.map((a, i) => (i === participantAt(state, state.turn) ? action.answer : a))
      const turn = state.turn + 1
      return { ...state, answers, turn, deadline: null, phase: turn < state.config.names.length ? 'handoff' : 'allin' }
    }

    case 'pause':
      // Au chrono, la saisie reste en cours : le temps continue de s'écouler.
      if (state.phase === 'input' && state.rounds[state.index].kind !== 'chrono') return { ...state, phase: 'handoff', deadline: null }
      return state

    case 'undo': {
      if (!canUndo(state)) return state
      const turn = state.turn - 1
      const answers = state.answers.map((a, i) => (i === participantAt(state, turn) ? null : a))
      return { ...state, answers, turn, phase: 'handoff' }
    }

    case 'reveal': {
      if (state.phase !== 'allin') return state
      const answers = state.answers.map((a) => a ?? ({ kind: 'number', value: null } as Answer))
      let result = scoreRound(state.rounds[state.index], answers, { multiplier: isDoubleRound(state) ? 2 : 1, level: state.config.level ?? 'classique' })
      if (result.duel && !currentDuel(state)) result = shareTie(result)
      const scores = applyPoints(state.scores, result.points)
      return {
        ...state,
        answers,
        phase: 'reveal',
        scores,
        results: [...state.results, { ...result, applied: scores.map((sc, i) => sc - state.scores[i]) }],
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
      const resolved = resolveDuel(last, action.winners, action.guesses)
      const delta = resolved.points.map((p, i) => p - last.points[i])
      const scores = applyPoints(state.scores, delta)
      const applied = (last.applied ?? last.points).map((a, i) => a + scores[i] - state.scores[i])
      return {
        ...state,
        phase: 'reveal',
        scores,
        results: replaceLast(state.results, { ...resolved, applied }),
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

const PHASES: Phase[] = ['question', 'handoff', 'input', 'allin', 'reveal', 'duel', 'end']
const ROUND_KINDS: Round['kind'][] = ['classic', 'chrono', 'higherlower', 'ranking', 'range']

/** Une sauvegarde (localStorage) a-t-elle la forme attendue ? Sinon on l'ignore plutôt que de planter. */
export function isValidState(s: unknown): s is GameState {
  if (!s || typeof s !== 'object') return false
  const g = s as Partial<GameState>
  const names = g.config?.names
  if (!Array.isArray(names) || names.length < 1 || !names.every((n) => typeof n === 'string')) return false
  if (!g.config?.end || !Array.isArray(g.config.themes)) return false
  if (!Array.isArray(g.rounds) || g.rounds.length === 0 || !Array.isArray(g.duels)) return false
  if (!g.rounds.every((r) => r && ROUND_KINDS.includes(r.kind) && r.question && typeof r.question.prompt === 'string')) return false
  if (!Array.isArray(g.scores) || g.scores.length !== names.length || !g.scores.every((x) => Number.isFinite(x))) return false
  if (!Array.isArray(g.results) || !Array.isArray(g.answers)) return false
  if (typeof g.index !== 'number' || g.index < 0 || g.index >= g.rounds.length) return false
  if (typeof g.turn !== 'number' || g.turn < 0 || g.turn > names.length) return false
  if (!g.phase || !PHASES.includes(g.phase)) return false
  // Écrans qui lisent le résultat de la manche : il doit exister et avoir la bonne taille.
  if (g.phase === 'reveal' || g.phase === 'duel') {
    const last = g.results[g.results.length - 1]
    if (!last || !Array.isArray(last.breakdown) || last.breakdown.length !== names.length) return false
  }
  return true
}

/**
 * À la reprise d'une partie : sauvegarde invalide → ignorée ; saisie hors chrono → retour au passe-téléphone
 * (on ne réaffiche jamais une saisie à moitié faite). Au chrono, la saisie reprend avec le temps restant.
 */
export function resumeState(saved: unknown): GameState | null {
  if (!isValidState(saved)) return null
  if (saved.phase === 'input' && !(saved.rounds[saved.index].kind === 'chrono' && typeof saved.deadline === 'number')) {
    return { ...saved, phase: 'handoff', deadline: null }
  }
  return saved
}
