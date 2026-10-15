import { useState } from 'react'
import { Export } from '@phosphor-icons/react/dist/csr/Export'
import { Ico } from './Icons'
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
        <Ico icon={Export} size={18} className="share-icon" /> <span className="sr-only">Partager</span>{' '}
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
