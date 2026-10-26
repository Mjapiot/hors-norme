import { addAdUnlock } from '../data/bank'
import { claimAdTheme, fetchAdRemaining } from '../data/remote'
import type { PaidTheme } from '../game/types'
import { canShowAds, showRewarded } from './ads'
import { PACKS_ENABLED } from './packs'
import { load, save } from './storage'

/*
 * V1.3 : jouer une partie avec un thème premium en regardant une vidéo récompensée.
 * La vidéo n'est jamais crue sur parole par l'app : Google prévient le serveur (fonction `ad-reward`),
 * puis l'app récupère les questions auprès de `ad-unlock`, qui consomme le droit.
 */

/** Vidéos récompensées proposées à la place des achats intégrés (iOS, version avec pubs). */
export const REWARDED_ENABLED = canShowAds && !PACKS_ENABLED

const DEVICE_KEY = 'hn:device-id'

/** Identifiant anonyme et aléatoire de l'appareil (aucune donnée personnelle), transmis à AdMob pour le rappel. */
export function getDeviceId(): string {
  let id = load<string>(DEVICE_KEY, '')
  if (!/^hn-[\w-]{8,64}$/.test(id)) {
    id = `hn-${crypto.randomUUID()}`
    save(DEVICE_KEY, id)
  }
  return id
}

/** Vidéos encore possibles aujourd'hui, ou null hors ligne. */
export const remainingVideos = (): Promise<number | null> => fetchAdRemaining(getDeviceId())

export type UnlockOutcome = 'ok' | 'not-watched' | 'not-confirmed'

const CLAIM_TRIES = 10
const CLAIM_EVERY_MS = 1500
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

/**
 * Montre la vidéo puis attend la confirmation du serveur (le rappel de Google arrive en général
 * en quelques secondes). En cas de succès, le thème est jouable pour la prochaine partie.
 */
export async function unlockWithVideo(theme: PaidTheme, onWatched?: () => void): Promise<UnlockOutcome> {
  const deviceId = getDeviceId()
  if (!(await showRewarded(deviceId, theme))) return 'not-watched'
  onWatched?.()
  for (let i = 0; i < CLAIM_TRIES; i++) {
    const res = await claimAdTheme(deviceId, theme)
    if (res?.ready && res.questions.length > 0) {
      addAdUnlock(theme, res.questions)
      return 'ok'
    }
    await wait(CLAIM_EVERY_MS)
  }
  return 'not-confirmed'
}

/** Vidéo déjà regardée mais validée après coup : on récupère le thème sans la revoir. */
export async function claimPending(theme: PaidTheme): Promise<boolean> {
  const res = await claimAdTheme(getDeviceId(), theme)
  if (!res?.ready || res.questions.length === 0) return false
  addAdUnlock(theme, res.questions)
  return true
}
