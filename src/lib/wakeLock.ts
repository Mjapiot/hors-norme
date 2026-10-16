import { useEffect } from 'react'
import { KeepAwake } from '@capacitor-community/keep-awake'
import { isNative } from './native'

/**
 * Garde l'écran allumé pendant une partie : plugin natif dans l'app, Wake Lock API sur le web (Safari iOS 16.4+, Chrome).
 * Le verrou saute quand l'app passe en arrière-plan : on le reprend au retour.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active) return
    if (isNative) {
      void KeepAwake.keepAwake()
      return () => void KeepAwake.allowSleep()
    }
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false
    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) void s.release()
        else sentinel = s
      } catch {
        /* refusé (économie d'énergie…) : sans gravité */
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire()
    }
    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release()
    }
  }, [active])
}
