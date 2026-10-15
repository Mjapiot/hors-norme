import type { Question, Theme } from '../game/types'

/*
 * Accès Supabase côté joueurs : un simple GET sur l'API REST (PostgREST), sans SDK,
 * pour garder l'app légère. Les règles RLS ne renvoient que les questions publiées
 * des packs publiés et gratuits.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const hasRemote = Boolean(SUPABASE_URL && SUPABASE_KEY)

/** Ligne de la table public.questions (colonnes utiles au jeu). */
export interface QuestionRow {
  id: string
  theme: Theme
  type: 'number' | 'ranking'
  prompt: string
  unit: string
  answer: number | null
  items: { label: string; value: number }[] | null
  year: boolean
  subject: string | null
  source: string
  perishable: boolean
  difficulty: 1 | 2 | 3
  verified_at: string | null
}

const COLUMNS = 'id,theme,type,prompt,unit,answer,items,year,subject,source,perishable,difficulty,verified_at'

export function rowToQuestion(row: QuestionRow): Question | null {
  const base = {
    id: row.id,
    theme: row.theme,
    prompt: row.prompt,
    unit: row.unit ?? '',
    source: row.source ?? '',
    perishable: row.perishable,
    difficulty: row.difficulty,
    verified_at: row.verified_at,
    ...(row.subject ? { subject: row.subject } : {}),
  }
  if (row.type === 'number') {
    if (typeof row.answer !== 'number' || !Number.isFinite(row.answer)) return null
    return { ...base, type: 'number', answer: row.answer, ...(row.year ? { year: true } : {}) }
  }
  if (!Array.isArray(row.items) || row.items.length !== 4) return null
  if (!row.items.every((it) => typeof it?.label === 'string' && typeof it?.value === 'number')) return null
  return { ...base, type: 'ranking', items: row.items }
}

/** Questions publiées, ou null si indisponible (hors ligne, pas configuré, erreur). */
export async function fetchPublishedQuestions(signal?: AbortSignal): Promise<Question[] | null> {
  if (!hasRemote) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=${COLUMNS}&status=eq.published&order=id`, {
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal,
    })
    if (!res.ok) return null
    const rows = (await res.json()) as QuestionRow[]
    return rows.map(rowToQuestion).filter((q): q is Question => q !== null)
  } catch {
    return null
  }
}
