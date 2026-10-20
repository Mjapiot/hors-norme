import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning'
import { Medal } from '@phosphor-icons/react/dist/csr/Medal'
import { Sword } from '@phosphor-icons/react/dist/csr/Sword'
import { Trophy } from '@phosphor-icons/react/dist/csr/Trophy'
import { Export } from '@phosphor-icons/react/dist/csr/Export'
import { Ico, TIER_ICONS } from '../components/Icons'
import { colorFor, formatNumber, frenchSpacing } from '../lib/format'
import { isAdmin } from '../lib/admin'
import { celebrate } from '../lib/celebrate'
import { play } from '../lib/sound'
import { shareResults } from '../lib/shareResults'
import { onGameFinished } from '../lib/review'
import { correctRanking, toleranceOf, TOLERANCE_RULES } from '../game/scoring'
import { isOver, standings } from '../game/engine'
import type { Answer, Breakdown, GameState, NumberQuestion, Round } from '../game/types'

/** Compteur animé jusqu'à la valeur cible (instantané si la révélation est accélérée). */
function useCountUp(target: number, instant: boolean, durationMs = 1100): number {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (instant) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(t === 1 ? target : target * eased)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, durationMs, instant])
  return instant ? target : value
}

function BigAnswer({ question, instant }: { question: NumberQuestion; instant: boolean }) {
  const v = useCountUp(question.answer, instant)
  const decimals = (String(question.answer).split('.')[1] ?? '').length
  const shown = v === question.answer ? question.answer : Number(v.toFixed(decimals))
  return (
    <p className="big-answer">
      {formatNumber(shown, question.year)} <small>{question.unit}</small>
    </p>
  )
}

/**
 * Ligne graduée, bonne réponse au centre.
 * Échelle logarithmique (×2 et ÷2 sont à la même distance) pour que les réponses très éloignées
 * ne s'entassent pas sur les bords ; écart absolu pour les années.
 */
function ScaleLine({ question, answers }: { question: NumberQuestion; answers: (Answer | null)[] }) {
  const guesses = answers.map((a) => (a?.kind === 'number' ? a.value : null))
  const valid = guesses.filter((g): g is number => g !== null)
  // Écart en unités (années, âges, degrés) : échelle linéaire ; quantités : logarithmique.
  const linear = !TOLERANCE_RULES[toleranceOf(question)].relative || question.answer <= 0
  const offset = (g: number) => (linear ? g - question.answer : Math.log10(Math.max(g, question.answer / 1000) / question.answer))
  const spread = Math.max(linear ? 1 : 0.3, ...valid.map((g) => Math.abs(offset(g)))) * 1.15
  const position = (g: number) => Math.min(1, Math.max(0, 0.5 + offset(g) / (2 * spread))) * 100
  return (
    <div className="scale" aria-hidden="true">
      <div className="scale-track" />
      <div className="scale-answer" />
      {guesses.map((g, i) =>
        g === null ? null : (
          <span key={i} className="scale-marker" style={{ left: `${position(g)}%`, background: colorFor(i), animationDelay: `${0.9 + i * 0.12}s` }} />
        ),
      )}
    </div>
  )
}

function answerLabel(round: Round, answer: Answer | null): string {
  if (!answer) return '—'
  if (answer.kind === 'number') {
    if (answer.value === null) return '—'
    return formatNumber(answer.value, round.kind !== 'ranking' && round.question.year)
  }
  if (answer.kind === 'higherlower') return answer.choice === null ? '—' : answer.choice === 'plus' ? 'Plus' : 'Moins'
  if (answer.kind === 'range') {
    if (answer.min === null || answer.max === null) return '—'
    return `${formatNumber(Math.min(answer.min, answer.max))} – ${formatNumber(Math.max(answer.min, answer.max))}`
  }
  return ''
}

function formatDelta(points: number): string {
  if (points > 0) return `+${points}`
  if (points < 0) return `−${Math.abs(points)}`
  return '0'
}

function SourceLine({ round }: { round: Round }) {
  const q = round.question
  const admin = isAdmin()
  return (
    <p className="source">
      Source : {q.source}
      {admin && (q.verified_at === null ? ' · à vérifier' : ` · vérifié le ${q.verified_at}`)}
      {admin && q.perishable && ' · périssable'}
      {admin && ` · ${q.id}`}
    </p>
  )
}

