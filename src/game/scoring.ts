import type { Answer, Breakdown, Round, RoundResult, Tier } from './types'

/*
 * Barème « précision + gagnant de manche » :
 *  - chaque réponse marque selon SON écart (tout pile 3, < 5 % 2, < 20 % 1, sinon 0) ;
 *  - le plus proche gagne +1, seulement s'il a marqué (sinon personne) ;
 *  - égalité parfaite pour ce point → duel de rapidité ;
 *  - à partir de 3 participants, une réponse « Hors Norme » (plus du double ou moins
 *    de la moitié de la vraie valeur) coûte 1 point ;
 *  - la dernière question compte double (gains seulement, le malus reste à −1).
 */

export const PRECISION_TIERS: { maxError: number; points: number; tier: Tier }[] = [
  { maxError: 0, points: 3, tier: 'exact' },
  { maxError: 0.05, points: 2, tier: 'close' },
  { maxError: 0.2, points: 1, tier: 'near' },
]
/** Même logique pour une année, en écart absolu (années). */
export const YEAR_TIERS: { maxError: number; points: number; tier: Tier }[] = [
  { maxError: 0, points: 3, tier: 'exact' },
  { maxError: 5, points: 2, tier: 'close' },
  { maxError: 20, points: 1, tier: 'near' },
]
export const WIN_POINTS = 1
export const MALUS_POINTS = -1
/** Le malus « Hors Norme » ne s'applique qu'à partir de ce nombre de participants. */
export const MALUS_MIN_PARTICIPANTS = 3
/** Une année est « Hors Norme » au-delà de ce nombre d'années d'écart. */
export const ABSURD_YEARS = 200
export const RANKING_PERFECT_POINTS = 3
export const RANKING_HALF_POINTS = 1
export const HIGHERLOWER_POINTS = 1

const EPSILON = 1e-9

export interface ScoreOptions {
  multiplier?: 1 | 2
}

export function relativeError(guess: number, answer: number): number {
  if (answer === 0) return Math.abs(guess)
  return Math.abs(guess - answer) / Math.abs(answer)
}

/** Plus du double, ou moins de la moitié, de la vraie valeur. */
export function isAbsurd(guess: number, answer: number, year = false): boolean {
  if (year) return Math.abs(guess - answer) > ABSURD_YEARS
  if (answer <= 0) return false
  return guess > answer * 2 || guess < answer / 2
}

export function precisionFor(error: number, year = false): { points: number; tier: Tier } {
  const tiers = year ? YEAR_TIERS : PRECISION_TIERS
  for (const t of tiers) if (error <= t.maxError + EPSILON) return { points: t.points, tier: t.tier }
  return { points: 0, tier: 'far' }
}

/** Seuls les gains sont multipliés : la dernière question reste une chance de revenir, pas un piège. */
const total = (b: Breakdown, multiplier: number) => (b.precision + b.win) * multiplier + b.malus

function finalize(
  breakdown: Breakdown[],
  labels: string[],
  tiers: Tier[],
  multiplier: 1 | 2,
  duel: RoundResult['duel'] = null,
): RoundResult {
  return { points: breakdown.map((b) => total(b, multiplier)), breakdown, labels, tiers, multiplier, duel }
}

export function scoreNumber(guesses: (number | null)[], answer: number, year = false, opts: ScoreOptions = {}): RoundResult {
  const multiplier = opts.multiplier ?? 1
  const malusActive = guesses.length >= MALUS_MIN_PARTICIPANTS
  const errors = guesses.map((g) => (g === null ? null : year ? Math.abs(g - answer) : relativeError(g, answer)))

  const breakdown: Breakdown[] = []
  const labels: string[] = []
  const tiers: Tier[] = []
  guesses.forEach((g, i) => {
    const err = errors[i]
    if (g === null || err === null) {
      breakdown.push({ precision: 0, win: 0, malus: 0 })
      labels.push('Pas de réponse')
      tiers.push('none')
      return
    }
    const { points, tier } = precisionFor(err, year)
    const absurd = malusActive && isAbsurd(g, answer, year)
    breakdown.push({ precision: points, win: 0, malus: absurd ? MALUS_POINTS : 0 })
    tiers.push(absurd ? 'absurd' : tier)
    if (tier === 'exact') labels.push('Tout pile')
    else labels.push(year ? `à ${err} an${err > 1 ? 's' : ''}` : `à ${formatPercent(err)}`)
  })

  // Point de la manche : le plus proche parmi ceux qui ont marqué.
  const scorers = errors.map((e, i) => ({ e, i })).filter(({ e, i }) => e !== null && breakdown[i].precision > 0)
  let duel: RoundResult['duel'] = null
  if (scorers.length > 0) {
    const best = Math.min(...scorers.map((s) => s.e as number))
    const winners = scorers.filter((s) => Math.abs((s.e as number) - best) < EPSILON).map((s) => s.i)
    if (winners.length === 1) breakdown[winners[0]].win = WIN_POINTS
    else duel = { tied: winners, winner: null, resolved: false }
  }
  return finalize(breakdown, labels, tiers, multiplier, duel)
}

