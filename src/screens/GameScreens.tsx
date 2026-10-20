import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowDown } from '@phosphor-icons/react/dist/csr/ArrowDown'
import { ArrowUp } from '@phosphor-icons/react/dist/csr/ArrowUp'
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { EyeSlash } from '@phosphor-icons/react/dist/csr/EyeSlash'
import { HourglassLow } from '@phosphor-icons/react/dist/csr/HourglassLow'
import { Pause } from '@phosphor-icons/react/dist/csr/Pause'
import { SignOut } from '@phosphor-icons/react/dist/csr/SignOut'
import { Flag } from '@phosphor-icons/react/dist/csr/Flag'
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning'
import { Sword } from '@phosphor-icons/react/dist/csr/Sword'
import { X } from '@phosphor-icons/react/dist/csr/X'
import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise'
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope'
import { LockKey } from '@phosphor-icons/react/dist/csr/LockKey'
import { SpeakerHigh } from '@phosphor-icons/react/dist/csr/SpeakerHigh'
import { SpeakerSlash } from '@phosphor-icons/react/dist/csr/SpeakerSlash'
import { Ico, ROUND_ICONS, THEME_ICONS } from '../components/Icons'
import { NumPad } from '../components/NumPad'
import { Timer } from '../components/Timer'
import { applyKey, colorFor, formatDraft, formatNumber, frenchSpacing, ofName, parseDraft } from '../lib/format'
import { ROUND_LABELS, THEMES } from '../game/types'
import type { Answer, GameState, NumberQuestion, Round } from '../game/types'
import { CHRONO_SECONDS, canUndo, currentDuel, isDoubleRound, participantAt } from '../game/engine'
import { isSoundOn, play, setSoundOn, unlockAudio } from '../lib/sound'
import { duelWinners, gapLabel } from '../game/scoring'

/** Temps de réponse de chaque ex æquo au duel éclair. */
export const DUEL_SECONDS = 10
/** Une équipe est « à balle de match » à moins de ce nombre de points de l'objectif (≈ une manche réussie). */
export const MATCH_POINT_GAP = 4

function SoundToggle() {
  const [on, setOn] = useState(isSoundOn())
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={on ? 'Couper le son' : 'Activer le son'}
      aria-pressed={on}
      onClick={() => {
        setSoundOn(!on)
        setOn(!on)
      }}
    >
      <Ico icon={on ? SpeakerHigh : SpeakerSlash} size={20} />
    </button>
  )
}

export function GameHeader({ state, onQuit, onHelp }: { state: GameState; onQuit: () => void; onHelp: () => void }) {
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
      <span className="topbar-actions">
        <button type="button" className="icon-btn" aria-label="Rappel des règles" onClick={onHelp}>
          <Ico icon={Question} size={20} />
        </button>
        <SoundToggle />
        <button type="button" className="icon-btn" aria-label="Quitter la partie" onClick={onQuit}>
          <Ico icon={X} size={20} />
        </button>
      </span>
    </header>
  )
}

/** Scores toujours visibles pendant la question. */
export function ScoreStrip({ state }: { state: GameState }) {
  const best = Math.max(...state.scores)
  return (
    <ul className="score-strip" aria-label="Scores">
      {state.config.names.map((name, i) => (
        <li key={i} className={state.scores[i] === best && best > 0 ? 'leader' : ''} style={{ '--team': colorFor(i) } as CSSProperties}>
          <span className="dot" />
          <span className="score-strip-name">{name}</span>
          <strong>{state.scores[i]}</strong>
        </li>
      ))}
    </ul>
  )
}

