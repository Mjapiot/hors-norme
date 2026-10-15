import { useEffect, useRef, useState } from 'react'

interface Props {
  seconds: number
  onTimeout: () => void
}

/** Compte à rebours basé sur l'horloge réelle (robuste si l'onglet est mis en pause). */
export function Timer({ seconds, onTimeout }: Props) {
  const [left, setLeft] = useState(seconds)
  const timeoutRef = useRef(onTimeout)
  useEffect(() => {
    timeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    const endAt = Date.now() + seconds * 1000
    let fired = false
    const id = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
      setLeft(remaining)
      if (remaining === 0 && !fired) {
        fired = true
        window.clearInterval(id)
        navigator.vibrate?.([80, 40, 80])
        timeoutRef.current()
      }
    }, 200)
    return () => window.clearInterval(id)
  }, [seconds])

  const ratio = left / seconds
  return (
    <div className={`timer${left <= 5 ? ' timer-urgent' : ''}`} role="timer" aria-label={`${left} secondes restantes`}>
      <div className="timer-bar" style={{ transform: `scaleX(${ratio})` }} />
      <span className="timer-text">{left}s</span>
    </div>
  )
}