export function correctRanking(values: number[]): number[] {
  return values.map((_, i) => i).sort((a, b) => values[a] - values[b])
}

export function scoreRanking(orders: number[][], values: number[], opts: ScoreOptions = {}): RoundResult {
  const correct = correctRanking(values)
  const breakdown: Breakdown[] = []
  const labels: string[] = []
  const tiers: Tier[] = []
  for (const order of orders) {
    const good = order.filter((idx, pos) => correct[pos] === idx).length
    const perfect = good === correct.length
    const half = !perfect && good >= correct.length / 2
    breakdown.push({ precision: perfect ? RANKING_PERFECT_POINTS : half ? RANKING_HALF_POINTS : 0, win: 0, malus: 0 })
    labels.push(perfect ? 'Parfait' : `${good}/${correct.length} bien placés`)
    tiers.push(perfect ? 'perfect' : half ? 'partial' : 'miss')
  }
  return finalize(breakdown, labels, tiers, opts.multiplier ?? 1)
}

export function scoreHigherLower(
  choices: ('plus' | 'moins' | null)[],
  answer: number,
  threshold: number,
  opts: ScoreOptions = {},
): RoundResult {
  const good = higherLowerAnswer(answer, threshold)
  return finalize(
    choices.map((c) => ({ precision: c === good ? HIGHERLOWER_POINTS : 0, win: 0, malus: 0 })),
    choices.map((c) => (c === null ? 'Pas de réponse' : c === good ? 'Bien vu' : 'Raté')),
    choices.map((c) => (c === null ? 'none' : c === good ? 'good' : 'bad')),
    opts.multiplier ?? 1,
  )
}

export function higherLowerAnswer(answer: number, threshold: number): 'plus' | 'moins' {
  return answer > threshold ? 'plus' : 'moins'
}

export function scoreRound(round: Round, answers: Answer[], opts: ScoreOptions = {}): RoundResult {
  switch (round.kind) {
    case 'classic':
    case 'chrono':
      return scoreNumber(
        answers.map((a) => (a.kind === 'number' ? a.value : null)),
        round.question.answer,
        round.question.year,
        opts,
      )
    case 'higherlower':
      return scoreHigherLower(
        answers.map((a) => (a.kind === 'higherlower' ? a.choice : null)),
        round.question.answer,
        round.threshold,
        opts,
      )
    case 'ranking':
      return scoreRanking(
        answers.map((a) => (a.kind === 'ranking' ? a.order : [])),
        round.question.items.map((it) => it.value),
        opts,
      )
  }
}

/** Attribue le point de la manche après un duel (winner null = personne). */
export function resolveDuel(result: RoundResult, winner: number | null): RoundResult {
  if (!result.duel || result.duel.resolved) return result
  const breakdown = result.breakdown.map((b, i) => (i === winner ? { ...b, win: WIN_POINTS } : b))
  return {
    ...result,
    breakdown,
    points: breakdown.map((b) => total(b, result.multiplier)),
    duel: { ...result.duel, winner, resolved: true },
  }
}

/** Sans question de duel disponible, tous les ex-æquo prennent le point. */
export function shareTie(result: RoundResult): RoundResult {
  if (!result.duel || result.duel.resolved) return result
  const tied = result.duel.tied
  const breakdown = result.breakdown.map((b, i) => (tied.includes(i) ? { ...b, win: WIN_POINTS } : b))
  return { ...result, breakdown, points: breakdown.map((b) => total(b, result.multiplier)), duel: null }
}

export function formatPercent(err: number): string {
  const pct = err * 100
  if (pct < 1) return `${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
  if (pct >= 1000) return `×${(err + 1).toLocaleString('fr-FR', { maximumFractionDigits: 0 })}`
  return `${Math.round(pct)} %`
}
