import { useSyncExternalStore } from 'react'
import type { Question } from '../game/types'
import { load, save } from '../lib/storage'
import { fetchPackQuestions, fetchPublishedQuestions, rowToQuestion } from './remote'
import type { QuestionRow } from './remote'
// Base embarquée = dernière copie des questions publiées (npm run questions:pull).
import SNAPSHOT from './snapshot.json'

const EMBEDDED = SNAPSHOT as Question[]

/*
 * Banque de questions « hors connexion d'abord » :
 *   1. au démarrage : dernière copie synchronisée, sinon la base embarquée dans l'app (snapshot.json) ;
 *   2. en ligne : on récupère les questions publiées (au plus une fois par heure) et on les garde en cache.
 * Une correction faite dans le back-office arrive donc chez les joueurs sans republier l'app.
 */

const CACHE_KEY = 'hn:bank:v1'
const SYNC_EVERY_MS = 60 * 60 * 1000
/** En dessous, on considère la réponse comme suspecte et on garde la banque actuelle. */
export const MIN_REMOTE_QUESTIONS = 50

interface Cached {
  syncedAt: number
  questions: Question[]
  /** Base embarquée de la version qui a écrit ce cache (une mise à jour de l'app le rend « à resynchroniser »). */
  snapshot?: string
}

/** Signature de la base embarquée : change à chaque version qui ajoute ou retire des questions. */
const SNAPSHOT_ID = `${EMBEDDED.length}:${EMBEDDED.at(-1)?.id ?? ''}`

/**
 * Un thème présent dans l'app mais absent d'une copie (cache d'une ancienne version, serveur pas encore à jour)
 * reste jouable avec les questions embarquées : un nouveau thème n'est jamais « vide ».
 */
function withEmbeddedThemes(list: Question[]): Question[] {
  const themes = new Set(list.map((q) => q.theme))
  return [...list, ...EMBEDDED.filter((q) => !themes.has(q.theme))]
}

/** Relit un cache local (qui peut être abîmé ou venir d'une ancienne version) : seules les questions valides restent. */
function sanitize(list: unknown): Question[] {
  if (!Array.isArray(list)) return []
  return list.flatMap((q) => (q && typeof q === 'object' ? (rowToQuestion(q as QuestionRow) ?? []) : []))
}

const cachedRaw = load<Partial<Cached> | null>(CACHE_KEY, null)
const cachedQuestions = sanitize(cachedRaw?.questions)
const cacheUsable = cachedQuestions.length >= MIN_REMOTE_QUESTIONS
let bank: Question[] = cacheUsable ? withEmbeddedThemes(cachedQuestions) : EMBEDDED
// Cache écrit par une autre version de l'app : on le garde en attendant, mais on resynchronise dès que possible.
let lastSync = cacheUsable && cachedRaw?.snapshot === SNAPSHOT_ID && typeof cachedRaw.syncedAt === 'number' ? cachedRaw.syncedAt : 0
const listeners = new Set<() => void>()

// Questions des thèmes premium achetés (cache séparé, jouable hors ligne).
const PACK_CACHE_KEY = 'hn:bank-packs:v1'
let packBank: Question[] = sanitize(load<unknown>(PACK_CACHE_KEY, []))

// V1.3 : thèmes premium débloqués pour une seule partie par une vidéo récompensée.
const AD_CACHE_KEY = 'hn:bank-ad:v1'
const AD_KEEP_MS = 24 * 3600_000
interface AdUnlock {
  theme: string
  questions: Question[]
  until: number
}
let adUnlocks: AdUnlock[] = load<AdUnlock[]>(AD_CACHE_KEY, [])
  .filter((u) => u && typeof u.theme === 'string' && typeof u.until === 'number' && u.until > Date.now())
  .map((u) => ({ ...u, questions: sanitize(u.questions) }))
  .filter((u) => u.questions.length > 0)
const adQuestions = () => adUnlocks.flatMap((u) => u.questions)

let combined: Question[] = [...bank, ...packBank, ...adQuestions()]
const recombine = () => {
  combined = [...bank, ...packBank, ...adQuestions()]
  listeners.forEach((l) => l())
}

/** Thèmes débloqués par une vidéo et pas encore joués. */
export const adUnlockedThemes = (): string[] => adUnlocks.map((u) => u.theme)

/** Une vidéo regardée : le thème est jouable pour la prochaine partie (gardé 24 h au plus). */
export function addAdUnlock(theme: string, questions: Question[]): void {
  adUnlocks = [...adUnlocks.filter((u) => u.theme !== theme), { theme, questions, until: Date.now() + AD_KEEP_MS }]
  save(AD_CACHE_KEY, adUnlocks)
  recombine()
}

/** Au lancement d'une partie : les thèmes débloqués par une vidéo et choisis sont consommés. */
export function consumeAdUnlocks(themes: string[]): void {
  if (!adUnlocks.some((u) => themes.includes(u.theme))) return
  adUnlocks = adUnlocks.filter((u) => !themes.includes(u.theme))
  save(AD_CACHE_KEY, adUnlocks)
  recombine()
}

export function getQuestions(): Question[] {
  return combined
}

/** Nombre de questions disponibles pour un thème premium (0 tant qu'il n'est pas téléchargé). */
export const packQuestionCount = (theme: string) => packBank.filter((q) => q.theme === theme).length

/** Télécharge les questions des thèmes achetés (après un achat, une restauration ou au démarrage). */
export async function syncPackQuestions(appUserId: string | null): Promise<void> {
  if (!appUserId) return
  const res = await fetchPackQuestions(appUserId)
  if (!res) return
  packBank = res.questions
  save(PACK_CACHE_KEY, packBank)
  recombine()
}

export function bankSource(): 'remote' | 'embedded' {
  return bank === EMBEDDED ? 'embedded' : 'remote'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useQuestionBank(): Question[] {
  return useSyncExternalStore(subscribe, getQuestions)
}

/** Synchronise si nécessaire. Ne remplace jamais la banque par une réponse vide ou tronquée. */
export async function syncQuestions(force = false): Promise<boolean> {
  if (!force && Date.now() - lastSync < SYNC_EVERY_MS) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  const remote = await fetchPublishedQuestions()
  if (!remote || remote.length < MIN_REMOTE_QUESTIONS) return false
  bank = withEmbeddedThemes(remote)
  lastSync = Date.now()
  save(CACHE_KEY, { syncedAt: lastSync, questions: remote, snapshot: SNAPSHOT_ID } satisfies Cached)
  recombine()
  return true
}