function QuestionCard({ round, double }: { round: Round; double: boolean }) {
  const theme = THEMES[round.question.theme]
  const secret = round.kind === 'chrono'
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
      {secret ? (
        <div className="secret">
          <Ico icon={LockKey} size={40} weight="duotone" />
          <p className="question-prompt">Question secrète</p>
          <p className="question-sub">Elle s’affiche quand tu as le téléphone en main&nbsp;: {CHRONO_SECONDS} secondes pour répondre.</p>
        </div>
      ) : (
        <>
          <p className="question-prompt">{frenchSpacing(round.question.prompt)}</p>
          {round.kind === 'higherlower' && (
            <p className="question-sub">
              Plus ou moins de <strong>{formatNumber(round.threshold)} {round.question.unit}</strong>&nbsp;?
            </p>
          )}
          {round.kind === 'range' && <p className="question-sub">Donne un minimum et un maximum&nbsp;: plus la fourchette est serrée, plus elle rapporte.</p>}
          {round.kind !== 'higherlower' && round.question.unit && <p className="question-unit">Réponse en {round.question.unit}</p>}
        </>
      )}
    </div>
  )
}

const KIND_HELP: Record<Round['kind'], string> = {
  classic: 'Chacun tape son estimation en secret. Plus on est précis, plus on marque.',
  chrono: 'Pas de triche : personne ne voit la question avant son tour.',
  higherlower: 'Plus ou moins ? 1 point pour chaque bonne réponse.',
  ranking: '3 points si tout est bien classé, 1 point si 2 éléments sont bien placés.',
  range: 'Si la réponse est dans ta fourchette : 3 points si elle est serrée, 2 ou 1 point si elle est plus large, +1 pour la plus serrée.',
}

function MatchPoint({ state }: { state: GameState }) {
  const { end } = state.config
  if (end.type !== 'target') return null
  const close = state.config.names.filter((_, i) => state.scores[i] < end.points && end.points - state.scores[i] <= MATCH_POINT_GAP)
  if (close.length === 0) return null
  return (
    <p className="match-point">
      <Ico icon={Flag} size={18} weight="fill" /> Balle de match pour {close.join(', ')}
    </p>
  )
}

export function QuestionScreen({ state, onGo }: { state: GameState; onGo: () => void }) {
  const round = state.rounds[state.index]
  return (
    <main className="screen question">
      <ScoreStrip state={state} />
      <MatchPoint state={state} />
      <QuestionCard round={round} double={isDoubleRound(state)} />
      <p className="help">{KIND_HELP[round.kind]}</p>
      <div className="sticky-cta">
        <button type="button" className="btn btn-primary" onClick={onGo}>
          À vos réponses&nbsp;!
        </button>
      </div>
    </main>
  )
}

function UndoLink({ state, onUndo }: { state: GameState; onUndo: () => void }) {
  if (!canUndo(state)) return null
  const prev = state.config.names[participantAt(state, state.turn - 1)]
  return (
    <button type="button" className="link link-icon" onClick={onUndo}>
      <Ico icon={ArrowCounterClockwise} size={16} /> Corriger la réponse {ofName(prev)}
    </button>
  )
}

export function HandoffScreen({ state, onReady, onUndo }: { state: GameState; onReady: () => void; onUndo: () => void }) {
  const who = participantAt(state, state.turn)
  const color = colorFor(who)
  const prev = state.turn > 0 ? state.config.names[participantAt(state, state.turn - 1)] : null
  return (
    <main className="screen handoff" style={{ '--team': color } as CSSProperties}>
      {prev && (
        <p className="handoff-done">
          <Ico icon={CheckCircle} size={18} weight="fill" /> Réponse {ofName(prev)} enregistrée
        </p>
      )}
      <p className="eyebrow">
        {state.turn + 1}/{state.config.names.length} · Passe le téléphone à
      </p>
      <h2 className="handoff-name">{state.config.names[who]}</h2>
      <p className="help help-icon">
        <Ico icon={EyeSlash} size={18} /> Les autres, on ne regarde pas&nbsp;!
      </p>
      <button type="button" className="btn btn-team" onClick={onReady}>
        {state.config.mode === 'teams' ? 'C’est nous, on est prêts\u00a0!' : 'C’est moi, c’est parti\u00a0!'}
      </button>
      <UndoLink state={state} onUndo={onUndo} />
    </main>
  )
}

