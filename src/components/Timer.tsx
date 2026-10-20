import { useEffect, useRef, useState } from 'react'
import { play } from '../lib/sound'

interface Props {
  /** Heure limite (horodatage) : le temps s'écoule même si l'écran est quitté ou verrouillé. */
  endAt: number
  /** Durée totale, pour la barre. */
  seconds: number
  onTimeout: () => void
}

/** Compte à rebours basé sur l'horloge réelle ; barre animée en continu, rouge sur la fin. */
export function Timer({ endAt, seconds, onTimeout }: Props) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((endAt - Date.now()) / 1000)))
  const timeoutRef = useRef(onTimeout)
  useEffect(() => {
    timeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    let fired = false
    let shown = Math.ceil((endAt - Date.now()) / 1000)
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      // Tic-tac sur les 5 dernières secondes.
      if (remaining !== shown && remaining > 0 && remaining <= 5) play('tick')
      shown = remaining
      setLeft(remaining)
      if (remaining === 0 && !fired) {
        fired = true
        window.clearInterval(id)
        play('bad')
        timeoutRef.current()
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [endAt])

  // La barre part de la fraction restante (calculée une fois, au montage) et se vide linéairement.
  const [{ remainingMs, startRatio }] = useState(() => {
    const ms = Math.max(0, endAt - Date.now())
    return { remainingMs: ms, startRatio: Math.min(1, ms / (seconds * 1000)) }
  })
  return (
    <div className={`timer${left <= 5 ? ' timer-urgent' : ''}`} role="timer" aria-label={`${left} secondes restantes`}>
      <div
        key={endAt}
        className="timer-bar"
        style={{ '--from': startRatio, animationDuration: `${remainingMs}ms` } as React.CSSProperties}
      />
      <span className="timer-text">{left}s</span>
    </div>
  )
}
