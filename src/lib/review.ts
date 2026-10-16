import { InAppReview } from '@capacitor-community/in-app-review'
import { isNative } from './native'
import { load, save } from './storage'

const KEY = 'hn:games-finished'
/** On ne demande une note qu'après quelques parties réussies (iOS limite de toute façon à 3 demandes par an). */
const ASK_AFTER = [2, 6]

export function onGameFinished(): void {
  const count = load(KEY, 0) + 1
  save(KEY, count)
  if (isNative && ASK_AFTER.includes(count)) {
    // Laisse le temps au podium et aux confettis.
    window.setTimeout(() => void InAppReview.requestReview().catch(() => undefined), 3500)
  }
}
