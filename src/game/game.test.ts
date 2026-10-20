import { describe, expect, it } from 'vitest'
import { QUESTIONS } from '../data/questions'
import { buildDuels, buildRounds, fitsRange, makeThreshold, roundNice, subjectKey, subjectsOf } from './deck'
import { CHRONO_SECONDS, canUndo, initialState, isDoubleRound, isOver, participantAt, reducer, resumeState, standings } from './engine'
import { duelWinners, gapLabel, isAbsurd, precisionFor, resolveDuel, scoreHigherLower, scoreNumber, scoreRange, scoreRanking, shareTie, toleranceOf } from './scoring'
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

/** Question de test (quantité en %, niveau 1 par défaut). */
function nq(answer: number, extra: Partial<NumberQuestion> = {}): NumberQuestion {
  return { id: 't', theme: 'geo', type: 'number', prompt: 'Test ?', unit: 'm', answer, source: '', perishable: false, difficulty: 1, verified_at: null, ...extra }
}

describe('scoring — tolérance par type de question', () => {
  it('quantités : tout pile 3, ≤ 5 % 2, ≤ 20 % 1, sinon 0', () => {
    expect(precisionFor(0, 'relative').points).toBe(3)
    expect(precisionFor(0.05, 'relative').points).toBe(2)
    expect(precisionFor(0.0501, 'relative').points).toBe(1)
    expect(precisionFor(0.2, 'relative').points).toBe(1)
    expect(precisionFor(0.204, 'relative').points).toBe(0)
  })

  it('questions difficiles : paliers 1,5 fois plus larges', () => {
    expect(precisionFor(0.07, 'relative', 3).points).toBe(2)
    expect(precisionFor(0.29, 'relative', 3).points).toBe(1)
    expect(precisionFor(0.31, 'relative', 3).points).toBe(0)
    expect(precisionFor(0.07, 'relative', 2).points).toBe(1)
  })

  it('records serrés : 10 s au 100 m (à 4,4 %) ne rapporte plus 2 points', () => {
    const sprint = nq(9.58, { unit: 'secondes', tolerance: 'tight' })
    expect(scoreNumber([9.6, 9.75, 10, 11], sprint).breakdown.map((b) => b.precision)).toEqual([2, 1, 0, 0])
  })

  it('déduit la tolérance : années, âges, températures (sauf très chaudes), sinon %', () => {
    expect(toleranceOf(nq(1832, { year: true, unit: '' }))).toBe('years')
    expect(toleranceOf(nq(122, { unit: 'ans' }))).toBe('age')
    expect(toleranceOf(nq(36000, { unit: 'ans' }))).toBe('relative')
    expect(toleranceOf(nq(13.7, { unit: '°C' }))).toBe('degrees')
    expect(toleranceOf(nq(464, { unit: '°C' }))).toBe('relative')
    expect(toleranceOf(nq(8849))).toBe('relative')
    expect(toleranceOf(nq(122, { unit: 'ans', tolerance: 'relative' }))).toBe('relative')
  })

  it('âges et degrés en écart absolu', () => {
    const calment = nq(122, { unit: 'ans' })
    expect(scoreNumber([122, 121, 119, 100], calment).breakdown.map((b) => b.precision)).toEqual([3, 2, 1, 0])
    const body = nq(13.7, { unit: '°C' })
    expect(scoreNumber([14.5, 16, 20], body).breakdown.map((b) => b.precision)).toEqual([2, 1, 0])
  })

  it('années en écart absolu, libellé « trop tôt / trop tard »', () => {
    const r = scoreNumber([1830, 1815, 1700], nq(1832, { year: true, unit: '' }))
    expect(r.points).toEqual([2 + 1, 1, 0])
    expect(r.labels[0]).toBe('2 ans trop tôt')
  })
})