/** Toutes les réponses sont saisies : dernière chance de corriger, puis révélation. */
export function AllInScreen({ state, onReveal, onUndo }: { state: GameState; onReveal: () => void; onUndo: () => void }) {
  return (
    <main className="screen handoff allin">
      <Ico icon={Envelope} size={56} weight="duotone" className="allin-icon" />
      <h2 className="end-title">Toutes les réponses sont là</h2>
      {state.turn > 0 && (
        <p className="handoff-done">
          <Ico icon={CheckCircle} size={18} weight="fill" /> Réponse {ofName(state.config.names[participantAt(state, state.turn - 1)])} enregistrée
        </p>
      )}
      <p className="help">Posez le téléphone au milieu de la table…</p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => {
          unlockAudio()
          onReveal()
        }}
      >
        Révéler&nbsp;!
      </button>
      <UndoLink state={state} onUndo={onUndo} />
    </main>
  )
}

export function InputScreen({ state, onSubmit }: { state: GameState; onSubmit: (a: Answer) => void }) {
  const round = state.rounds[state.index]
  const who = participantAt(state, state.turn)
  const color = colorFor(who)
  return (
    <main className="screen input" style={{ '--team': color } as CSSProperties}>
      <p className="input-who">
        <span className="dot" style={{ background: color }} /> {state.config.names[who]}
      </p>
      <p className={`question-compact${round.kind === 'chrono' ? ' question-secret-revealed' : ''}`}>{frenchSpacing(round.question.prompt)}</p>
      {/* key = turn : saisie remise à zéro pour chaque joueur */}
      {round.kind === 'classic' && <NumberInput key={state.turn} question={round.question} onSubmit={onSubmit} />}
      {round.kind === 'chrono' && <ChronoInput key={state.turn} question={round.question} deadline={state.deadline ?? null} onSubmit={onSubmit} />}
      {round.kind === 'higherlower' && <HigherLowerInput key={state.turn} round={round} onSubmit={onSubmit} />}
      {round.kind === 'ranking' && <RankingInput key={state.turn} round={round} onSubmit={onSubmit} />}
      {round.kind === 'range' && <RangeInput key={state.turn} question={round.question} onSubmit={onSubmit} />}
    </main>
  )
}

interface NumberInputProps {
  question: NumberQuestion
  onSubmit: (a: Answer) => void
  /** Chrono : heure limite (le temps s'écoule même hors de l'écran). */
  endAt?: number
  seconds?: number
}

function NumberInput({ question, onSubmit, endAt, seconds = CHRONO_SECONDS }: NumberInputProps) {
  const [draft, setDraft] = useState('')
  const value = parseDraft(draft)
  const year = question.year ?? false
  const submit = useCallback(() => onSubmit({ kind: 'number', value: parseDraft(draft) }), [draft, onSubmit])

  return (
    <>
      {endAt !== undefined && <Timer endAt={endAt} seconds={seconds} onTimeout={submit} />}
      <NumPad
        value={draft}
        onKey={(k) => {
          play('tap')
          setDraft((d) => applyKey(d, k, year))
        }}
        unit={question.unit}
        year={year}
      />
      <button type="button" className="btn btn-team" disabled={value === null} onClick={submit}>
        Valider
      </button>
    </>
  )
}

/** Chrono : si le temps s'est écoulé pendant une absence (écran quitté ou verrouillé), on le dit avant de passer. */
function ChronoInput({ question, deadline, onSubmit }: { question: NumberQuestion; deadline: number | null; onSubmit: (a: Answer) => void }) {
  const [endAt] = useState(() => deadline ?? Date.now() + CHRONO_SECONDS * 1000)
  const [expired] = useState(() => endAt <= Date.now())
  if (expired) {
    return (
      <div className="away">
        <Ico icon={HourglassLow} size={44} weight="duotone" />
        <p className="away-title">Temps écoulé pendant ton absence</p>
        <p className="help">Pas de réponse pour cette manche.</p>
        <button type="button" className="btn btn-team" onClick={() => onSubmit({ kind: 'number', value: null })}>
          Continuer
        </button>
      </div>
    )
  }
  return <NumberInput question={question} endAt={endAt} onSubmit={onSubmit} />
}

