import type { Question, Theme } from '../game/types'

/*
 * Accès Supabase côté joueurs : un simple GET sur l'API REST (PostgREST), sans SDK,
 * pour garder l'app légère. Les règles RLS ne renvoient que les questions publiées
 * des packs publiés et gratuits.
 */

// import.meta.env n'existe que sous Vite : ce module est aussi utilisé par des scripts Node (questions:pull).
// Les expressions exactes `import.meta.env.VITE_…` doivent rester telles quelles : vite.config.ts les remplace au build.
const underVite = typeof import.meta.env !== 'undefined'
export const SUPABASE_URL: string | undefined = underVite ? import.meta.env.VITE_SUPABASE_URL : undefined
export const SUPABASE_KEY: string | undefined = underVite ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined
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
