import { useState } from 'react'
import { KEYS, load, save } from '../lib/storage'

function isIos(): boolean {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

/** Safari iOS n'affiche pas d'invite d'installation : on explique le geste. */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => load(KEYS.installHint, false) || !isIos() || isStandalone())
  if (hidden) return null
  return (
    <div className="install-hint" role="note">
      <p>
        <strong>Installe Hors Norme</strong> : touche{' '}
        <svg className="share-icon" viewBox="0 0 24 24" aria-label="Partager" role="img">
          <path d="M12 3v12M7 8l5-5 5 5M5 12v8h14v-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>{' '}
        puis « Sur l’écran d’accueil ». Ça marche même sans réseau.
      </p>
      <button
        type="button"
        className="link"
        onClick={() => {
          save(KEYS.installHint, true)
          setHidden(true)
        }}
      >
        OK
      </button>
    </div>
  )
}