describe('scoring — précision + gagnant de manche', () => {
  it('le plus proche gagne +1 ; le second ne marque que sa précision', () => {
    const r = scoreNumber([8700, 7500], nq(8849))
    expect(r.points).toEqual([2 + 1, 1])
  })

  it('deux équipes trop loin : 0 point pour tout le monde, pas de point de manche', () => {
    const r = scoreNumber([50, 200], nq(8849))
    expect(r.points).toEqual([0, 0])
    expect(r.duel).toBeNull()
  })

  it('tout pile : 3 + 1, écart affiché dans l’unité', () => {
    const r = scoreNumber([8849, 9000], nq(8849))
    expect(r.points).toEqual([4, 2])
    expect(r.labels).toEqual(['Tout pile', '151 m de trop'])
  })

  it('écart lisible : singulier, décimales, unité vide', () => {
    expect(gapLabel(10, nq(9.58, { unit: 'secondes' }))).toBe('0,42 seconde de trop')
    expect(gapLabel(5, nq(6, { unit: 'jours' }))).toBe('1 jour de moins')
    expect(gapLabel(1.2, nq(1.5, { unit: 'millions de km²' }))).toBe('0,3 million de km² de moins')
    expect(gapLabel(12, nq(10, { unit: '' }))).toBe('2 de trop')
    expect(gapLabel(1833, nq(1832, { year: true, unit: '' }))).toBe('1 an trop tard')
    expect(gapLabel(121, nq(122, { unit: 'ans' }))).toBe('1 an de moins')
    expect(gapLabel(9, nq(12, { unit: 'mois' }))).toBe('3 mois de moins')
  })

  it('égalité parfaite entre les meilleurs → duel en attente, sans point de manche', () => {
    const r = scoreNumber([110, 90, 400], nq(100))
    expect(r.duel).toEqual({ tied: [0, 1], winners: [], guesses: [], resolved: false })
    expect(r.points).toEqual([1, 1, -1])
    const resolved = resolveDuel(r, [1], [null, 95, null])
    expect(resolved.points).toEqual([1, 2, -1])
    expect(resolved.duel?.resolved).toBe(true)
    expect(resolveDuel(r, [0, 1]).points).toEqual([2, 2, -1])
  })

  it('duel éclair : le plus proche gagne, nouvelle égalité ou aucune réponse → partage', () => {
    const q = nq(100)
    expect(duelWinners([0, 2], [90, null, 104], q)).toEqual([2])
    expect(duelWinners([0, 2], [96, null, 104], q)).toEqual([0, 2])
    expect(duelWinners([0, 2], [null, 50, null], q)).toEqual([0, 2])
    expect(duelWinners([0, 2], [null, null, 140], q)).toEqual([2])
  })

  it('sans question de duel, les ex-æquo partagent le point', () => {
    expect(shareTie(scoreNumber([110, 90], nq(100))).points).toEqual([2, 2])
  })

  it('malus « Hors Norme » symétrique (×3 / ÷3), seulement à partir de 3 participants', () => {
    expect(scoreNumber([100, 350], nq(100)).points).toEqual([4, 0])
    const r = scoreNumber([100, 350, 30, 40], nq(100))
    expect(r.points).toEqual([4, -1, -1, 0])
    expect(r.tiers[1]).toBe('absurd')
    expect(isAbsurd(301, 100, 'relative')).toBe(true)
    expect(isAbsurd(300, 100, 'relative')).toBe(false)
    expect(isAbsurd(33.4, 100, 'relative')).toBe(false)
    expect(isAbsurd(33.3, 100, 'relative')).toBe(true)
    expect(isAbsurd(0, 100, 'relative')).toBe(true)
    expect(isAbsurd(1600, 1832, 'years')).toBe(true)
    expect(isAbsurd(1700, 1832, 'years')).toBe(false)
    expect(isAbsurd(50, 13.7, 'degrees')).toBe(true)
  })

  it('une absence de réponse vaut 0, sans malus', () => {
    const r = scoreNumber([null, 10, 40], nq(10))
    expect(r.points).toEqual([0, 4, -1])
    expect(r.labels[0]).toBe('Pas de réponse')
  })

  it('points doublés : gains x2, malus inchangé', () => {
    expect(scoreNumber([100, 350, 30], nq(100), { multiplier: 2 }).points).toEqual([8, -1, -1])
  })
})

describe('scoring — manches bonus', () => {
  it('classement : 3 si parfait, 1 si 2 bien placés, sinon 0', () => {
    const values = [14, 22, 71, 106]
    const r = scoreRanking([[0, 1, 2, 3], [1, 0, 2, 3], [3, 2, 1, 0]], values)
    expect(r.points).toEqual([3, 1, 0])
  })

  it('classement : deux valeurs égales sont interchangeables', () => {
    expect(scoreRanking([[1, 0, 2, 3]], [10, 10, 20, 30]).points).toEqual([3])
  })

  it('plus ou moins : 1 pt si juste', () => {
    expect(scoreHigherLower(['plus', 'moins', null], 120, 100).points).toEqual([1, 0, 0])
  })

  it('fourchette : points selon la largeur, +1 à la plus serrée juste, 0 si dehors', () => {
    const r = scoreRange(
      [
        { min: 90, max: 120 }, // ×1,33 → 3 + 1
        { min: 50, max: 140 }, // ×2,8 → 2
        { min: 10, max: 500 }, // ×50 → 1
        { min: 120, max: 200 }, // dehors
        null,
      ],
      100,
    )
    expect(r.points).toEqual([4, 2, 1, 0, 0])
    expect(r.labels[3]).toBe('Fourchette trop haute')
    expect(r.labels[4]).toBe('Pas de réponse')
    // Bornes inversées acceptées, minimum nul = fourchette « très large ».
    expect(scoreRange([{ min: 120, max: 90 }, { min: 0, max: 1000 }], 100).points).toEqual([4, 1])
  })

  it('fourchette : à égalité de largeur, le +1 est partagé', () => {
    expect(scoreRange([{ min: 90, max: 120 }, { min: 90, max: 120 }], 100).points).toEqual([4, 4])
  })
})

