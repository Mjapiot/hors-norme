import { formatNumber } from '../lib/format'
import type { Answer, Breakdown, Level, NumberQuestion, Round, RoundResult, Tier, Tolerance } from './types'

/*
 * Barème « précision + vainqueur de manche » (V1.2) :
 *  - chaque réponse marque selon SON écart : tout pile 3, palier serré 2, palier large 1, sinon 0 ;
 *    l'écart se juge selon le type de question (voir TOLERANCE_RULES) ;
 *  - les questions difficiles ont des paliers 1,5 fois plus larges, et le niveau de la partie
 *    élargit (Détente) ou resserre (Expert) tous les paliers ;
 *  - chaque manche a un vainqueur : le plus proche gagne +2, même loin, sauf réponse « Hors Norme » ;
 *  - égalité parfaite pour ce point → duel « estimation éclair » ;
 *  - à partir de 3 participants, une réponse « Hors Norme » (plus du triple ou moins du tiers
 *    de la vraie valeur, ×5 / ÷5 pour une question difficile, ou l'équivalent en unités) coûte 1 point ;
 *  - la dernière question compte double (gains seulement, le malus reste à −1).
 */

interface ToleranceRule {
  /** Écart maximal pour 2 points, puis pour 1 point (en fraction pour le %, en unités sinon). */
  close: number
  near: number
  /** Écart jugé en % de la vraie valeur (sinon en unités). */
  relative: boolean
  /** Au-delà : réponse « Hors Norme ». ratio = rapport réponse / vraie valeur (dans un sens ou dans l'autre). */
  absurd: { ratio: number } | { units: number }
}

export const TOLERANCE_RULES: Record<Tolerance, ToleranceRule> = {
  relative: { close: 0.1, near: 0.3, relative: true, absurd: { ratio: 3 } },
  tight: { close: 0.01, near: 0.03, relative: true, absurd: { ratio: 1.2 } },
  years: { close: 10, near: 30, relative: false, absurd: { units: 200 } },
  age: { close: 2, near: 5, relative: false, absurd: { ratio: 3 } },
  degrees: { close: 2, near: 5, relative: false, absurd: { units: 30 } },
}
/** Paliers élargis pour les questions difficiles. */
export const HARD_FACTOR = 1.5
/** Question difficile : le seuil « Hors Norme » s'éloigne (×3 → ×5, 200 ans → 333 ans…). */
export const HARD_ABSURD_FACTOR = 2
/** Élargissement des paliers selon le niveau de la partie. */
export const LEVEL_TOLERANCE: Record<Level, number> = { detente: 1.5, classique: 1, expert: 0.75 }

export const WIN_POINTS = 2
export const MALUS_POINTS = -1
/** Le malus « Hors Norme » ne s'applique qu'à partir de ce nombre de participants. */
export const MALUS_MIN_PARTICIPANTS = 3
export const RANKING_PERFECT_POINTS = 3
export const RANKING_HALF_POINTS = 1
export const HIGHERLOWER_POINTS = 1
/** Fourchette : 3 points si le max fait moins de 1,5 × le min, 2 points sous 3 ×, 1 point au-delà. */
export const RANGE_STEPS: { maxRatio: number; points: number; tier: Tier }[] = [
  { maxRatio: 1.5, points: 3, tier: 'perfect' },
  { maxRatio: 3, points: 2, tier: 'good' },
]
export const RANGE_WIDE_POINTS = 1

const EPSILON = 1e-9

/** Type de tolérance d'une question : réglage explicite, sinon déduit de l'unité. */
export function toleranceOf(q: Pick<NumberQuestion, 'tolerance' | 'year' | 'unit' | 'answer'>): Tolerance {
  if (q.tolerance) return q.tolerance
  if (q.year) return 'years'
  const unit = q.unit.trim().toLowerCase()
  // Une température « record » de Vénus (464 °C) se juge en % ; une température corporelle, en degrés.
  if (unit === '°c' && Math.abs(q.answer) < 100) return 'degrees'
  if ((unit === 'ans' || unit === 'an') && q.answer > 0 && q.answer <= 130) return 'age'
  return 'relative'
}

export interface ScoreOptions {
  multiplier?: 1 | 2
  level?: Level
}

export function relativeError(guess: number, answer: number): number {
  if (answer === 0) return Math.abs(guess)
  return Math.abs(guess - answer) / Math.abs(answer)
}

/** Écart d'une réponse, dans la mesure propre au type de question (fraction ou unités). */
export function errorFor(guess: number, answer: number, tolerance: Tolerance): number {
  return TOLERANCE_RULES[tolerance].relative ? relativeError(guess, answer) : Math.abs(guess - answer)
}

