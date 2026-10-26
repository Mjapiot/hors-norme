import { useEffect, useState } from 'react'
import { PlayCircle } from '@phosphor-icons/react/dist/csr/PlayCircle'
import { THEMES } from '../game/types'
import type { PaidTheme } from '../game/types'
import { claimPending, preloadVideo, remainingVideos, unlockWithVideo } from '../lib/adUnlock'
import { packForTheme } from '../lib/packs'
import { Ico, THEME_ICONS } from './Icons'

interface Props {
  theme: PaidTheme
  /** Thème débloqué pour la prochaine partie. */
  onUnlocked: (theme: PaidTheme) => void
  onClose: () => void
}

type Step = 'idle' | 'video' | 'checking'

/** Feuille d'un thème premium verrouillé : une vidéo récompensée = une partie avec ce thème. */
export function AdUnlockSheet({ theme, onUnlocked, onClose }: Props) {
  const [remaining, setRemaining] = useState<number | null | undefined>(undefined)
  const [step, setStep] = useState<Step>('idle')
  const [message, setMessage] = useState('')
  const label = THEMES[theme].label

  useEffect(() => {
    let alive = true
    void (async () => {
      // Une vidéo déjà regardée mais validée trop tard la dernière fois : le thème est offert sans la revoir.
      if (await claimPending(theme)) {
        if (alive) onUnlocked(theme)
        return
      }
      const n = await remainingVideos()
      if (alive) setRemaining(n)
      if (n) preloadVideo(theme)
    })()
    return () => {
      alive = false
    }
  }, [theme, onUnlocked])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && step === 'idle' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, step])

  const watch = async () => {
    setMessage('')
    setStep('video')
    const outcome = await unlockWithVideo(theme, () => setStep('checking'))
    if (outcome === 'ok') return onUnlocked(theme)
    setStep('idle')
    if (outcome === 'not-watched') setMessage('Vidéo indisponible ou interrompue avant la fin. Réessaie dans un instant.')
    else setMessage('La vidéo n’est pas encore validée. Rouvre ce thème dans quelques secondes : tu n’auras pas à la revoir.')
    setRemaining(await remainingVideos())
  }

  const busy = step !== 'idle'
  const exhausted = remaining === 0
  const offline = remaining === null

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={`${label} : thème premium`} onClick={() => !busy && onClose()}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <span className="ad-unlock-icon">
          <Ico icon={THEME_ICONS[theme]} size={30} />
        </span>
        <h2>{label}</h2>
        <p className="help">{packForTheme(theme).pitch}</p>
        <p>Regarde une courte vidéo pour jouer ta prochaine partie avec ce thème.</p>
        <button type="button" className="btn btn-primary btn-icon" disabled={busy || exhausted || offline || remaining === undefined} onClick={() => void watch()}>
          <Ico icon={PlayCircle} size={22} weight="fill" />
          {step === 'video' ? 'Vidéo en cours…' : step === 'checking' ? 'Validation…' : 'Regarder une vidéo'}
        </button>
        {message && (
          <p className="warning" role="status">
            {message}
          </p>
        )}
        <p className="footnote" role="status">
          {remaining === undefined && 'Vérification…'}
          {offline && 'Connexion nécessaire pour débloquer un thème.'}
          {exhausted && 'Tu as utilisé tes 3 vidéos du jour. Reviens demain !'}
          {typeof remaining === 'number' && remaining > 0 && `Encore ${remaining} vidéo${remaining > 1 ? 's' : ''} possible${remaining > 1 ? 's' : ''} aujourd’hui.`}
        </p>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
          Plus tard
        </button>
      </div>
    </div>
  )
}
