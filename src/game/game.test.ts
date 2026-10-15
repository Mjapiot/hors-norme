import { describe, expect, it } from 'vitest'
import { QUESTIONS } from '../data/questions'
import { buildDuels, buildRounds, makeThreshold, roundNice } from './deck'
import { initialState, isDoubleRound, isOver, reducer, standings } from './engine'
import { isAbsurd, precisionFor, resolveDuel, scoreHigherLower, scoreNumber, scoreRanking, shareTie } from './scoring'
import type { GameConfig, GameState, NumberQuestion } from './types'
import { applyKey, formatDraft, frenchSpacing, parseDraft } from '../lib/format'

/** RNG déterministe (mulberry32) pour des tests reproductibles. */
function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ALL_THEMES: GameConfig['themes'] = ['corps', 'animaux', 'geo', 'espace', 'sport', 'constructions', 'histoire', 'insolite']

function config(partial: Partial<GameConfig> = {}): GameConfig {
  return {
    mode: 'teams',
    names: ['A', 'B', 'C'],
    end: { type: 'rounds', count: 10 },
    themes: ALL_THEMES,
    bonus: true,
    ...partial,
  }
}

describe('scoring — précision + gagnant de manche', () => {
  it('paliers de précision : tout pile 3, < 5 % 2, < 20 % 1, sinon 0', () => {
    expect(precisionFor(0).points).toBe(3)
    expect(precisionFor(0.04).points).toBe(2)
    expect(precisionFor(0.05).points).toBe(2)
    expect(precisionFor(0.15).points).toBe(1)
    expect(precisionFor(0.2).points).toBe(1)
    expect(precisionFor(0.21).points).toBe(0)
  })

  it('le plus proche gagne +1 ; le second ne marque que sa précision', () => {
    // 2 équipes : 8 700 (à 1,7 %) et 7 500 (à 15 %) pour 8 849
    const r = scoreNumber([8700, 7500], 8849)
    expect(r.points).toEqual([2 + 1, 1])
  })

  it('deux équipes trop loin : 0 point pour tout le monde, pas de point de manche', () => {
    const r = scoreNumber([50, 200], 8849)
    expect(r.points).toEqual([0, 0])
    expect(r.duel).toBeNull()
  })

  it('tout pile : 3 + 1', () => {
    const r = scoreNumber([8849, 9000], 8849)
    expect(r.points).toEqual([4, 2])
    expect(r.labels[0]).toBe('Tout pile')
  })

  it('égalité parfaite entre les meilleurs → duel en attente, sans point de manche', () => {
    const r = scoreNumber([110, 90, 300], 100)
    expect(r.duel).toEqual({ tied: [0, 1], winner: null, resolved: false })
    expect(r.points).toEqual([1, 1, -1])
    const resolved = resolveDuel(r, 1)
    expect(resolved.points).toEqual([1, 2, -1])
    expect(resolved.duel?.resolved).toBe(true)
  })

  it('sans question de duel, les ex-æquo partagent le point', () => {
    expect(shareTie(scoreNumber([110, 90], 100)).points).toEqual([2, 2])
  })

  it('malus « Hors Norme » seulement à partir de 3 participants', () => {
    expect(scoreNumber([100, 250], 100).points).toEqual([4, 0])
    const r = scoreNumber([100, 250, 40, 60], 100)
    expect(r.points).toEqual([4, -1, -1, 0])
    expect(r.tiers[1]).toBe('absurd')
    expect(isAbsurd(201, 100)).toBe(true)
    expect(isAbsurd(200, 100)).toBe(false)
    expect(isAbsurd(49, 100)).toBe(true)
  })

  it('une absence de réponse vaut 0, sans malus', () => {
    const r = scoreNumber([null, 10, 30], 10)
    expect(r.points).toEqual([0, 4, -1])
    expect(r.labels[0]).toBe('Pas de réponse')
  })

  it('juge les années en écart absolu', () => {
    const r = scoreNumber([1830, 1815, 1700], 1832, true)
    expect(r.points).toEqual([2 + 1, 1, 0])
    expect(r.labels[0]).toContain('2 ans')
  })

  it('points doublés sur demande', () => {
    expect(scoreNumber([100, 250, 30], 100, false, { multiplier: 2 }).points).toEqual([8, -2, -2])
  })
})