/** Détail lisible des points : on apprend les règles en jouant. */
function PointChips({
  breakdown,
  multiplier,
  pendingDuel,
  bonusRound,
  absorbed,
  rangeRound,
}: {
  breakdown: Breakdown
  multiplier: number
  pendingDuel: boolean
  bonusRound: boolean
  /** Malus sans effet : le score était déjà à 0. */
  absorbed: boolean
  rangeRound: boolean
}) {
  const chips: { label: string; tone: 'good' | 'bad' | 'neutral' }[] = []
  if (breakdown.precision > 0) chips.push({ label: `${bonusRound ? 'Bonus' : 'Précision'} +${breakdown.precision}`, tone: 'good' })
  if (breakdown.win > 0) chips.push({ label: `${rangeRound ? 'Plus serrée' : 'Plus proche'} +${breakdown.win}`, tone: 'good' })
  if (breakdown.malus < 0) chips.push({ label: absorbed ? 'Hors Norme (déjà à 0)' : `Hors Norme −${Math.abs(breakdown.malus)}`, tone: 'bad' })
  if (pendingDuel) chips.push({ label: 'Duel pour le point de manche', tone: 'neutral' })
  if (multiplier > 1 && (breakdown.precision || breakdown.win)) chips.push({ label: `×${multiplier}`, tone: 'neutral' })
  if (chips.length === 0) return null
  return (
    <span className="chips-inline">
      {chips.map((c) => (
        <span key={c.label} className={`pt-chip pt-${c.tone}`}>
          {c.label}
        </span>
      ))}
    </span>
  )
}

