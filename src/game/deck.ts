import type { GameConfig, NumberQuestion, Question, RankingQuestion, Round, RoundKind } from './types'

export type Rng = () => number

/** Nombre max de manches préparées pour une partie « points cibles ». */
export const TARGET_MODE_MAX_ROUNDS = 40
/** Une manche bonus toutes les BONUS_EVERY manches. */
export const BONUS_EVERY = 4
const BONUS_ROTATION: RoundKind[] = ['chrono', 'ranking', 'higherlower']

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Questions jamais vues d'abord, puis les déjà vues — chaque groupe mélangé. */
function prioritize<T extends Question>(items: T[], seen: Set<string>, rng: Rng): T[] {
  return [
    ...shuffle(items.filter((q) => !seen.has(q.id)), rng),
    ...shuffle(items.filter((q) => seen.has(q.id)), rng),
  ]
}

/** Arrondit à 2 chiffres significatifs pour un seuil « rond » (6 000, 0,45…). */
export function roundNice(value: number): number {
  return Number(value.toPrecision(2))
}

/** Seuil franchement différent de la réponse (entre 15 % et 50 % d'écart). */
export function makeThreshold(answer: number, rng: Rng): number {
  for (let attempt = 0; attempt < 10; attempt++) {
    const delta = 0.15 + rng() * 0.35
    const factor = rng() < 0.5 ? 1 - delta : 1 + delta
    const t = roundNice(answer * factor)
    if (t !== answer && Math.abs(t - answer) / Math.abs(answer || 1) >= 0.1) return t
  }
  return roundNice(answer * 1.5)
}

export function isBonusSlot(index: number): boolean {
  return (index + 1) % BONUS_EVERY === 0
}

export function buildRounds(
  questions: Question[],
  config: GameConfig,
  seen: Set<string> = new Set(),
  rng: Rng = Math.random,
): Round[] {
  const pool = questions.filter((q) => config.themes.includes(q.theme))
  const numbers = prioritize(pool.filter((q): q is NumberQuestion => q.type === 'number'), seen, rng)
  const rankings = prioritize(pool.filter((q): q is RankingQuestion => q.type === 'ranking'), seen, rng)

  const total = config.end.type === 'rounds' ? config.end.count : TARGET_MODE_MAX_ROUNDS
  const rotationStart = Math.floor(rng() * BONUS_ROTATION.length)
  const rounds: Round[] = []
  let bonusCount = 0

  for (let i = 0; i < total; i++) {
    let kind: RoundKind = 'classic'
    if (config.bonus && isBonusSlot(i)) {
      kind = BONUS_ROTATION[(rotationStart + bonusCount) % BONUS_ROTATION.length]
      bonusCount++
      if (kind === 'ranking' && rankings.length === 0) kind = 'higherlower'
    }

    if (kind === 'ranking') {
      const question = rankings.shift()!
      const indices = question.items.map((_, idx) => idx)
      let order = shuffle(indices, rng)
      // Évite de proposer les éléments déjà dans le bon ordre.
      const sorted = [...indices].sort((a, b) => question.items[a].value - question.items[b].value)
      if (order.every((v, k) => v === sorted[k])) order = [...order].reverse()
      rounds.push({ kind, question, order })
      continue
    }

    if (kind === 'higherlower') {
      // Un seuil à ±30 % n'a pas de sens pour une année.
      const pos = numbers.findIndex((q) => !q.year)
      if (pos >= 0) {
        const [question] = numbers.splice(pos, 1)
        rounds.push({ kind, question, threshold: makeThreshold(question.answer, rng) })
        continue
      }
      kind = 'chrono'
    }

    const question = numbers.shift()
    if (!question) break
    rounds.push({ kind, question })
  }
  return rounds
}
