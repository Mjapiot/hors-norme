import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowCounterClockwise } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise'
import { ArrowsDownUp } from '@phosphor-icons/react/dist/csr/ArrowsDownUp'
import { ArrowsHorizontal } from '@phosphor-icons/react/dist/csr/ArrowsHorizontal'
import { Crosshair } from '@phosphor-icons/react/dist/csr/Crosshair'
import { DeviceMobile } from '@phosphor-icons/react/dist/csr/DeviceMobile'
import { Envelope } from '@phosphor-icons/react/dist/csr/Envelope'
import { Flag } from '@phosphor-icons/react/dist/csr/Flag'
import { Lightning } from '@phosphor-icons/react/dist/csr/Lightning'
import { ListNumbers } from '@phosphor-icons/react/dist/csr/ListNumbers'
import { LockKey } from '@phosphor-icons/react/dist/csr/LockKey'
import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { Sword } from '@phosphor-icons/react/dist/csr/Sword'
import { Target } from '@phosphor-icons/react/dist/csr/Target'
import { Timer } from '@phosphor-icons/react/dist/csr/Timer'
import { Trophy } from '@phosphor-icons/react/dist/csr/Trophy'
import { Warning } from '@phosphor-icons/react/dist/csr/Warning'
import { X } from '@phosphor-icons/react/dist/csr/X'
import type { Icon } from '@phosphor-icons/react'
import { gapLabel, isAbsurd, precisionFor, relativeError, WIN_POINTS } from '../game/scoring'
import { colorFor, formatNumber } from '../lib/format'
import { Ico } from './Icons'

/*
 * Tutoriel « Comment on joue » : 7 cartes à faire glisser (scroll-snap natif),
 * avec des mini-exemples. La carte Précision utilise le vrai barème du jeu.
 */

const EVEREST = 8849

function Card({ icon, kicker, title, children }: { icon: Icon; kicker: string; title: string; children: ReactNode }) {
  return (
    <section className="tuto-card">
      <div className="tuto-head">
        <span className="tuto-icon">
          <Ico icon={icon} size={26} weight="duotone" />
        </span>
        <p className="eyebrow">{kicker}</p>
      </div>
      <h2 className="tuto-title">{title}</h2>
      {children}
    </section>
  )
}

function MiniQuestion() {
  return (
    <div className="mini-card">
      <p className="mini-prompt">Quelle est l’altitude de l’Everest, la plus haute montagne du monde&nbsp;?</p>
      <p className="mini-unit">Réponse en m</p>
    </div>
  )
}

function SecretChips() {
  return (
    <div className="mini-chips">
      {['Équipe 1', 'Équipe 2', 'Équipe 3'].map((n, i) => (
        <span key={n} className="mini-chip" style={{ animationDelay: `${0.4 + i * 0.5}s` }}>
          <span className="dot" style={{ background: colorFor(i) }} /> {n}
          <Ico icon={LockKey} size={14} />
        </span>
      ))}
    </div>
  )
}

/** Petite séquence animée des écrans de passage du téléphone. */
function HandoffDemo() {
  const frames = [
    { icon: DeviceMobile, text: 'Passe le téléphone à Équipe 2', sub: 'Les autres ne regardent pas' },
    { icon: ArrowCounterClockwise, text: 'Corriger la réponse d’Équipe 1', sub: 'Faute de frappe ? On revient en arrière' },
    { icon: Envelope, text: 'Toutes les réponses sont là', sub: 'Téléphone au centre… Révéler !' },
  ]
  const [f, setF] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setF((x) => (x + 1) % frames.length), 2200)
    return () => window.clearInterval(id)
  }, [frames.length])
  const frame = frames[f]
  return (
    <div className="mini-phone" aria-hidden="true">
      <div key={f} className="mini-phone-frame">
        <Ico icon={frame.icon} size={30} weight="duotone" />
        <strong>{frame.text}</strong>
        <span>{frame.sub}</span>
      </div>
      <div className="mini-dots">
        {frames.map((_, i) => (
          <span key={i} className={i === f ? 'on' : ''} />
        ))}
      </div>
    </div>
  )
}

/**
 * Curseur de ÷6 à ×6 la vraie valeur, centre = tout pile.
 * Échelle « au carré » : très fine près de la bonne réponse (la zone 2 pts fait ~20 % de la course),
 * plus rapide vers les extrêmes.
 */
const SLIDER_MAX = 1000
const SLIDER_SPAN = 6
const HALF = SLIDER_MAX / 2
const sliderToGuess = (t: number) => {
  if (t === HALF) return EVEREST
  const x = (t - HALF) / HALF
  const v = EVEREST * Math.pow(SLIDER_SPAN, Math.sign(x) * x * x)
  return Number(v.toPrecision(v < 10000 ? 3 : 4))
}

