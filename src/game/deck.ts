import { toleranceOf } from './scoring'
import type { DuelQuestion, GameConfig, NumberQuestion, Question, RankingQuestion, Round, RoundKind, Theme } from './types'

export type Rng = () => number

/** Nombre max de manches préparées pour une partie « points cibles ». */
export const TARGET_MODE_MAX_ROUNDS = 40
/** Une manche bonus toutes les BONUS_EVERY manches. */
export const BONUS_EVERY = 4
const BONUS_ROTATION: RoundKind[] = ['chrono', 'ranking', 'higherlower', 'range']
/** Un thème ne revient pas avant ce nombre de manches (s'il y a d'autres thèmes disponibles). */
const THEME_GAP = 2

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

/** Seuil assez proche pour faire hésiter (10 à 25 % d'écart), mais jamais égal à la réponse. */
export function makeThreshold(answer: number, rng: Rng): number {
  for (let attempt = 0; attempt < 20; attempt++) {
    const delta = 0.1 + rng() * 0.15
    const factor = rng() < 0.5 ? 1 - delta : 1 + delta
    const t = roundNice(answer * factor)
    if (t !== answer && Math.abs(t - answer) / Math.abs(answer || 1) >= 0.08) return t
  }
  return roundNice(answer * 1.2)
}

/** Clé normalisée : « Baïkal » → « baikal », « Mont Blanc » → « mont-blanc ». */
export function subjectKey(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Sujets couverts par une question : son sujet déclaré + les éléments d'un classement. */
export function subjectsOf(q: Question): string[] {
  const keys = q.subject ? [subjectKey(q.subject)] : []
  if (q.type === 'ranking') keys.push(...q.items.map((it) => subjectKey(it.label)))
  return keys
}

/** Thèmes déjà joués dans la partie (ordre des manches), pour varier. */
interface ThemeTracker {
  recent: Theme[]
  counts: Map<Theme, number>
}

/**
 * Retire et renvoie une question dont aucun sujet n'a déjà été joué, en variant les thèmes :
 * on évite les thèmes des dernières manches et on privilégie les moins joués.
 * À thème égal, l'ordre du paquet (jamais vues d'abord) est respecté.
 */
function takeFresh<T extends Question>(pool: T[], used: Set<string>, themes: ThemeTracker, accept: (q: T) => boolean = () => true): T | undefined {
  const candidates = pool.flatMap((q, pos) => (accept(q) && subjectsOf(q).every((k) => !used.has(k)) ? [{ q, pos }] : []))
  if (candidates.length === 0) return undefined
  const fresh = candidates.filter((c) => !themes.recent.slice(-THEME_GAP).includes(c.q.theme))
  const choices = fresh.length > 0 ? fresh : candidates
  const least = Math.min(...choices.map((c) => themes.counts.get(c.q.theme) ?? 0))
  const pick = choices.find((c) => (themes.counts.get(c.q.theme) ?? 0) === least)!
  pool.splice(pick.pos, 1)
  subjectsOf(pick.q).forEach((k) => used.add(k))
  themes.recent.push(pick.q.theme)
  themes.counts.set(pick.q.theme, (themes.counts.get(pick.q.theme) ?? 0) + 1)
  return pick.q
}

/** Fourchette : il faut un rapport max/min qui ait du sens (quantité positive, pas une année ni des degrés). */
export const fitsRange = (q: NumberQuestion) => q.answer > 0 && ['relative', 'tight', 'age'].includes(toleranceOf(q))

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
  const usedSubjects = new Set<string>()
  const themes: ThemeTracker = { recent: [], counts: new Map() }
  let bonusCount = 0

  for (let i = 0; i < total; i++) {
    let kind: RoundKind = 'classic'
    if (config.bonus && isBonusSlot(i)) {
      kind = BONUS_ROTATION[(rotationStart + bonusCount) % BONUS_ROTATION.length]
      bonusCount++
    }

    if (kind === 'ranking') {
      const question = takeFresh(rankings, usedSubjects, themes)
      if (question) {
        const indices = question.items.map((_, idx) => idx)
        let order = shuffle(indices, rng)
        // Évite de proposer les éléments déjà dans le bon ordre.
        const sorted = [...indices].sort((a, b) => question.items[a].value - question.items[b].value)
        if (order.every((v, k) => v === sorted[k])) order = [...order].reverse()
        rounds.push({ kind: 'ranking', question, order })
        continue
      }
      kind = 'higherlower'
    }

    if (kind === 'range') {
      const question = takeFresh(numbers, usedSubjects, themes, fitsRange)
      if (question) {
        rounds.push({ kind: 'range', question })
        continue
      }
      kind = 'chrono'
    }

    if (kind === 'higherlower') {
      // Un seuil à ±20 % n'a pas de sens pour une année.
      const question = takeFresh(numbers, usedSubjects, themes, (q) => !q.year)
      if (question) {
        rounds.push({ kind: 'higherlower', question, threshold: makeThreshold(question.answer, rng) })
        continue
      }
      kind = 'chrono'
    }

    const question = takeFresh(numbers, usedSubjects, themes)
    if (!question) break
    rounds.push({ kind: kind === 'chrono' ? 'chrono' : 'classic', question })
  }
  return rounds
}

/** Nombre de questions de départage préparées par partie. */
export const DUEL_RESERVE = 8

/**
 * Réserve de questions pour les duels « estimation éclair » : dans les thèmes choisis
 * (repli sur toute la banque s'il n'en reste pas), jamais une question ou un sujet déjà prévu.
 */
export function buildDuels(
  questions: Question[],
  rounds: Round[],
  themes: Theme[],
  seen: Set<string> = new Set(),
  rng: Rng = Math.random,
): DuelQuestion[] {
  const used = new Set(rounds.map((r) => r.question.id))
  const usedSubjects = new Set(rounds.flatMap((r) => subjectsOf(r.question)))
  const eligible = questions.filter(
    (q): q is NumberQuestion => q.type === 'number' && !used.has(q.id) && subjectsOf(q).every((k) => !usedSubjects.has(k)),
  )
  const inThemes = eligible.filter((q) => themes.includes(q.theme))
  const picked: NumberQuestion[] = []
  const pickedSubjects = new Set<string>()
  for (const q of prioritize(inThemes.length > 0 ? inThemes : eligible, seen, rng)) {
    if (picked.length >= DUEL_RESERVE) break
    if (subjectsOf(q).some((k) => pickedSubjects.has(k))) continue
    subjectsOf(q).forEach((k) => pickedSubjects.add(k))
    picked.push(q)
  }
  return picked.map((question) => ({ question }))
}