describe('deck', () => {
  it('arrondit les seuils à 2 chiffres significatifs', () => {
    expect(roundNice(6123)).toBe(6100)
    expect(roundNice(0.4567)).toBe(0.46)
  })

  it('le seuil plus/moins est différent de la réponse, à environ 8 à 30 % d’écart', () => {
    const rng = seeded(1)
    for (const a of [5, 9.58, 8849, 384400, 2, 12]) {
      for (let k = 0; k < 50; k++) {
        const t = makeThreshold(a, rng)
        expect(t).not.toBe(a)
        const gap = Math.abs(t - a) / a
        expect(gap).toBeGreaterThanOrEqual(0.08)
        expect(gap).toBeLessThanOrEqual(0.3)
      }
    }
  })

  it('jamais deux questions sur le même sujet dans une partie (y compris via un classement)', () => {
    expect(subjectKey('Baïkal')).toBe('baikal')
    expect(subjectKey('Mont Blanc')).toBe('mont-blanc')
    for (let seed = 1; seed <= 200; seed++) {
      const rounds = buildRounds(QUESTIONS, config({ end: { type: 'target', points: 15 } }), new Set(), seeded(seed))
      const all = rounds.flatMap((r) => subjectsOf(r.question))
      expect(new Set(all).size).toBe(all.length)
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
      s = reducer(s, { type: 'ready', now: 0 })
      s = reducer(s, { type: 'submit', answer: { kind: 'number', value: v } })
    }
    return reducer(s, { type: 'reveal' })!
  }

  it('enchaîne passe-téléphone → saisie → révélation', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'rounds', count: 5 } })
    const rounds = buildRounds(QUESTIONS, cfg, new Set(), seeded(1))
    let s: GameState | null = initialState(cfg, rounds)
    s = reducer(s, { type: 'beginAnswers' })
    expect(s!.phase).toBe('handoff')
    s = reducer(s, { type: 'ready', now: 0 })
    expect(s!.phase).toBe('input')
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 1 } })
    expect(s!.phase).toBe('handoff')
    expect(s!.turn).toBe(1)
    s = reducer(s, { type: 'ready', now: 0 })
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 2 } })
    expect(s!.phase).toBe('allin')
    s = reducer(s, { type: 'reveal' })
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
    let s: GameState | null = initialState(cfg, rounds, buildDuels(QUESTIONS, rounds, cfg.themes, new Set(), seeded(8)))
    s = reducer(s, { type: 'beginAnswers' })
    // Manche 0 : l'ordre de passage commence par A (index 0).
    for (const v of [answer * 1.1, answer * 0.9, answer * 10]) {
      s = reducer(s, { type: 'ready', now: 0 })
      s = reducer(s, { type: 'submit', answer: { kind: 'number', value: v } })
    }
    s = reducer(s, { type: 'reveal' })
    expect(s!.phase).toBe('reveal')
    expect(s!.scores).toEqual([1, 1, 0]) // C : −1 mais plancher à 0
    expect(reducer(s, { type: 'next' })).toBe(s) // duel obligatoire avant de continuer
    s = reducer(s, { type: 'startDuel' })
    expect(s!.phase).toBe('duel')
    s = reducer(s, { type: 'resolveDuel', winners: [0], guesses: [] })
    expect(s!.phase).toBe('reveal')
    expect(s!.scores).toEqual([2, 1, 0])
    expect(reducer(s, { type: 'next' })!.phase).toBe('question')
  })

  it('les questions de duel ne recoupent jamais la partie et restent dans les thèmes choisis', () => {
    const cfg = config({ themes: ['espace', 'geo'] })
    const rounds = buildRounds(QUESTIONS, cfg, new Set(), seeded(10))
    const duels = buildDuels(QUESTIONS, rounds, cfg.themes, new Set(), seeded(11))
    const ids = new Set(rounds.map((r) => r.question.id))
    expect(duels.length).toBeGreaterThan(0)
    expect(duels.every((d) => !ids.has(d.question.id) && cfg.themes.includes(d.question.theme))).toBe(true)
    const subjects = duels.flatMap((d) => subjectsOf(d.question))
    expect(new Set(subjects).size).toBe(subjects.length)
  })

  it('l’ordre de passage tourne à chaque manche et les réponses restent rangées par participant', () => {
    const cfg = config({ names: ['A', 'B', 'C'], bonus: false, end: { type: 'rounds', count: 5 } })
    let s: GameState | null = { ...initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(12))), index: 1 }
    expect([0, 1, 2].map((t) => participantAt(s!, t))).toEqual([1, 2, 0])
    s = reducer(s, { type: 'beginAnswers' })
    s = reducer(s, { type: 'ready', now: 0 })
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 42 } })
    expect(s!.answers[1]).toEqual({ kind: 'number', value: 42 })
    expect(s!.answers[0]).toBeNull()
  })

  it('corriger : on revient à la saisie du participant précédent, jamais au chrono', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'rounds', count: 5 } })
    let s: GameState | null = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(13)))
    s = reducer(s, { type: 'beginAnswers' })
    expect(canUndo(s!)).toBe(false)
    s = reducer(s, { type: 'ready', now: 0 })
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 1 } })
    s = reducer(s, { type: 'ready', now: 0 })
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 2 } })
    expect(s!.phase).toBe('allin')
    s = reducer(s, { type: 'undo' })
    expect(s!.phase).toBe('handoff')
    expect(s!.turn).toBe(1)
    expect(s!.answers).toEqual([{ kind: 'number', value: 1 }, null])
    const chrono = { ...s!, rounds: s!.rounds.map((r) => (r.kind === 'classic' ? { ...r, kind: 'chrono' as const } : r)) }
    expect(canUndo(chrono)).toBe(false)
  })

  it('classement final avec ex-æquo', () => {
    expect(standings([5, 9, 5])).toEqual([
      { index: 1, score: 9, rank: 1 },
      { index: 0, score: 5, rank: 2 },
      { index: 2, score: 5, rank: 2 },
    ])
  })
})