function PrecisionDemo({ withMalus = false, initial = 640, zones }: { withMalus?: boolean; initial?: number; zones?: ReactNode }) {
  const [t, setT] = useState(initial)
  const guess = sliderToGuess(t)
  const err = relativeError(guess, EVEREST)
  const { points, tier } = precisionFor(err, 'relative')
  const absurd = withMalus && isAbsurd(guess, EVEREST, 'relative')
  const label = tier === 'exact' ? 'Tout pile !' : gapLabel(guess, { answer: EVEREST, unit: 'm' })
  return (
    <div className="demo">
      <p className="demo-guess">
        Ta réponse : <strong>{formatNumber(guess)} m</strong>
      </p>
      {zones}
      <input
        type="range"
        min={0}
        max={SLIDER_MAX}
        value={t}
        onChange={(e) => setT(Number(e.target.value))}
        aria-label="Ta réponse pour l’altitude de l’Everest"
        className="demo-range"
      />
      <div className="demo-scale" aria-hidden="true">
        <span>÷6</span>
        <span>8 849 m</span>
        <span>×6</span>
      </div>
      <div className={`demo-result tier-${absurd ? 'absurd' : tier}`}>
        <span>{absurd ? 'Hors Norme' : label}</span>
        <strong>{absurd ? '−1' : points > 0 ? `+${points}` : '0'}</strong>
      </div>
      <button type="button" className="link" onClick={() => setT(HALF)}>
        Essayer « tout pile »
      </button>
    </div>
  )
}

