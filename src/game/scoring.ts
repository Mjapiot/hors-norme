import type { Answer, Round, RoundResult } from './types'

/** Points du podium : 1er, 2e, 3e. */
export const PODIUM = [3, 2, 1]
export const EXACT_BONUS = 3
export const CLOSE_BONUS = 1
export const CLOSE_THRESHOLD = 0.05
/** Pour les questions « en quelle année », bonus si l'écart est de 5 ans ou moins. */
export const CLOSE_YEARS = 5
export const HIGHERLOWER_POINTS = 2
export const RANKING_PERFECT_BONUS = 2

const EPSILON = 1e-9

export function relativeError(guess: number, answer: number): number {
  if (answer === 0) return Math.abs(guess)
  return Math.abs(guess - answer) / Math.abs(answer)
}

/**
 * Rang « compétition » (1, 1, 3…) : les ex-æquo partagent le rang.
 * Les valeurs null (pas de réponse) n'ont pas de rang.
 */
export function competitionRanks(errors: (number | null)[]): (number | null)[] {
  return errors.map((e) => {
    if (e === null) return null
    return 1 + errors.filter((o) => o !== null && o < e - EPSILON).length
  })
}

/**
 * Seuls les min(3, n-1) premiers rangs marquent, pour que le dernier
 * ne gagne jamais de points de classement (sauf égalité générale).
 */
export function podiumPoints(rank: number | null, participants: number): number {
  if (rank === null) return 0
  const scoringRanks = Math.min(PODIUM.length, Math.max(participants - 1, 1))
  return rank <= scoringRanks ? PODIUM[rank - 1] : 0
}

export function scoreNumber(guesses: (number | null)[], answer: number, year = false): RoundResult {
  const errors = guesses.map((g) => {
    if (g === null) return null
    return year ? Math.abs(g - answer) : relativeError(g, answer)
  })
  const ranks = competitionRanks(errors)
  const points: number[] = []
  const notes: string[] = []
  guesses.forEach((g, i) => {
    const err = errors[i]
    if (g === null || err === null) {
      points.push(0)
      notes.push('Pas de réponse')
      return
    }
    let p = podiumPoints(ranks[i], guesses.length)
    if (Math.abs(g - answer) < EPSILON) {
      p += EXACT_BONUS
      notes.push('🎯 Tout pile !')
    } else {
      const close = year ? err <= CLOSE_YEARS : err <= CLOSE_THRESHOLD
      const label = year ? `à ${err} an${err > 1 ? 's' : ''}` : `à ${formatPercent(err)}`
      if (close) p += CLOSE_BONUS
      notes.push(close ? `🔥 ${label}` : label)
    }
    points.push(p)
  })
  return { points, notes }
}

export function correctRanking(values: number[]): number[] {
  return values.map((_, i) => i).sort((a, b) => values[a] - values[b])
}

export function scoreRanking(orders: number[][], values: number[]): RoundResult {
  const correct = correctRanking(values)
  const points: number[] = []
  const notes: string[] = []
  for (const order of orders) {
    const good = order.filter((idx, pos) => correct[pos] === idx).length
    const perfect = good === correct.length
    points.push(good + (perfect ? RANKING_PERFECT_BONUS : 0))
    notes.push(perfect ? '🎯 Parfait !' : `${good}/${correct.length} bien placés`)
  }
  return { points, notes }
}

export function scoreHigherLower(choices: ('plus' | 'moins' | null)[], answer: number, threshold: number): RoundResult {
  const good = answer > threshold ? 'plus' : 'moins'
  return {
    points: choices.map((c) => (c === good ? HIGHERLOWER_POINTS : 0)),
    notes: choices.map((c) => (c === null ? 'Pas de réponse' : c === good ? '✅ Bien vu' : '❌ Raté')),
  }
}

export function scoreRound(round: Round, answers: Answer[]): RoundResult {
  switch (round.kind) {
    case 'classic':
    case 'chrono':
      return scoreNumber(
        answers.map((a) => (a.kind === 'number' ? a.value : null)),
        round.question.answer,
        round.question.year,
      )
    case 'higherlower':
      return scoreHigherLower(
        answers.map((a) => (a.kind === 'higherlower' ? a.choice : null)),
        round.question.answer,
        round.threshold,
      )
    case 'ranking':
      return scoreRanking(
        answers.map((a) => (a.kind === 'ranking' ? a.order : [])),
        round.question.items.map((it) => it.value),
      )
  }
}

export function formatPercent(err: number): string {
  const pct = err * 100
  if (pct < 1) return `${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
  if (pct >= 1000) return `×${(err + 1).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`
  return `${Math.round(pct)} %`
}
