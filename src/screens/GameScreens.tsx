import { useCallback, useState } from 'react'
import type { CSSProperties } from 'react'
import { NumPad } from '../components/NumPad'
import { Timer } from '../components/Timer'
import { applyKey, colorFor, formatNumber, frenchSpacing, parseDraft } from '../lib/format'
import { ROUND_LABELS, THEMES } from '../game/types'
import type { Answer, GameState, Round } from '../game/types'

export const CHRONO_SECONDS = 30

export function GameHeader({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const { end } = state.config
  const progress =
    end.type === 'rounds' ? `Question ${state.index + 1}/${state.rounds.length}` : `Manche ${state.index + 1} · 🎯 ${end.points} pts`
  return (
    <header className="topbar game-topbar">
      <span className="progress">{progress}</span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Quitter la partie"
        onClick={() => {
          if (window.confirm('Quitter la partie en cours ?')) onQuit()
        }}
      >
        ✕
      </button>
    </header>
  )
}

function QuestionCard({ round }: { round: Round }) {
  const theme = THEMES[round.question.theme]
  return (
    <div className="question-card">
      <div className="question-meta">
        <span className={`badge badge-${round.kind}`}>{ROUND_LABELS[round.kind]}</span>
        <span className="theme">
          {theme.emoji} {theme.label}
        </span>
      </div>
      <p className="question-prompt">{frenchSpacing(round.question.prompt)}</p>
      {round.kind === 'higherlower' && (
        <p className="question-sub">
          Plus ou moins de <strong>{formatNumber(round.threshold)} {round.question.unit}</strong> ?
        </p>
      )}
      {round.kind !== 'higherlower' && round.question.unit && <p className="question-unit">Réponse en {round.question.unit}</p>}
    </div>
  )
}

const KIND_HELP: Record<Round['kind'], string> = {
  classic: 'Chacun tape son estimation en secret. Le plus proche gagne !',
  chrono: `Attention : seulement ${CHRONO_SECONDS} secondes pour répondre une fois le téléphone en main !`,
  higherlower: 'Plus ou moins ? 2 points pour chaque bonne réponse.',
  ranking: '1 point par élément bien placé, +2 si tout est parfait.',
}

export function QuestionScreen({ state, onGo }: { state: GameState; onGo: () => void }) {
  const round = state.rounds[state.index]
  return (
    <main className="screen question">
      <QuestionCard round={round} />
      <p className="help">{KIND_HELP[round.kind]}</p>
      <div className="sticky-cta">
        <button type="button" className="btn btn-primary" onClick={onGo}>
          À vos réponses !
        </button>
      </div>
    </main>
  )
}

export function HandoffScreen({ state, onReady }: { state: GameState; onReady: () => void }) {
  const name = state.config.names[state.turn]
  const color = colorFor(state.turn)
  return (
    <main className="screen handoff" style={{ '--team': color } as CSSProperties}>
      <p className="eyebrow">
        {state.turn + 1}/{state.config.names.length} · Passe le téléphone à
      </p>
      <h2 className="handoff-name">{name}</h2>
      <p className="help">Les autres, on ne regarde pas&nbsp;! 🙈</p>
      <button type="button" className="btn btn-team" onClick={onReady}>
        {state.config.mode === 'teams' ? 'C’est nous, on est prêts\u00a0!' : 'C’est moi, je suis prêt·e\u00a0!'}
      </button>
    </main>
  )
}

export function InputScreen({ state, onSubmit }: { state: GameState; onSubmit: (a: Answer) => void }) {
  const round = state.rounds[state.index]
  const color = colorFor(state.turn)
  return (
    <main className="screen input" style={{ '--team': color } as CSSProperties}>
      <p className="input-who">
        <span className="dot" style={{ background: color }} /> {state.config.names[state.turn]}
      </p>
      <QuestionCompact round={round} />
      {/* key = turn : saisie remise à zéro pour chaque joueur */}
      {(round.kind === 'classic' || round.kind === 'chrono') && <NumberInput key={state.turn} round={round} onSubmit={onSubmit} />}
      {round.kind === 'higherlower' && <HigherLowerInput key={state.turn} round={round} onSubmit={onSubmit} />}
      {round.kind === 'ranking' && <RankingInput key={state.turn} round={round} onSubmit={onSubmit} />}
    </main>
  )
}

function QuestionCompact({ round }: { round: Round }) {
  return <p className="question-compact">{frenchSpacing(round.question.prompt)}</p>
}

function NumberInput({ round, onSubmit }: { round: Extract<Round, { kind: 'classic' | 'chrono' }>; onSubmit: (a: Answer) => void }) {
  const [draft, setDraft] = useState('')
  const value = parseDraft(draft)
  const year = round.question.year ?? false
  const submit = useCallback(() => onSubmit({ kind: 'number', value: parseDraft(draft) }), [draft, onSubmit])

  return (
    <>
      {round.kind === 'chrono' && <Timer seconds={CHRONO_SECONDS} onTimeout={submit} />}
      <NumPad value={draft} onKey={(k) => setDraft((d) => applyKey(d, k, year))} unit={round.question.unit} year={year} />
      <button type="button" className="btn btn-team" disabled={value === null} onClick={submit}>
        Valider
      </button>
    </>
  )
}

function HigherLowerInput({ round, onSubmit }: { round: Extract<Round, { kind: 'higherlower' }>; onSubmit: (a: Answer) => void }) {
  return (
    <div className="hl">
      <p className="hl-threshold">
        {formatNumber(round.threshold)} <small>{round.question.unit}</small>
      </p>
      <div className="hl-buttons">
        <button type="button" className="btn btn-hl" onClick={() => onSubmit({ kind: 'higherlower', choice: 'plus' })}>
          ⬆︎ Plus
        </button>
        <button type="button" className="btn btn-hl" onClick={() => onSubmit({ kind: 'higherlower', choice: 'moins' })}>
          ⬇︎ Moins
        </button>
      </div>
    </div>
  )
}

function RankingInput({ round, onSubmit }: { round: Extract<Round, { kind: 'ranking' }>; onSubmit: (a: Answer) => void }) {
  const [picked, setPicked] = useState<number[]>([])
  const items = round.question.items
  const toggle = (idx: number) => setPicked((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]))
  return (
    <div className="ranking">
      <p className="help">Touche les éléments dans l’ordre, du plus petit au plus grand.</p>
      <ul className="ranking-list">
        {round.order.map((idx) => {
          const pos = picked.indexOf(idx)
          return (
            <li key={idx}>
              <button type="button" className={`ranking-item${pos >= 0 ? ' picked' : ''}`} onClick={() => toggle(idx)}>
                <span className="ranking-pos">{pos >= 0 ? pos + 1 : ''}</span>
                {items[idx].label}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="row">
        <button type="button" className="btn btn-ghost" disabled={picked.length === 0} onClick={() => setPicked([])}>
          Effacer
        </button>
        <button type="button" className="btn btn-team" disabled={picked.length !== items.length} onClick={() => onSubmit({ kind: 'ranking', order: picked })}>
          Valider
        </button>
      </div>
    </div>
  )
}
