import { useSyncExternalStore } from 'react'
import type { Question } from '../game/types'
import { load, save } from '../lib/storage'
import { fetchPublishedQuestions } from './remote'
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
}

const cached = load<Cached | null>(CACHE_KEY, null)
let bank: Question[] = cached && cached.questions.length >= MIN_REMOTE_QUESTIONS ? cached.questions : EMBEDDED
let lastSync = cached?.syncedAt ?? 0
const listeners = new Set<() => void>()

export function getQuestions(): Question[] {
  return bank
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
  bank = remote
  lastSync = Date.now()
  save(CACHE_KEY, { syncedAt: lastSync, questions: remote } satisfies Cached)
  listeners.forEach((l) => l())
  return true
}