describe('scoring — manches bonus', () => {
  it('classement : 3 si parfait, 1 si 2 bien placés, sinon 0', () => {
    const values = [14, 22, 71, 106]
    const r = scoreRanking([[0, 1, 2, 3], [1, 0, 2, 3], [3, 2, 1, 0]], values)
    expect(r.points).toEqual([3, 1, 0])
  })

  it('plus ou moins : 1 pt si juste', () => {
    expect(scoreHigherLower(['plus', 'moins', null], 120, 100).points).toEqual([1, 0, 0])
  })
})

describe('deck', () => {
  it('arrondit les seuils à 2 chiffres significatifs', () => {
    expect(roundNice(6123)).toBe(6100)
    expect(roundNice(0.4567)).toBe(0.46)
  })

  it('le seuil plus/moins est toujours différent de la réponse', () => {
    const rng = seeded(1)
    for (const a of [5, 9.58, 8849, 384400, 2]) {
      for (let k = 0; k < 50; k++) expect(makeThreshold(a, rng)).not.toBe(a)
    }
  })

  it('construit le bon nombre de manches, sans doublon, avec un bonus toutes les 4', () => {
    const rounds = buildRounds(QUESTIONS, config(), new Set(), seeded(42))
    expect(rounds).toHaveLength(10)
    const ids = rounds.map((r) => r.question.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(rounds[3].kind).not.toBe('classic')
    expect(rounds[7].kind).not.toBe('classic')
    expect(rounds.filter((r) => r.kind !== 'classic')).toHaveLength(2)
  })

  it('respecte le filtre de thèmes et le mode sans bonus', () => {
    const rounds = buildRounds(QUESTIONS, config({ themes: ['espace'], bonus: false }), new Set(), seeded(3))
    expect(rounds.every((r) => r.question.theme === 'espace' && r.kind === 'classic')).toBe(true)
  })

  it('privilégie les questions jamais vues', () => {
    const numbers = QUESTIONS.filter((q): q is NumberQuestion => q.type === 'number' && q.theme === 'espace')
    const seen = new Set(numbers.slice(0, numbers.length - 5).map((q) => q.id))
    const rounds = buildRounds(QUESTIONS, config({ themes: ['espace'], bonus: false, end: { type: 'rounds', count: 5 } }), seen, seeded(9))
    expect(rounds.every((r) => !seen.has(r.question.id))).toBe(true)
  })

  it('les données ont des identifiants uniques et des classements à 4 éléments', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length)
    for (const q of QUESTIONS) if (q.type === 'ranking') expect(q.items).toHaveLength(4)
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(150)
  })
})

