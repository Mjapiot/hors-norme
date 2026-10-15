import { describe, expect, it } from 'vitest'
import { rowToQuestion } from './remote'
import type { QuestionRow } from './remote'
import { fromImport, markVerified, validate } from '../admin/model'

const row = (over: Partial<QuestionRow> = {}): QuestionRow => ({
  id: 'geo-001',
  theme: 'geo',
  type: 'number',
  prompt: 'Quelle est l’altitude de l’Everest ?',
  unit: 'm',
  answer: 8849,
  items: null,
  year: false,
  subject: 'everest',
  source: 'Test',
  perishable: false,
  difficulty: 1,
  verified_at: '2026-10-15',
  ...over,
})

describe('conversion des lignes Supabase', () => {
  it('question chiffrée', () => {
    expect(rowToQuestion(row())).toMatchObject({ id: 'geo-001', type: 'number', answer: 8849, subject: 'everest' })
  })
  it('année', () => {
    expect(rowToQuestion(row({ year: true, answer: 1889 }))).toMatchObject({ year: true })
  })
  it('classement valide', () => {
    const items = [1, 2, 3, 4].map((v) => ({ label: `x${v}`, value: v }))
    expect(rowToQuestion(row({ type: 'ranking', answer: null, items }))).toMatchObject({ type: 'ranking', items })
  })
  it('rejette les lignes incohérentes', () => {
    expect(rowToQuestion(row({ answer: null }))).toBeNull()
    expect(rowToQuestion(row({ type: 'ranking', answer: null, items: [{ label: 'a', value: 1 }] }))).toBeNull()
  })
})

describe('back-office', () => {
  it('valide une question importée au format du jeu', () => {
    const q = fromImport({ theme: 'sport', prompt: 'Combien de temps… le plus long ?', unit: 'min', answer: 12.5, source: 'X' })
    expect(q.status).toBe('review')
    expect(validate(q)).toEqual([])
  })
  it('refuse un classement aux valeurs égales et une publication sans source', () => {
    const items = [1, 1, 3, 4].map((v, i) => ({ label: `x${i}`, value: v }))
    expect(validate(fromImport({ theme: 'geo', prompt: 'Classe ces éléments', items }))).toContain('Classement : les 4 valeurs doivent être différentes.')
    expect(validate(fromImport({ theme: 'geo', prompt: 'Question sans source ?', answer: 3, status: 'published' }))).toContain('Une question publiée doit citer une source.')
  })
  it('vérifier un record périssable programme une revérification à 6 mois', () => {
    const q = markVerified(fromImport({ theme: 'sport', prompt: 'Record en 2026 ?', answer: 3, perishable: true, source: 'X' }))
    expect(q.verified_at).not.toBeNull()
    expect(q.review_due_at! > q.verified_at!).toBe(true)
  })
})
