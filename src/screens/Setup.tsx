import { useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { Flag } from '@phosphor-icons/react/dist/csr/Flag'
import { Plus } from '@phosphor-icons/react/dist/csr/Plus'
import { X } from '@phosphor-icons/react/dist/csr/X'
import { Ico, THEME_ICONS } from '../components/Icons'
import { QUESTIONS } from '../data/questions'
import { colorFor } from '../lib/format'
import { THEMES } from '../game/types'
import type { EndCondition, GameConfig, Theme } from '../game/types'

const LIMITS = { teams: { min: 2, max: 6 }, players: { min: 2, max: 10 } }
const ALL_THEMES = Object.keys(THEMES) as Theme[]

const defaultName = (mode: GameConfig['mode'], i: number) => (mode === 'teams' ? `Équipe ${i + 1}` : `Joueur ${i + 1}`)
const isDefaultName = (name: string) => /^(Équipe|Joueur) \d+$/.test(name.trim()) || name.trim() === ''

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'teams',
  names: ['Équipe 1', 'Équipe 2'],
  end: { type: 'rounds', count: 10 },
  themes: ALL_THEMES,
  bonus: true,
}

const END_OPTIONS: { label: string; value: EndCondition }[] = [
  { label: '5 questions', value: { type: 'rounds', count: 5 } },
  { label: '10 questions', value: { type: 'rounds', count: 10 } },
  { label: '8 pts', value: { type: 'target', points: 8 } },
  { label: '12 pts', value: { type: 'target', points: 12 } },
  { label: '15 pts', value: { type: 'target', points: 15 } },
]

const sameEnd = (a: EndCondition, b: EndCondition) => JSON.stringify(a) === JSON.stringify(b)

interface Props {
  onHelp: () => void
  initial: GameConfig
  onBack: () => void
  onStart: (config: GameConfig) => void
}

export function Setup({ initial, onBack, onStart, onHelp }: Props) {
  const [cfg, setCfg] = useState<GameConfig>(initial)
  const limits = LIMITS[cfg.mode]
  const available = QUESTIONS.filter((q) => cfg.themes.includes(q.theme) && q.type === 'number').length
  const needed = cfg.end.type === 'rounds' ? cfg.end.count : 14

  const setMode = (mode: GameConfig['mode']) => {
    const max = LIMITS[mode].max
    const names = cfg.names.slice(0, max).map((n, i) => (isDefaultName(n) ? defaultName(mode, i) : n))
    setCfg({ ...cfg, mode, names })
  }

  const setName = (i: number, value: string) => setCfg({ ...cfg, names: cfg.names.map((n, k) => (k === i ? value : n)) })

  const toggleTheme = (t: Theme) => {
    const themes = cfg.themes.includes(t) ? cfg.themes.filter((x) => x !== t) : [...cfg.themes, t]
    setCfg({ ...cfg, themes })
  }

  const start = () => {
    const names = cfg.names.map((n, i) => n.trim().slice(0, 20) || defaultName(cfg.mode, i))
    onStart({ ...cfg, names })
  }

  return (
    <main className="screen setup">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="Retour">
          <Ico icon={ArrowLeft} size={20} />
        </button>
        <h2>Nouvelle partie</h2>
        <button type="button" className="link link-icon topbar-end" onClick={onHelp}>
          <Ico icon={Question} size={18} /> Rappel des règles
        </button>
      </header>

      <section>
        <h3>Qui joue ?</h3>
        <div className="segmented" role="radiogroup">
          {(['teams', 'players'] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={cfg.mode === m} className={cfg.mode === m ? 'active' : ''} onClick={() => setMode(m)}>
              {m === 'teams' ? 'En équipes' : 'Chacun pour soi'}
            </button>
          ))}
        </div>

        <ul className="names">
          {cfg.names.map((name, i) => (
            <li key={i}>
              <span className="dot" style={{ background: colorFor(i) }} />
              <input
                value={name}
                maxLength={20}
                placeholder={defaultName(cfg.mode, i)}
                onFocus={(e) => isDefaultName(name) && e.currentTarget.select()}
                onChange={(e) => setName(i, e.target.value)}
                aria-label={`Nom ${i + 1}`}
                enterKeyHint="done"
                autoComplete="off"
              />
              {cfg.names.length > limits.min && (
                <button type="button" className="icon-btn small" aria-label={`Retirer ${name}`} onClick={() => setCfg({ ...cfg, names: cfg.names.filter((_, k) => k !== i) })}>
                  <Ico icon={X} size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {cfg.names.length < limits.max && (
          <button type="button" className="btn btn-ghost small" onClick={() => setCfg({ ...cfg, names: [...cfg.names, defaultName(cfg.mode, cfg.names.length)] })}>
            <Ico icon={Plus} size={18} /> Ajouter {cfg.mode === 'teams' ? 'une équipe' : 'un joueur'}
          </button>
        )}
      </section>

      <section>
        <h3>Fin de partie</h3>
        <div className="chips">
          {END_OPTIONS.map((o) => (
            <button key={o.label} type="button" className={`chip${sameEnd(cfg.end, o.value) ? ' active' : ''}`} onClick={() => setCfg({ ...cfg, end: o.value })}>
              {o.value.type === 'target' && <Ico icon={Flag} size={16} />}
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>
          Thèmes
          <button type="button" className="link" onClick={() => setCfg({ ...cfg, themes: cfg.themes.length === ALL_THEMES.length ? [] : ALL_THEMES })}>
            {cfg.themes.length === ALL_THEMES.length ? 'Aucun' : 'Tous'}
          </button>
        </h3>
        <div className="chips">
          {ALL_THEMES.map((t) => (
            <button key={t} type="button" className={`chip${cfg.themes.includes(t) ? ' active' : ''}`} onClick={() => toggleTheme(t)}>
              <Ico icon={THEME_ICONS[t]} size={17} />
              {THEMES[t].label}
            </button>
          ))}
        </div>
        {cfg.themes.length > 0 && available < needed && (
          <p className="warning">Seulement {available} questions sur ces thèmes : la partie sera plus courte.</p>
        )}
      </section>

      <section>
        <label className="toggle">
          <input type="checkbox" checked={cfg.bonus} onChange={(e) => setCfg({ ...cfg, bonus: e.target.checked })} />
          <span>
            Manches bonus
            <small>Chrono, classement, plus ou moins : une toutes les 4 questions</small>
          </span>
        </label>
      </section>

      <div className="sticky-cta">
        <button type="button" className="btn btn-primary" disabled={cfg.themes.length === 0} onClick={start}>
          C’est parti !
        </button>
      </div>
    </main>
  )
}