/**
 * Réponse « Hors Norme » : beaucoup trop haute ou trop basse, de façon symétrique.
 * Question difficile : seuil plus éloigné (×5 / ÷5 au lieu de ×3 / ÷3).
 */
export function isAbsurd(guess: number, answer: number, tolerance: Tolerance, difficulty: 1 | 2 | 3 = 1): boolean {
  const { absurd } = TOLERANCE_RULES[tolerance]
  const hard = difficulty === 3
  if ('units' in absurd) return Math.abs(guess - answer) > absurd.units * (hard ? 5 / 3 : 1)
  if (answer <= 0) return false
  if (guess <= 0) return true
  const ratio = hard ? (absurd.ratio - 1) * HARD_ABSURD_FACTOR + 1 : absurd.ratio
  return guess > answer * ratio || guess < answer / ratio
}

export function precisionFor(error: number, tolerance: Tolerance, difficulty: 1 | 2 | 3 = 1, level: Level = 'classique'): { points: number; tier: Tier } {
  if (error <= EPSILON) return { points: 3, tier: 'exact' }
  const rule = TOLERANCE_RULES[tolerance]
  const factor = (difficulty === 3 ? HARD_FACTOR : 1) * LEVEL_TOLERANCE[level]
  if (error <= rule.close * factor + EPSILON) return { points: 2, tier: 'close' }
  if (error <= rule.near * factor + EPSILON) return { points: 1, tier: 'near' }
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

/** Mot d'unité au singulier pour un écart inférieur à 2 (« 1 jour », « 0,5 million de km² »). */
function unitFor(unit: string, amount: number): string {
  if (Math.abs(amount) >= 2) return unit
  const [first, ...rest] = unit.split(' ')
  if (!/^[a-zéèêàç-]{2,}s$/i.test(first) || ['mois', 'fois', 'pas', 'bras'].includes(first.toLowerCase())) return unit
  return [first.slice(0, -1), ...rest].join(' ')
}

/** Écart lisible, dans l'unité de la question : « 1 200 km² de trop », « 3 ans trop tôt ». */
export function gapLabel(guess: number, q: Pick<NumberQuestion, 'answer' | 'unit' | 'year'>): string {
  const diff = Number((guess - q.answer).toPrecision(12))
  if (diff === 0) return 'Tout pile'
  const amount = Math.abs(diff)
  if (q.year) return `${formatNumber(amount)} an${amount >= 2 ? 's' : ''} trop ${diff > 0 ? 'tard' : 'tôt'}`
  const unit = q.unit.trim() ? ` ${unitFor(q.unit.trim(), amount)}` : ''
  return `${formatNumber(amount)}${unit} ${diff > 0 ? 'de trop' : 'de moins'}`
}

export function scoreNumber(guesses: (number | null)[], question: NumberQuestion, opts: ScoreOptions = {}): RoundResult {
  const multiplier = opts.multiplier ?? 1
  const tolerance = toleranceOf(question)
  const malusActive = guesses.length >= MALUS_MIN_PARTICIPANTS
  const errors = guesses.map((g) => (g === null ? null : errorFor(g, question.answer, tolerance)))

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
    const { points, tier } = precisionFor(err, tolerance, question.difficulty, opts.level)
    const absurd = malusActive && isAbsurd(g, question.answer, tolerance, question.difficulty)
    breakdown.push({ precision: points, win: 0, malus: absurd ? MALUS_POINTS : 0 })
    tiers.push(absurd ? 'absurd' : tier)
    labels.push(gapLabel(g, question))
  })

  // Vainqueur de la manche : le plus proche, même loin, sauf réponse « Hors Norme ».
  const scorers = errors.flatMap((e, i) => (e !== null && breakdown[i].malus === 0 ? [{ e, i }] : []))
  let duel: RoundResult['duel'] = null
  if (scorers.length > 0) {
    const best = Math.min(...scorers.map((s) => s.e))
    const winners = scorers.filter((s) => Math.abs(s.e - best) < EPSILON).map((s) => s.i)
    if (winners.length === 1) breakdown[winners[0]].win = WIN_POINTS
    else duel = { tied: winners, winners: [], guesses: [], resolved: false }
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
    // Comparaison par valeur : deux éléments de même valeur sont interchangeables.
    const good = order.filter((idx, pos) => values[idx] === values[correct[pos]]).length
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

/** Rapport max / min d'une fourchette (infini si le minimum est nul). */
export function rangeRatio(min: number, max: number): number {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)
  if (lo <= 0) return Infinity
  return hi / lo
}