/** Fourchette : deux valeurs saisies au même pavé, le champ actif se choisit d'un tap. */
function RangeInput({ question, onSubmit }: { question: NumberQuestion; onSubmit: (a: Answer) => void }) {
  const [drafts, setDrafts] = useState<[string, string]>(['', ''])
  const [field, setField] = useState<0 | 1>(0)
  const [min, max] = drafts.map(parseDraft)
  const unit = question.unit
  const edit = (k: string) => {
    play('tap')
    setDrafts((d) => (field === 0 ? [applyKey(d[0], k), d[1]] : [d[0], applyKey(d[1], k)]))
  }
  return (
    <>
      <div className="range-fields">
        {(['Minimum', 'Maximum'] as const).map((label, i) => (
          <button key={label} type="button" className={`range-field${field === i ? ' active' : ''}`} onClick={() => setField(i as 0 | 1)} aria-pressed={field === i}>
            <small>{label}</small>
            <span className={drafts[i] ? 'numpad-value' : 'numpad-value placeholder'}>{drafts[i] ? formatDraft(drafts[i]) : '?'}</span>
            {unit && <em>{unit}</em>}
          </button>
        ))}
      </div>
      <NumPad value={drafts[field]} onKey={edit} unit={unit} display={false} />
      {field === 0 ? (
        <button type="button" className="btn btn-team" disabled={min === null} onClick={() => setField(1)}>
          Maximum
        </button>
      ) : (
        <button type="button" className="btn btn-team" disabled={min === null || max === null} onClick={() => onSubmit({ kind: 'range', min, max })}>
          Valider
        </button>
      )}
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

/**
 * Duel « estimation éclair » : nouvelle question cachée ; chaque ex æquo prend le téléphone
 * à son tour et a DUEL_SECONDS secondes pour répondre. Le plus proche gagne le point de la manche,
 * nouvelle égalité → les ex æquo se partagent le point.
 */
export function DuelScreen({ state, onResolve }: { state: GameState; onResolve: (winners: number[], guesses: (number | null)[]) => void }) {
  const duel = currentDuel(state)
  const tied = state.results[state.results.length - 1]?.duel?.tied ?? []
  const [stage, setStage] = useState<'intro' | 'handoff' | 'input' | 'done'>('intro')
  const [turn, setTurn] = useState(0)
  const [guesses, setGuesses] = useState<(number | null)[]>(() => state.config.names.map(() => null))
  const [endAt, setEndAt] = useState(0)
  const names = tied.map((i) => state.config.names[i])

  if (!duel) {
    return (
      <main className="screen duel">
        <p className="help">Pas de question de départage disponible : {names.join(' et ')} se partagent le point.</p>
        <button type="button" className="btn btn-primary" onClick={() => onResolve(tied, [])}>
          Continuer
        </button>
      </main>
    )
  }

  const who = tied[turn]
  const color = colorFor(who ?? 0)
  const record = (value: number | null) => {
    const next = guesses.map((g, i) => (i === who ? value : g))
    setGuesses(next)
    if (turn + 1 < tied.length) {
      setTurn(turn + 1)
      setStage('handoff')
    } else {
      play('reveal')
      setStage('done')
    }
  }

  if (stage === 'intro') {
    return (
      <main className="screen duel">
        <p className="eyebrow eyebrow-icon">
          <Ico icon={Sword} size={16} /> Duel éclair
        </p>
        <h2 className="end-title">Égalité parfaite&nbsp;!</h2>
        <p className="help">
          {names.join(' et ')} sont à égalité pour le point de la manche. Nouvelle question secrète&nbsp;: {DUEL_SECONDS} secondes chacun, à tour de rôle. Le plus proche gagne.
        </p>
        <div className="sticky-cta">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              unlockAudio()
              setStage('handoff')
            }}
          >
            Lancer le duel
          </button>
        </div>
      </main>
    )
  }

  if (stage === 'handoff') {
    return (
      <main className="screen handoff" style={{ '--team': color } as CSSProperties}>
        <p className="eyebrow eyebrow-icon">
          <Ico icon={Sword} size={16} /> Duel éclair · {turn + 1}/{tied.length}
        </p>
        <p className="eyebrow">Passe le téléphone à</p>
        <h2 className="handoff-name">{state.config.names[who]}</h2>
        <p className="help help-icon">
          <Ico icon={EyeSlash} size={18} /> {DUEL_SECONDS} secondes, le chrono part au tap
        </p>
        <button
          type="button"
          className="btn btn-team"
          onClick={() => {
            setEndAt(Date.now() + DUEL_SECONDS * 1000)
            setStage('input')
          }}
        >
          C’est parti&nbsp;!
        </button>
      </main>
    )
  }

  if (stage === 'input') {
    return (
      <main className="screen input" style={{ '--team': color } as CSSProperties}>
        <p className="input-who">
          <span className="dot" style={{ background: color }} /> {state.config.names[who]} · Duel éclair
        </p>
        <p className="question-compact question-secret-revealed">{frenchSpacing(duel.question.prompt)}</p>
        <NumberInput
          key={turn}
          question={duel.question}
          endAt={endAt}
          seconds={DUEL_SECONDS}
          onSubmit={(a) => record(a.kind === 'number' ? a.value : null)}
        />
      </main>
    )
  }

  const winners = duelWinners(tied, guesses, duel.question)
  return (
    <main className="screen duel">
      <p className="eyebrow eyebrow-icon">
        <Ico icon={Sword} size={16} /> Duel éclair
      </p>
      <p className="question-compact">{frenchSpacing(duel.question.prompt)}</p>
      <p className="big-answer">
        {formatNumber(duel.question.answer, duel.question.year)} <small>{duel.question.unit}</small>
      </p>
      <ul className="results">
        {tied.map((i) => {
          const g = guesses[i]
          return (
            <li key={i} className={winners.includes(i) ? 'tier-exact' : 'tier-far'}>
              <span className="dot" style={{ background: colorFor(i) }} />
              <span className="results-name">{state.config.names[i]}</span>
              <span className="results-meta">
                <span className="results-answer">{g === null ? '—' : formatNumber(g, duel.question.year)}</span>
                <span className="results-note">{g === null ? 'Pas de réponse' : gapLabel(g, duel.question)}</span>
              </span>
              <span className={`results-points${winners.includes(i) ? ' positive' : ''}`}>{winners.includes(i) ? '+1' : '0'}</span>
            </li>
          )
        })}
      </ul>
      <p className="verdict">
        {winners.length === 1
          ? `${state.config.names[winners[0]]} remporte le point de la manche !`
          : `Encore égalité : ${winners.map((i) => state.config.names[i]).join(' et ')} se partagent le point.`}
      </p>
      <div className="sticky-cta">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            play('win')
            onResolve(winners, guesses)
          }}
        >
          Continuer
        </button>
      </div>
    </main>
  )
}

/** Sortie de partie : pause (la partie est gardée) ou abandon, à la place des fenêtres système. */
export function QuitSheet({ onPause, onAbandon, onCancel }: { onPause: () => void; onAbandon: () => void; onCancel: () => void }) {
  const [confirm, setConfirm] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Quitter la partie" onClick={onCancel}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <h2>{confirm ? 'Abandonner pour de bon ?' : 'Une pause ?'}</h2>
        <p className="help">{confirm ? 'Les scores de cette partie seront perdus.' : 'La partie reste sauvegardée : tu la reprends depuis l’accueil quand tu veux.'}</p>
        {confirm ? (
          <>
            <button type="button" className="btn btn-danger btn-icon" onClick={onAbandon}>
              <Ico icon={SignOut} size={20} /> Oui, abandonner
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>
              Non, revenir
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary btn-icon" onClick={onPause}>
              <Ico icon={Pause} size={20} weight="fill" /> Mettre en pause
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Continuer à jouer
            </button>
            <button type="button" className="link link-icon sheet-danger" onClick={() => setConfirm(true)}>
              <Ico icon={SignOut} size={16} /> Abandonner la partie
            </button>
          </>
        )}
      </div>
    </div>
  )
}
