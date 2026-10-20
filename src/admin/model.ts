import { TOLERANCES } from '../game/types'
import type { Theme, Tolerance } from '../game/types'

export type Status = 'draft' | 'review' | 'published' | 'archived'

export const STATUS_LABELS: Record<Status, string> = {
  draft: 'Brouillon',
  review: 'À relire',
  published: 'Publiée',
  archived: 'Archivée',
}

/** Ligne complète de public.questions telle que vue par un admin. */
export interface AdminQuestion {
  id: string
  pack_id: string
  theme: Theme
  type: 'number' | 'ranking'
  prompt: string
  unit: string
  answer: number | null
  items: { label: string; value: number }[] | null
  year: boolean
  /** Façon de juger l'écart (null = automatique, déduit de l'unité). */
  tolerance: Tolerance | null
  subject: string | null
  source: string
  source_url: string | null
  perishable: boolean
  difficulty: 1 | 2 | 3
  status: Status
  verified_at: string | null
  review_due_at: string | null
  notes: string
  updated_at?: string
}

export const today = () => new Date().toISOString().slice(0, 10)

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/** Record « périssable » : on prévoit une revérification dans 6 mois. */
export const REVIEW_MONTHS = 6

export function markVerified(q: AdminQuestion): AdminQuestion {
  const d = today()
  return { ...q, verified_at: d, review_due_at: q.perishable ? addMonths(d, REVIEW_MONTHS) : null }
}

export const isDue = (q: AdminQuestion) => q.review_due_at !== null && q.review_due_at <= today()

export function newId(theme: Theme): string {
  return `${theme}-${Math.random().toString(36).slice(2, 8)}`
}

export function blankQuestion(theme: Theme = 'insolite'): AdminQuestion {
  return {
    id: newId(theme),
    pack_id: 'classique',
    theme,
    type: 'number',
    prompt: '',
    unit: '',
    answer: 0,
    items: null,
    year: false,
    tolerance: null,
    subject: null,
    source: '',
    source_url: null,
    perishable: false,
    difficulty: 2,
    status: 'draft',
    verified_at: null,
    review_due_at: null,
    notes: '',
  }
}

/** Contrôles avant enregistrement (miroir des contraintes SQL). Renvoie la liste des problèmes. */
export function validate(q: AdminQuestion): string[] {
  const errors: string[] = []
  if (!/^[a-z0-9-]+$/.test(q.id)) errors.push('Identifiant : minuscules, chiffres et tirets uniquement.')
  if (q.prompt.trim().length < 10) errors.push('Énoncé trop court.')
  if (q.type === 'number' && (q.answer === null || !Number.isFinite(q.answer))) errors.push('Réponse chiffrée manquante.')
  if (q.type === 'ranking') {
    const items = q.items ?? []
    if (items.length !== 4 || items.some((it) => !it.label.trim() || !Number.isFinite(it.value))) {
      errors.push('Classement : 4 éléments avec un libellé et une valeur.')
    } else if (new Set(items.map((it) => it.value)).size !== 4) {
      errors.push('Classement : les 4 valeurs doivent être différentes.')
    }
  }
  if (q.status === 'published' && !q.source.trim()) errors.push('Une question publiée doit citer une source.')
  return errors
}

/** Normalise un objet importé (format questions.ts ou ligne SQL) en AdminQuestion. */
export function fromImport(raw: Record<string, unknown>, fallbackStatus: Status = 'review'): AdminQuestion {
  const theme = (raw.theme as Theme) ?? 'insolite'
  const type = raw.type === 'ranking' || Array.isArray(raw.items) ? 'ranking' : 'number'
  return {
    ...blankQuestion(theme),
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(theme),
    pack_id: typeof raw.pack_id === 'string' ? raw.pack_id : 'classique',
    type,
    prompt: String(raw.prompt ?? ''),
    unit: String(raw.unit ?? ''),
    answer: type === 'number' ? Number(raw.answer) : null,
    items: type === 'ranking' ? (raw.items as AdminQuestion['items']) : null,
    year: raw.year === true,
    tolerance: TOLERANCES.includes(raw.tolerance as Tolerance) ? (raw.tolerance as Tolerance) : null,
    subject: typeof raw.subject === 'string' ? raw.subject : null,
    source: String(raw.source ?? ''),
    source_url: typeof raw.source_url === 'string' ? raw.source_url : null,
    perishable: raw.perishable === true,
    difficulty: ([1, 2, 3].includes(Number(raw.difficulty)) ? Number(raw.difficulty) : 2) as 1 | 2 | 3,
    status: (['draft', 'review', 'published', 'archived'].includes(String(raw.status)) ? raw.status : fallbackStatus) as Status,
    verified_at: typeof raw.verified_at === 'string' ? raw.verified_at : null,
    review_due_at: typeof raw.review_due_at === 'string' ? raw.review_due_at : null,
    notes: String(raw.notes ?? ''),
  }
}
