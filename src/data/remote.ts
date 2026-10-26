import { THEMES, TOLERANCES } from '../game/types'
import type { Question, Theme, Tolerance } from '../game/types'

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
  tolerance?: Tolerance | null
}

const COLUMNS = 'id,theme,type,prompt,unit,answer,items,year,subject,source,perishable,difficulty,verified_at,tolerance'

export function rowToQuestion(row: QuestionRow): Question | null {
  // Thème inconnu de cette version de l'app (ajouté plus tard) : ignoré plutôt que de planter.
  if (!row || typeof row.id !== 'string' || typeof row.prompt !== 'string' || !(row.theme in THEMES)) return null
  if (![1, 2, 3].includes(row.difficulty)) return null
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
    const tolerance = row.tolerance && TOLERANCES.includes(row.tolerance) ? { tolerance: row.tolerance } : {}
    return { ...base, type: 'number', answer: row.answer, ...(row.year ? { year: true } : {}), ...tolerance }
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

/**
 * Questions des thèmes premium achetés : la fonction Edge vérifie l'achat auprès de RevenueCat
 * avant de les renvoyer (elles ne sont jamais lisibles avec la seule clé publique).
 */
export async function fetchPackQuestions(appUserId: string): Promise<{ themes: string[]; questions: Question[] } | null> {
  if (!hasRemote) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/pack-questions`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ appUserId }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { themes: string[]; questions: QuestionRow[] }
    return { themes: data.themes, questions: data.questions.map(rowToQuestion).filter((q): q is Question => q !== null) }
  } catch {
    return null
  }
}

/** Vidéos récompensées encore possibles aujourd'hui (fonction SQL `ad_unlock`). Null hors ligne. */
export async function fetchAdRemaining(deviceId: string): Promise<number | null> {
  const data = await callAdUnlock(deviceId, 'status', null)
  return typeof data?.remaining === 'number' ? data.remaining : null
}

/**
 * Consomme le droit créé par une vidéo regardée : questions du thème pour une partie.
 * `ready: false` tant que le rappel de Google n'est pas (encore) arrivé côté serveur.
 */
export async function claimAdTheme(deviceId: string, theme: string): Promise<{ ready: boolean; remaining: number; questions: Question[] } | null> {
  const data = await callAdUnlock(deviceId, 'claim', theme)
  if (!data || typeof data.ready !== 'boolean') return null
  const questions = Array.isArray(data.questions) ? (data.questions as QuestionRow[]).map(rowToQuestion).filter((q): q is Question => q !== null) : []
  return { ready: data.ready, remaining: typeof data.remaining === 'number' ? data.remaining : 0, questions }
}

async function callAdUnlock(device: string, action: 'status' | 'claim', theme: string | null): Promise<{ ready?: unknown; remaining?: unknown; questions?: unknown } | null> {
  if (!hasRemote) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ad_unlock`, {
      method: 'POST',
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_device: device, p_action: action, p_theme: theme }),
    })
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}