const formatRatio = (ratio: number) =>
  Number.isFinite(ratio) ? `×${ratio.toLocaleString('fr-FR', { maximumFractionDigits: ratio < 10 ? 1 : 0 })}` : 'très large'

/** Fourchette : points selon la largeur si la vraie valeur est dedans, +1 à la plus serrée. */
export function scoreRange(ranges: ({ min: number | null; max: number | null } | null)[], answer: number, opts: ScoreOptions = {}): RoundResult {
  const breakdown: Breakdown[] = []
  const labels: string[] = []
  const tiers: Tier[] = []
  const ratios: (number | null)[] = []
  for (const r of ranges) {
    if (!r || r.min === null || r.max === null) {
      breakdown.push({ precision: 0, win: 0, malus: 0 })
      labels.push('Pas de réponse')
      tiers.push('none')
      ratios.push(null)
      continue
    }
    const lo = Math.min(r.min, r.max)
    const hi = Math.max(r.min, r.max)
    const ratio = rangeRatio(lo, hi)
    if (answer < lo - EPSILON || answer > hi + EPSILON) {
      breakdown.push({ precision: 0, win: 0, malus: 0 })
      labels.push(answer < lo ? 'Fourchette trop haute' : 'Fourchette trop basse')
      tiers.push('miss')
      ratios.push(null)
      continue
    }
    const step = RANGE_STEPS.find((s) => ratio < s.maxRatio)
    breakdown.push({ precision: step?.points ?? RANGE_WIDE_POINTS, win: 0, malus: 0 })
    labels.push(`Dans la fourchette · ${formatRatio(ratio)}`)
    tiers.push(step?.tier ?? 'partial')
    ratios.push(ratio)
  }
  // +1 à la fourchette juste la plus serrée (partagé en cas d'égalité, pas de duel).
  const inside = ratios.flatMap((r, i) => (r !== null ? [{ r, i }] : []))
  if (inside.length > 0) {
    const best = Math.min(...inside.map((x) => x.r))
    inside.filter((x) => x.r === best || Math.abs(x.r - best) < EPSILON).forEach((x) => (breakdown[x.i].win = WIN_POINTS))
  }
  return finalize(breakdown, labels, tiers, opts.multiplier ?? 1)
}

export function scoreRound(round: Round, answers: Answer[], opts: ScoreOptions = {}): RoundResult {
  switch (round.kind) {
    case 'classic':
    case 'chrono':
      return scoreNumber(
        answers.map((a) => (a.kind === 'number' ? a.value : null)),
        round.question,
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
    case 'range':
      return scoreRange(
        answers.map((a) => (a.kind === 'range' ? a : null)),
        round.question.answer,
        opts,
      )
  }
}

/**
 * Gagnants d'un duel « estimation éclair » : le plus proche parmi les ex æquo ;
 * nouvelle égalité (ou personne n'a répondu) → tous se partagent le point.
 */
export function duelWinners(tied: number[], guesses: (number | null)[], question: NumberQuestion): number[] {
  const tolerance = toleranceOf(question)
  const answered = tied.flatMap((i) => {
    const g = guesses[i]
    return g === null || g === undefined ? [] : [{ i, e: errorFor(g, question.answer, tolerance) }]
  })
  if (answered.length === 0) return tied
  const best = Math.min(...answered.map((a) => a.e))
  return answered.filter((a) => Math.abs(a.e - best) < EPSILON).map((a) => a.i)
}

/** Attribue le point de la manche après un duel (plusieurs gagnants = point partagé). */
export function resolveDuel(result: RoundResult, winners: number[], guesses: (number | null)[] = []): RoundResult {
  if (!result.duel || result.duel.resolved) return result
  const breakdown = result.breakdown.map((b, i) => (winners.includes(i) ? { ...b, win: WIN_POINTS } : b))
  return {
    ...result,
    breakdown,
    points: breakdown.map((b) => total(b, result.multiplier)),
    duel: { ...result.duel, winners, guesses, resolved: true },
  }
}

/** Sans question de duel disponible, tous les ex-æquo prennent le point. */
export function shareTie(result: RoundResult): RoundResult {
  if (!result.duel || result.duel.resolved) return result
  const tied = result.duel.tied
  const breakdown = result.breakdown.map((b, i) => (tied.includes(i) ? { ...b, win: WIN_POINTS } : b))
  return { ...result, breakdown, points: breakdown.map((b) => total(b, result.multiplier)), duel: null }
}