describe('V1.1 — tirage, chrono, reprise', () => {
  it('varie les thèmes : jamais le même thème deux manches de suite quand c’est possible', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rounds = buildRounds(QUESTIONS, config({ bonus: false }), new Set(), seeded(seed))
      for (let i = 1; i < rounds.length; i++) expect(rounds[i].question.theme).not.toBe(rounds[i - 1].question.theme)
    }
  })

  it('la Fourchette tombe parmi les bonus, jamais sur une année ni des degrés', () => {
    const ranges = Array.from({ length: 40 }, (_, seed) => buildRounds(QUESTIONS, config({ end: { type: 'target', points: 15 } }), new Set(), seeded(seed + 1)))
      .flat()
      .filter((r) => r.kind === 'range')
    expect(ranges.length).toBeGreaterThan(0)
    expect(ranges.every((r) => fitsRange(r.question as NumberQuestion))).toBe(true)
  })

  it('chrono : l’heure limite est posée à la saisie et effacée à la validation', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false, end: { type: 'rounds', count: 5 } })
    const base = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(14)))
    const chrono: GameState = { ...base, rounds: base.rounds.map((r) => (r.kind === 'classic' ? { ...r, kind: 'chrono' as const } : r)) }
    let s = reducer(chrono, { type: 'beginAnswers' })
    s = reducer(s, { type: 'ready', now: 1000 })
    expect(s!.deadline).toBe(1000 + CHRONO_SECONDS * 1000)
    // Pause au chrono : la saisie reste ouverte, le temps continue.
    expect(reducer(s, { type: 'pause' })).toBe(s)
    s = reducer(s, { type: 'submit', answer: { kind: 'number', value: 3 } })
    expect(s!.deadline).toBeNull()
  })

  it('pause hors chrono : la saisie repasse par le passe-téléphone', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false })
    let s: GameState | null = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(15)))
    s = reducer(reducer(s, { type: 'beginAnswers' }), { type: 'ready', now: 0 })
    expect(reducer(s, { type: 'pause' })!.phase).toBe('handoff')
  })

  it('reprise : sauvegarde abîmée ignorée, saisie remise au passe-téléphone sauf chrono en cours', () => {
    const cfg = config({ names: ['A', 'B'], bonus: false })
    const s = initialState(cfg, buildRounds(QUESTIONS, cfg, new Set(), seeded(16)))
    expect(resumeState(null)).toBeNull()
    expect(resumeState({ ...s, rounds: [] })).toBeNull()
    expect(resumeState({ ...s, scores: [0] })).toBeNull()
    expect(resumeState({ ...s, index: 99 })).toBeNull()
    expect(resumeState({ ...s, phase: 'reveal' })).toBeNull() // pas de résultat de manche
    expect(resumeState({ ...s, rounds: [{ kind: 'mystère' }] })).toBeNull()
    expect(resumeState(s)).toEqual(s)
    expect(resumeState({ ...s, phase: 'input' })!.phase).toBe('handoff')
    const chrono = { ...s, phase: 'input' as const, deadline: 5000, rounds: s.rounds.map((r) => ({ ...r, kind: 'chrono' as const })) }
    expect(resumeState(chrono)!.phase).toBe('input')
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
