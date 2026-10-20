import { Backspace } from '@phosphor-icons/react/dist/csr/Backspace'
import { formatDraft } from '../lib/format'
import { Ico } from './Icons'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'] as const

interface Props {
  value: string
  /** Reçoit la touche : le parent applique applyKey via un updater fonctionnel (pas de saisie perdue). */
  onKey: (key: string) => void
  unit: string
  year?: boolean
  /** false : l'affichage de la saisie est géré par le parent (Fourchette : deux champs). */
  display?: boolean
}

export function NumPad({ value, onKey, unit, year = false, display = true }: Props) {
  return (
    <div className="numpad">
      {display && (
        <div className="numpad-display" aria-live="polite" aria-label="Ta réponse">
          <span className={value ? 'numpad-value' : 'numpad-value placeholder'}>{value ? formatDraft(value, year) : '?'}</span>
          {unit && <span className="numpad-unit">{unit}</span>}
        </div>
      )}
      <div className="numpad-keys">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={`key${k === '⌫' ? ' key-muted' : ''}`}
            disabled={k === ',' && year}
            aria-label={k === '⌫' ? 'Effacer' : k === ',' ? 'Virgule' : k}
            onClick={() => onKey(k)}
          >
            {k === '⌫' ? <Ico icon={Backspace} size={28} /> : k}
          </button>
        ))}
      </div>
    </div>
  )
}
