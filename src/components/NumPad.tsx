import { formatDraft } from '../lib/format'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'] as const

interface Props {
  value: string
  /** Reçoit la touche : le parent applique applyKey via un updater fonctionnel (pas de saisie perdue). */
  onKey: (key: string) => void
  unit: string
  year?: boolean
}

export function NumPad({ value, onKey, unit, year = false }: Props) {
  return (
    <div className="numpad">
      <div className="numpad-display" aria-live="polite">
        <span className={value ? 'numpad-value' : 'numpad-value placeholder'}>{value ? formatDraft(value, year) : '?'}</span>
        {unit && <span className="numpad-unit">{unit}</span>}
      </div>
      <div className="numpad-keys">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={`key${k === '⌫' ? ' key-muted' : ''}`}
            disabled={k === ',' && year}
            aria-label={k === '⌫' ? 'Effacer' : k === ',' ? 'Virgule' : k}
            onClick={() => {
              navigator.vibrate?.(8)
              onKey(k)
            }}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