describe('moteur de partie', () => {
  const play = (state: GameState, values: number[]) => {
    let s: GameState | null = reducer(state, { type: 'beginAnswers' })
    for (const v of values) {
      s = reducer(s, { type: 'ready' })
      s = reducer(s, { type: 'submit', answer: { kind: 'number', value: v } })
    }
    return s!
  }

  it('enchaîne passe-téléphone → saisie → révélation', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'rounds', count: 5 } })
    const rounds = buildRounds(QUESTIONS, cfg, new Set(), seeded(1))
    let s: GameState | null = initialState(cfg, rounds)
    s = reducer(s, { type: 'beginAnswers' })
    expect(s!.phase).toBe('handoff')
    s = reducer(s, { type: 'ready' })
    expect(s!.phase).toBe('input')
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 1 } })
    expect(s!.phase).toBe('handoff')
    expect(s!.turn).toBe(1)
    s = reducer(s, { type: 'ready' })
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 2 } })
    expect(s!.phase).toBe('reveal')
    expect(s!.results).toHaveLength(1)
  })

  it('termine après le nombre de questions choisi', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'rounds', count: 5 } })
    let s = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(2)))
    for (let i = 0; i < 5; i++) {
      s = play(s, [1, 2])
      s = reducer(s, { type: 'next' })!
    }
    expect(s.phase).toBe('end')
  })

  it('mode points cibles : s’arrête quand un leader unique atteint l’objectif', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'target', points: 8 } })
    const s = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(4)))
    expect(isOver({ ...s, scores: [7, 3] })).toBe(false)
    expect(isOver({ ...s, scores: [8, 3] })).toBe(true)
    expect(isOver({ ...s, scores: [12, 12] })).toBe(false)
  })

  it('ignore les actions hors phase', () => {
    const cfg = config({ names: ['A', 'B'] })
    const s = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(5)))
    expect(reducer(s, { type: 'next' })).toBe(s)
    expect(reducer(s, { type: 'submit', answer: { kind: 'number', value: 1 } })).toBe(s)
  })

  it('dernière question à points doublés (mode nombre de questions)', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'rounds', count: 5 } })
    const s = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(6)))
    expect(isDoubleRound(s)).toBe(false)
    expect(isDoubleRound({ ...s, index: 4 })).toBe(true)
    expect(isDoubleRound({ ...s, index: 4, config: { ...cfg, end: { type: 'target', points: 8 } } })).toBe(false)
  })

  it('égalité → duel → point attribué au vainqueur, scores jamais négatifs', () => {
    const cfg = config({ names: ['A', 'B', 'C'], bonus: false, end: { type: 'rounds', count: 5 } })
    const rounds = buildRounds(QUESTIONS, cfg, new Set(), seeded(7))
    const answer = (rounds[0].question as NumberQuestion).answer
    let s: GameState | null = initialState(cfg, rounds, buildDuels(QUESTIONS, rounds, seeded(8)))
    s = reducer(s, { type: 'beginAnswers' })
    for (const v of [answer * 1.1, answer * 0.9, answer * 10]) {
      s = reducer(s, { type: 'ready' })
      s = reducer(s, { type: 'submit', answer: { kind: 'number', value: v } })
    }
    expect(s!.phase).toBe('reveal')
    expect(s!.scores).toEqual([1, 1, 0]) // C : −1 mais plancher à 0
    expect(reducer(s, { type: 'next' })).toBe(s) // duel obligatoire avant de continuer
    s = reducer(s, { type: 'startDuel' })
    expect(s!.phase).toBe('duel')
    s = reducer(s, { type: 'resolveDuel', winner: 0 })
    expect(s!.phase).toBe('reveal')
    expect(s!.scores).toEqual([2, 1, 0])
    expect(reducer(s, { type: 'next' })!.phase).toBe('question')
  })

  it('les questions de duel ne recoupent jamais la partie et ne sont jamais des années', () => {
    const cfg = config()
    const rounds = buildRounds(QUESTIONS, cfg, new Set(), seeded(10))
    const duels = buildDuels(QUESTIONS, rounds, seeded(11))
    const ids = new Set(rounds.map((r) => r.question.id))
    expect(duels.length).toBeGreaterThan(0)
    expect(duels.every((d) => !ids.has(d.question.id) && !d.question.year && d.threshold !== d.question.answer)).toBe(true)
  })

  it('classement final avec ex-æquo', () => {
    expect(standings([5, 9, 5])).toEqual([
      { index: 1, score: 9, rank: 1 },
      { index: 0, score: 5, rank: 2 },
      { index: 2, score: 5, rank: 2 },
    ])
  })
})

describe('pavé numérique', () => {
  const type = (keys: string[], year = false) => keys.reduce((d, k) => applyKey(d, k, year), '')

  it('saisit, efface et gère la virgule', () => {
    expect(type(['3', '0', '0', '0'])).toBe('3000')
    expect(type([',', '5'])).toBe('0,5')
    expect(type(['1', ',', ',', '2'])).toBe('1,2')
    expect(type(['1', '2', '⌫'])).toBe('1')
    expect(type(['0', '7'])).toBe('7')
  })

  it('refuse la virgule pour une année', () => {
    expect(type(['1', '8', ',', '3', '2'], true)).toBe('1832')
  })

  it('parse et formate la saisie à la française', () => {
    expect(parseDraft('12,5')).toBe(12.5)
    expect(parseDraft('')).toBeNull()
    expect(formatDraft('1234567')).toBe('1 234 567')
    expect(frenchSpacing('Quel âge ?')).toBe('Quel âge ?')
  })
})