function TierTable() {
  const rows = [
    ['Tout pile', '3 pts'],
    ['à 10 % ou moins', '2 pts'],
    ['à 30 % ou moins', '1 pt'],
    ['au-delà', '0'],
  ]
  return (
    <>
      <table className="tier-table">
        <tbody>
          {rows.map(([a, b]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="tier-notes">
        <li>Années&nbsp;: à 10 ans, puis à 30 ans près.</li>
        <li>Âges et températures&nbsp;: à 2, puis à 5 près.</li>
        <li>Records serrés (sprints, sauts)&nbsp;: à 1 %, puis à 3 %.</li>
        <li>Questions difficiles&nbsp;: paliers 1,5 fois plus larges.</li>
        <li>Niveau Détente&nbsp;: paliers encore plus larges. Expert&nbsp;: plus stricts.</li>
      </ul>
    </>
  )
}

function ClosestDemo() {
  const rows = [
    { name: 'Équipe 1', guess: 8700, chips: ['Précision +2', `Plus proche +${WIN_POINTS}`], total: 2 + WIN_POINTS },
    { name: 'Équipe 2', guess: 7500, chips: ['Précision +1'], total: 1 },
  ]
  return (
    <ul className="mini-results">
      {rows.map((r, i) => (
        <li key={r.name}>
          <span className="dot" style={{ background: colorFor(i) }} />
          <span className="mini-results-name">
            {r.name} <small>{formatNumber(r.guess)} m</small>
          </span>
          <span className="mini-results-chips">
            {r.chips.map((c) => (
              <span key={c} className="pt-chip pt-good">
                {c}
              </span>
            ))}
          </span>
          <strong>+{r.total}</strong>
        </li>
      ))}
    </ul>
  )
}

/** Zones calées sur l'échelle du curseur : ÷3 et ×3 tombent à ≈ 11 % et 89 % de la course. */
const HALVING_POS = (1 - Math.sqrt(Math.log(3) / Math.log(SLIDER_SPAN))) / 2

function MalusZones() {
  const edge = `${(HALVING_POS * 100).toFixed(1)}%`
  return (
    <div className="zones" aria-hidden="true" style={{ gridTemplateColumns: `${edge} 1fr ${edge}` }}>
      <span className="zone bad">÷3</span>
      <span className="zone ok">pas de malus</span>
      <span className="zone bad">×3</span>
    </div>
  )
}

function BonusTiles() {
  const tiles = [
    { icon: Timer, title: 'Chrono 30 s', text: 'Question secrète, révélée seulement quand tu as le téléphone.', pts: 'barème normal' },
    { icon: ListNumbers, title: 'Classement express', text: 'Remets 4 éléments dans l’ordre.', pts: '3 pts si parfait · 1 pt si 2 bien placés' },
    { icon: ArrowsDownUp, title: 'Plus ou moins', text: '« Plus ou moins de 7 500 m ? »', pts: '1 pt si juste' },
    { icon: ArrowsHorizontal, title: 'Fourchette', text: 'Donne un minimum et un maximum.', pts: 'si c’est dedans : 3 pts si serrée, 2 ou 1 pt si plus large · +2 la plus serrée' },
  ]
  return (
    <ul className="bonus-tiles">
      {tiles.map((t) => (
        <li key={t.title}>
          <Ico icon={t.icon} size={22} />
          <div>
            <strong>{t.title}</strong>
            <span>{t.text}</span>
            <em>{t.pts}</em>
          </div>
        </li>
      ))}
    </ul>
  )
}

function EndDemo() {
  return (
    <div className="end-demo">
      <p className="double-banner">
        <Ico icon={Lightning} size={18} weight="fill" /> Dernière question : points doublés
      </p>
      <div className="targets">
        {[
          ['15 pts', '≈ 9 manches'],
          ['20 pts', '≈ 12 manches'],
          ['25 pts', '≈ 16 manches'],
        ].map(([a, b]) => (
          <span key={a}>
            <Ico icon={Flag} size={16} /> <strong>{a}</strong>
            <small>{b}</small>
          </span>
        ))}
      </div>
      <p className="match-point">
        <Ico icon={Flag} size={18} weight="fill" /> Balle de match pour Équipe 1
      </p>
    </div>
  )
}

const CARDS: { key: string; render: () => ReactNode }[] = [
  {
    key: 'principe',
    render: () => (
      <Card icon={Question} kicker="1 · Le principe" title="Le plus grand, le plus vieux, le plus rapide…">
        <p className="tuto-text">Une question sur un record s’affiche. Chaque équipe tape un chiffre, en secret. Pas besoin de savoir : il faut viser juste.</p>
        <MiniQuestion />
        <SecretChips />
      </Card>
    ),
  },
  {
    key: 'telephone',
    render: () => (
      <Card icon={DeviceMobile} kicker="2 · Un seul téléphone" title="On se le passe">
        <p className="tuto-text">Chaque équipe répond à son tour, puis passe le téléphone. L’ordre change à chaque manche. Une erreur ? On peut corriger avant la révélation.</p>
        <HandoffDemo />
      </Card>
    ),
  },
  {
    key: 'precision',
    render: () => (
      <Card icon={Target} kicker="3 · La précision" title="Plus tu es près, plus tu marques">
        <p className="tuto-text">Chacun marque selon son propre écart. Bouge le curseur pour essayer avec l’Everest (8 849 m)&nbsp;:</p>
        <PrecisionDemo />
        <TierTable />
      </Card>
    ),
  },
  {
    key: 'proche',
    render: () => (
      <Card icon={Crosshair} kicker="4 · Le plus proche" title={`+${WIN_POINTS} pour le plus près`}>
        <p className="tuto-text">Chaque manche a un vainqueur&nbsp;: le plus proche gagne {WIN_POINTS} points en plus, même s’il est loin. Seule exception&nbsp;: une réponse Hors Norme.</p>
        <ClosestDemo />
        <p className="tuto-note">
          <Ico icon={Sword} size={18} />
          <span>
            Égalité parfaite&nbsp;? <strong>Duel éclair</strong>&nbsp;: une nouvelle question, 10 secondes chacun à tour de rôle, le plus proche gagne le point.
          </span>
        </p>
      </Card>
    ),
  },
  {
    key: 'malus',
    render: () => (
      <Card icon={Warning} kicker="5 · À 3 équipes et plus" title="Attention aux réponses Hors Norme">
        <p className="tuto-text">Une réponse plus du triple ou moins du tiers de la vraie valeur coûte 1 point (×5 ou ÷5 pour une question difficile) et ne peut pas gagner la manche. Le score ne descend jamais sous zéro.</p>
        <PrecisionDemo withMalus initial={950} zones={<MalusZones />} />
      </Card>
    ),
  },
  {
    key: 'bonus',
    render: () => (
      <Card icon={Lightning} kicker="6 · Toutes les 4 questions" title="Les manches bonus">
        <BonusTiles />
      </Card>
    ),
  },
  {
    key: 'fin',
    render: () => (
      <Card icon={Trophy} kicker="7 · Fin de partie" title="Jusqu’au bout du suspense">
        <p className="tuto-text">En 5 ou 10 questions, la dernière compte double (sauf le malus). En mode objectif, le premier à 15, 20 ou 25 points gagne.</p>
        <EndDemo />
      </Card>
    ),
  },
]

export function Tutorial({ onClose }: { onClose: () => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = index === CARDS.length - 1

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }

  // La page derrière ne défile pas tant que le tutoriel est ouvert.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goTo(Math.min(CARDS.length - 1, index + 1))
      if (e.key === 'ArrowLeft') goTo(Math.max(0, index - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onClose])

  return (
    <div className="tuto" role="dialog" aria-modal="true" aria-label="Comment on joue">
      <header className="tuto-top">
        <span className="progress">
          {index + 1}/{CARDS.length}
        </span>
        <button type="button" className="icon-btn" aria-label="Fermer les règles" onClick={onClose}>
          <Ico icon={X} size={20} />
        </button>
      </header>

      <div
        ref={track}
        className="tuto-track"
        onScroll={(e) => {
          const el = e.currentTarget
          const i = Math.round(el.scrollLeft / el.clientWidth)
          if (i !== index) setIndex(i)
        }}
      >
        {CARDS.map((c, i) => (
          <div key={c.key} className="tuto-slide" inert={i !== index}>
            {c.render()}
          </div>
        ))}
      </div>

      <footer className="tuto-bottom">
        <div className="tuto-dots" role="tablist">
          {CARDS.map((c, i) => (
            <button key={c.key} type="button" role="tab" aria-selected={i === index} aria-label={`Carte ${i + 1}`} className={i === index ? 'on' : ''} onClick={() => goTo(i)} />
          ))}
        </div>
        <div className="row">
          {!last && (
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Passer
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={() => (last ? onClose() : goTo(index + 1))}>
            {last ? 'C’est parti !' : 'Suivant'}
          </button>
        </div>
      </footer>
    </div>
  )
}