/** Dernière manche révélée (son, confettis, animations) : rien ne se rejoue au retour d'un duel. */
let revealedKey = ''
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function RevealScreen({ state, onNext, onDuel }: { state: GameState; onNext: () => void; onDuel: () => void }) {
  const round = state.rounds[state.index]
  const result = state.results[state.results.length - 1]
  const { names } = state.config
  const pendingDuel = result.duel !== null && !result.duel.resolved
  const shown = result.applied ?? result.points
  const rows = names
    .map((name, i) => ({ name, i, answer: state.answers[i], points: shown[i] }))
    .sort((a, b) => b.points - a.points || a.i - b.i)
  const last = isOver(state)
  const bonusRound = round.kind === 'ranking' || round.kind === 'higherlower' || round.kind === 'range'
  const compact = names.length >= 4
  const jackpot = result.tiers.some((t) => t === 'exact' || t === 'perfect')

  // Révélation accélérable : un tap n'importe où affiche tout de suite les résultats.
  const key = `${state.rounds[0]?.question.id}:${state.index}`
  const [fast, setFast] = useState(() => revealedKey === key || reducedMotion())
  const [ready, setReady] = useState(fast)
  const soundDone = useRef(revealedKey === key)
  const playReveal = () => {
    if (soundDone.current) return
    soundDone.current = true
    play(jackpot ? 'exact' : 'reveal')
    if (jackpot) celebrate()
  }
  useEffect(() => {
    revealedKey = key
    const sound = window.setTimeout(playReveal, 900)
    const done = window.setTimeout(() => setReady(true), 1200 + names.length * 100 + 300)
    return () => {
      window.clearTimeout(sound)
      window.clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois par manche
  }, [key])
  // Le tap qui accélère la révélation ne fait pas aussi passer à la suite.
  const skippedAt = useRef(0)
  const skip = () => {
    if (ready) return
    skippedAt.current = Date.now()
    setFast(true)
    setReady(true)
    playReveal()
  }
  const go = (action: () => void) => () => {
    if (!ready || Date.now() - skippedAt.current < 400) return skip()
    action()
  }

  return (
    <main className={`screen reveal${compact ? ' compact' : ''}${fast ? ' fast' : ''}`} onPointerDown={skip}>
      <p className="question-compact">{frenchSpacing(round.question.prompt)}</p>

      {(round.kind === 'classic' || round.kind === 'chrono') && (
        <>
          <BigAnswer question={round.question} instant={fast} />
          <ScaleLine question={round.question} answers={state.answers} />
        </>
      )}

      {round.kind === 'range' && <BigAnswer question={round.question} instant={fast} />}

      {round.kind === 'higherlower' && (
        <>
          <BigAnswer question={round.question} instant={fast} />
          <p className="verdict">
            C’était <strong>{round.question.answer > round.threshold ? 'PLUS' : 'MOINS'}</strong> que {formatNumber(round.threshold)} {round.question.unit}
          </p>
        </>
      )}

      {round.kind === 'ranking' && (
        <ol className="ranking-solution">
          {correctRanking(round.question.items.map((it) => it.value)).map((idx) => (
            <li key={idx}>
              <span>{round.question.items[idx].label}</span>
              <span className="value">
                {formatNumber(round.question.items[idx].value, round.question.unit === '')} {round.question.unit}
              </span>
            </li>
          ))}
        </ol>
      )}

      {result.multiplier > 1 && (
        <p className="double-banner">
          <Ico icon={Lightning} size={18} weight="fill" /> Points doublés
        </p>
      )}

      <ul className="results">
        {rows.map((r, k) => {
          const tier = result.tiers[r.i]
          const TierIcon = TIER_ICONS[tier]
          return (
            <li key={r.i} className={`tier-${tier}`} style={{ animationDelay: `${1.2 + k * 0.1}s` }}>
              <span className="dot" style={{ background: colorFor(r.i) }} />
              <span className="results-name">{r.name}</span>
              <span className="results-meta">
                <span className="results-answer">{answerLabel(round, r.answer)}</span>
                <span className="results-note">
                  {TierIcon && <Ico icon={TierIcon} size={15} />}
                  {tier === 'absurd' ? `Hors Norme · ${result.labels[r.i]}` : result.labels[r.i]}
                </span>
              </span>
              <span className={`results-points${r.points > 0 ? ' positive' : r.points < 0 ? ' negative' : ''}`}>{formatDelta(r.points)}</span>
              <PointChips
                breakdown={result.breakdown[r.i]}
                multiplier={result.multiplier}
                pendingDuel={pendingDuel && (result.duel?.tied.includes(r.i) ?? false)}
                bonusRound={bonusRound}
                absorbed={shown[r.i] > result.points[r.i]}
                rangeRound={round.kind === 'range'}
              />
            </li>
          )
        })}
      </ul>

      {result.duel?.resolved && (
        <p className="verdict">
          {result.duel.winners.length === 1
            ? `Duel éclair remporté par ${names[result.duel.winners[0]]}.`
            : `Duel éclair : ${result.duel.winners.map((i) => names[i]).join(' et ')} se partagent le point.`}
        </p>
      )}

      <Scoreboard state={state} />
      <SourceLine round={round} />

      <div className="sticky-cta">
        {pendingDuel ? (
          <button type="button" className={`btn btn-primary btn-icon${ready ? '' : ' btn-waiting'}`} aria-disabled={!ready} onClick={go(onDuel)}>
            <Ico icon={Sword} size={22} /> Duel éclair
          </button>
        ) : (
          <button type="button" className={`btn btn-primary btn-icon${ready ? '' : ' btn-waiting'}`} aria-disabled={!ready} onClick={go(onNext)}>
            {last ? (
              <>
                <Ico icon={Trophy} size={22} /> Voir le podium
              </>
            ) : (
              'Question suivante'
            )}
          </button>
        )}
      </div>
    </main>
  )
}

function Scoreboard({ state }: { state: GameState }) {
  const target = state.config.end.type === 'target' ? state.config.end.points : null
  const max = target ?? Math.max(1, ...state.scores)
  return (
    <div className="scoreboard">
      <h3>Classement</h3>
      {standings(state.scores).map((s) => (
        <div key={s.index} className="scoreboard-row">
          <span className="scoreboard-name">{state.config.names[s.index]}</span>
          <div className="scoreboard-bar">
            <div style={{ width: `${Math.min(100, (s.score / max) * 100)}%`, background: colorFor(s.index) }} />
          </div>
          <span className="scoreboard-score">{s.score}</span>
        </div>
      ))}
    </div>
  )
}

export function EndScreen({ state, onReplay, onHome }: { state: GameState; onReplay: () => void; onHome: () => void }) {
  const ranking = standings(state.scores)
  const podium = ranking.slice(0, 3)
  const winners = ranking.filter((r) => r.rank === 1).map((r) => state.config.names[r.index])

  const [sharing, setSharing] = useState(false)
  // Une partie terminée (une seule fois par podium) : sert à proposer de noter l'app au bon moment.
  useEffect(() => {
    onGameFinished()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      play('win')
      celebrate(true)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main className="screen end">
      <p className="eyebrow">Fin de partie</p>
      <h2 className="end-title">{winners.length > 1 ? 'Égalité !' : `${winners[0]} gagne !`}</h2>

      <ol className="podium">
        {podium.map((r, slot) => (
          <li key={r.index} className={`podium-step slot-${slot + 1}`} style={{ '--team': colorFor(r.index) } as CSSProperties}>
            <span className={`podium-medal medal-${r.rank}`}>
              <Ico icon={r.rank === 1 ? Trophy : Medal} size={34} weight="fill" />
              <span className="podium-rank">{r.rank}</span>
            </span>
            <span className="podium-name">{state.config.names[r.index]}</span>
            <span className="podium-score">{r.score} pts</span>
          </li>
        ))}
      </ol>

      {ranking.length > 3 && (
        <ul className="results">
          {ranking.slice(podium.length).map((r) => (
            <li key={r.index}>
              <span className="dot" style={{ background: colorFor(r.index) }} />
              <span className="results-name">
                {r.rank}. {state.config.names[r.index]}
              </span>
              <span className="results-points">{r.score} pts</span>
            </li>
          ))}
        </ul>
      )}

      <div className="stack">
        <button type="button" className="btn btn-primary" onClick={onReplay}>
          Revanche !
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          disabled={sharing}
          onClick={async () => {
            setSharing(true)
            await shareResults(state)
            setSharing(false)
          }}
        >
          <Ico icon={Export} size={20} /> Partager les résultats
        </button>
        <button type="button" className="btn btn-ghost" onClick={onHome}>
          Accueil
        </button>
      </div>
    </main>
  )
}
