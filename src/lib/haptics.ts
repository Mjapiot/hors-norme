import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from './native'
import type { Sfx } from './sound'

/*
 * Retour haptique associé à chaque effet sonore. Indépendant du bouton « son » :
 * on peut jouer en silence et garder les vibrations.
 * Natif : moteur haptique iOS/Android. Web : navigator.vibrate (Android seulement, ignoré sur iPhone).
 */
const WEB_PATTERNS: Partial<Record<Sfx, number | number[]>> = {
  tap: 8,
  go: 30,
  exact: [40, 30, 40, 30, 80],
  win: [40, 30, 80],
  bad: [80, 40, 80],
}

export function haptic(sfx: Sfx): void {
  if (!isNative) {
    const pattern = WEB_PATTERNS[sfx]
    if (pattern) navigator.vibrate?.(pattern)
    return
  }
  switch (sfx) {
    case 'tap':
    case 'tick':
      void Haptics.impact({ style: ImpactStyle.Light })
      break
    case 'go':
      void Haptics.impact({ style: ImpactStyle.Heavy })
      break
    case 'exact':
    case 'win':
    case 'good':
      void Haptics.notification({ type: NotificationType.Success })
      break
    case 'bad':
      void Haptics.notification({ type: NotificationType.Error })
      break
    case 'reveal':
      void Haptics.impact({ style: ImpactStyle.Medium })
      break
  }
}
