import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown'
import { ArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp'
import { EyeSlash } from '@phosphor-icons/react/dist/csr/EyeSlash'
import { Flag } from '@phosphor-icons/react/dist/csr/Flag'
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning'
import { Sword } from '@phosphor-icons/react/dist/csr/Sword'
import { X } from '@phosphor-icons/react/dist/csr/X'
import { Ico, ROUND_ICONS, THEME_ICONS } from '../components/Icons'
import { NumPad } from '../components/NumPad'
import { Timer } from '../components/Timer'
import { applyKey, colorFor, formatNumber, frenchSpacing, parseDraft } from '../lib/format'
import { ROUND_LABELS, THEMES } from '../game/types'
import type { Answer, GameState, Round } from '../game/types'
import { currentDuel, isDoubleRound } from '../game/engine'
import { higherLowerAnswer } from '../game/scoring'

export const CHRONO_SECONDS = 30

export function GameHeader({ state, onQuit }: { state: GameState; onQuit: () => void }) {
  const { end } = state.config
  return (
    <header className="topbar game-topbar">
      <span className="progress">
        {end.type === 'rounds' ? (
          `Question ${state.index + 1}/${state.rounds.length}`
        ) : (
          <>
            Manche {state.index + 1} · <Ico icon={Flag} size={16} /> {end.points} pts
          </>
        )}
      </span>
      <button
        type="button"
        className="icon-btn"
        aria-label="Quitter la partie"
        onClick={() => {
          if (window.confirm('Quitter la partie en cours ?')) onQuit()
        }}
      >
        <Ico icon={X} size={20} />
      </button>
    </header>
  )
}

function QuestionCard({ round, double }: { round: Round; double: boolean }) {
  const theme = THEMES[round.question.theme]
  return (
    <div className="question-card">
      <div className="question-meta">
        <span className={`badge badge-${round.kind}`}>
          <Ico icon={ROUND_ICONS[round.kind]} size={15} />
          {ROUND_LABELS[round.kind]}
        </span>
        <span className="theme">
          <Ico icon={THEME_ICONS[round.question.theme]} size={16} />
          {theme.label}
        </span>
      </div>
      {double && (
        <p className="double-banner">
          <Ico icon={Lightning} size={18} weight="fill" /> Dernière question : points doublés
        </p>
      )}
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
  classic: 'Chacun tape son estimation en secret. Plus on est précis, plus on marque.',
  chrono: `Attention : seulement ${CHRONO_SECONDS} secondes pour répondre une fois le téléphone en main !`,
  higherlower: 'Plus ou moins ? 1 point pour chaque bonne réponse.',
  ranking: '3 points si tout est bien classé, 1 point si 2 éléments sont bien placés.',
}

export function QuestionScreen({ state, onGo }: { state: GameState; onGo: () => void }) {
  const round = state.rounds[state.index]
  return (
    <main className="screen question">
      <QuestionCard round={round} double={isDoubleRound(state)} />
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
      <p className="help help-icon">
        <Ico icon={EyeSlash} size={18} /> Les autres, on ne regarde pas&nbsp;!
      </p>
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
          <Ico icon={ArrowUp} size={28} /> Plus
        </button>
        <button type="button" className="btn btn-hl" onClick={() => onSubmit({ kind: 'higherlower', choice: 'moins' })}>
          <Ico icon={ArrowDown} size={28} /> Moins
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

const DUEL_COUNTDOWN = 3

/**
 * Duel de rapidité sur l'écran partagé : les ex-æquo répondent en même temps,
 * le premier à toucher la bonne réponse gagne le point de la manche ; une erreur élimine.
 */
export function DuelScreen({ state, onResolve }: { state: GameState; onResolve: (winner: number | null) => void }) {
  const duel = currentDuel(state)
  const tied = state.results[state.results.length - 1]?.duel?.tied ?? []
  const [stage, setStage] = useState<'ready' | 'countdown' | 'go' | 'done'>('ready')
  const [count, setCount] = useState(DUEL_COUNTDOWN)
  const [out, setOut] = useState<number[]>([])
  const [winner, setWinner] = useState<number | null>(null)

  useEffect(() => {
    if (stage !== 'countdown') return
    const id = window.setTimeout(() => (count <= 1 ? setStage('go') : setCount(count - 1)), 700)
    return () => window.clearTimeout(id)
  }, [stage, count])

  if (!duel) {
    return (
      <main className="screen duel">
        <button type="button" className="btn btn-primary" onClick={() => onResolve(null)}>
          Continuer
        </button>
      </main>
    )
  }

  const good = higherLowerAnswer(duel.question.answer, duel.threshold)
  const tap = (team: number, choice: 'plus' | 'moins') => {
    if (stage !== 'go' || out.includes(team)) return
    if (choice === good) {
      navigator.vibrate?.([40, 30, 40])
      setWinner(team)
      setStage('done')
      return
    }
    const nextOut = [...out, team]
    setOut(nextOut)
    if (nextOut.length === tied.length) setStage('done')
  }
  const names = tied.map((i) => state.config.names[i])

  return (
    <main className="screen duel">
      <p className="eyebrow eyebrow-icon">
        <Ico icon={Sword} size={16} /> Duel de rapidité
      </p>
      <p className="help">
        Égalité entre {names.join(' et ')}. Le premier qui trouve gagne le point de la manche, une erreur élimine.
      </p>
      <p className="question-prompt duel-prompt">{frenchSpacing(duel.question.prompt)}</p>
      <p className="question-sub">
        Plus ou moins de <strong>{formatNumber(duel.threshold)} {duel.question.unit}</strong>&nbsp;?
      </p>

      {stage === 'ready' && (
        <button type="button" className="btn btn-primary" onClick={() => setStage('countdown')}>
          Lancer le duel
        </button>
      )}
      {stage === 'countdown' && <p key={count} className="duel-countdown">{count}</p>}

      {(stage === 'go' || stage === 'done') && (
        <div className="duel-rows">
          {tied.map((team) => {
            const color = colorFor(team)
            const eliminated = out.includes(team)
            return (
              <div key={team} className={`duel-row${eliminated ? ' out' : ''}${winner === team ? ' won' : ''}`} style={{ '--team': color } as CSSProperties}>
                <span className="duel-name">{state.config.names[team]}</span>
                <div className="duel-buttons">
                  <button type="button" className="btn btn-hl" disabled={stage === 'done' || eliminated} onPointerDown={() => tap(team, 'plus')}>
                    <Ico icon={ArrowUp} size={24} /> Plus
                  </button>
                  <button type="button" className="btn btn-hl" disabled={stage === 'done' || eliminated} onPointerDown={() => tap(team, 'moins')}>
                    <Ico icon={ArrowDown} size={24} /> Moins
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {stage === 'done' && (
        <>
          <p className="verdict">
            Réponse : <strong>{formatNumber(duel.question.answer)} {duel.question.unit}</strong>, donc {good === 'plus' ? 'PLUS' : 'MOINS'}.
            <br />
            {winner === null ? 'Personne ne remporte le point.' : `${state.config.names[winner]} remporte le point de la manche !`}
          </p>
          <div className="sticky-cta">
            <button type="button" className="btn btn-primary" onClick={() => onResolve(winner)}>
              Continuer
            </button>
          </div>
        </>
      )}
    </main>
  )
}
