import { useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react/dist/csr/ArrowLeft'
import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { Flag } from '@phosphor-icons/react/dist/csr/Flag'
import { Plus } from '@phosphor-icons/react/dist/csr/Plus'
import { LockSimple } from '@phosphor-icons/react/dist/csr/LockSimple'
import { PackStore } from '../components/PackStore'
import { packQuestionCount } from '../data/bank'
import { PACKS, PACKS_ENABLED, packForTheme } from '../lib/packs'
import { useOwnedThemes } from '../lib/purchases'
import type { PaidTheme } from '../game/types'
import { CaretRight } from '@phosphor-icons/react/dist/csr/CaretRight'
import { ListNumbers } from '@phosphor-icons/react/dist/csr/ListNumbers'
import { User } from '@phosphor-icons/react/dist/csr/User'
import { UsersThree } from '@phosphor-icons/react/dist/csr/UsersThree'
import { X } from '@phosphor-icons/react/dist/csr/X'
import { Ico, THEME_ICONS } from '../components/Icons'
import { useQuestionBank } from '../data/bank'
import { colorFor } from '../lib/format'
import { KEYS, load } from '../lib/storage'
import { DEFAULT_THEMES, FREE_THEMES, PAID_THEMES, THEMES } from '../game/types'
import type { EndCondition, GameConfig, Theme } from '../game/types'

const LIMITS = { teams: { min: 2, max: 6 }, players: { min: 2, max: 10 } }

const defaultName = (mode: GameConfig['mode'], i: number) => (mode === 'teams' ? `Équipe ${i + 1}` : `Joueur ${i + 1}`)
const isDefaultName = (name: string) => /^(Équipe|Joueur) \d+$/.test(name.trim()) || name.trim() === ''

// Build de démo (captures des stores) : équipes aux noms réalistes.
const DEMO = import.meta.env.VITE_DEMO === true

export const DEFAULT_CONFIG: GameConfig = {
  mode: 'teams',
  names: DEMO ? ['Les Pros', 'Team Pif', 'Les Rookies'] : ['Équipe 1', 'Équipe 2'],
  end: { type: 'rounds', count: 10 },
  themes: DEFAULT_THEMES,
  bonus: true,
}

const END_OPTIONS: { label: string; hint: string; value: EndCondition }[] = [
  { label: '5 questions', hint: 'Partie express · ≈ 7 min', value: { type: 'rounds', count: 5 } },
  { label: '10 questions', hint: 'Partie classique · ≈ 15 min', value: { type: 'rounds', count: 10 } },
  { label: 'Premier à 8 pts', hint: '≈ 8 manches', value: { type: 'target', points: 8 } },
  { label: 'Premier à 12 pts', hint: '≈ 12 manches', value: { type: 'target', points: 12 } },
  { label: 'Premier à 15 pts', hint: '≈ 15 manches', value: { type: 'target', points: 15 } },
]

const sameEnd = (a: EndCondition, b: EndCondition) => JSON.stringify(a) === JSON.stringify(b)

/** Dernière configuration enregistrée, vérifiée champ par champ (sinon la configuration par défaut). */
export function loadConfig(): GameConfig {
  const raw = load<Partial<GameConfig> | null>(KEYS.config, null)
  if (!raw || typeof raw !== 'object') return DEFAULT_CONFIG
  const mode = raw.mode === 'players' ? 'players' : 'teams'
  const { min, max } = LIMITS[mode]
  const names = Array.isArray(raw.names) && raw.names.every((n) => typeof n === 'string') ? raw.names.slice(0, max) : DEFAULT_CONFIG.names
  const end = END_OPTIONS.find((o) => raw.end && sameEnd(o.value, raw.end))?.value ?? DEFAULT_CONFIG.end
  const themes = Array.isArray(raw.themes) ? raw.themes.filter((t): t is Theme => t in THEMES) : DEFAULT_CONFIG.themes
  return {
    mode,
    names: names.length >= min ? names : [...names, ...Array.from({ length: min - names.length }, (_, i) => defaultName(mode, names.length + i))],
    end,
    themes: themes.length > 0 ? themes : DEFAULT_CONFIG.themes,
    bonus: typeof raw.bonus === 'boolean' ? raw.bonus : true,
  }
}

const STEPS = ['Qui joue ?', 'Les noms', 'Fin de partie', 'Les thèmes'] as const

interface Props {
  onHelp: () => void
  initial: GameConfig
  onBack: () => void
  /** false : la partie n'a pas pu être lancée (aucune question jouable). */
  onStart: (config: GameConfig) => boolean
}

/** Configuration en 4 étapes : mode → noms → fin de partie → thèmes. */
export function Setup({ initial, onBack, onStart, onHelp }: Props) {
  const [cfg, setCfg] = useState<GameConfig>(initial)
  const [step, setStep] = useState(0)
  const limits = LIMITS[cfg.mode]
  const questions = useQuestionBank()
  const owned = useOwnedThemes()
  const [store, setStore] = useState<{ focus: PaidTheme | null } | null>(null)
  const [startError, setStartError] = useState(false)
  const [teaser, setTeaser] = useState<PaidTheme | null>(null)
  // Thèmes jouables : gratuits + premium achetés et téléchargés.
  const playable: Theme[] = [...FREE_THEMES, ...owned.filter((t) => packQuestionCount(t) > 0)]
  const available = questions.filter((q) => cfg.themes.includes(q.theme) && q.type === 'number').length
  const needed = cfg.end.type === 'rounds' ? cfg.end.count : 15

  const chooseMode = (mode: GameConfig['mode']) => {
    const max = LIMITS[mode].max
    const names = cfg.names.slice(0, max).map((n, i) => (isDefaultName(n) ? defaultName(mode, i) : n))
    setCfg({ ...cfg, mode, names })
    setStep(1)
  }

  const setName = (i: number, value: string) => setCfg({ ...cfg, names: cfg.names.map((n, k) => (k === i ? value : n)) })

  const toggleTheme = (t: Theme) => {
    const themes = cfg.themes.includes(t) ? cfg.themes.filter((x) => x !== t) : [...cfg.themes, t]
    setStartError(false)
    setCfg({ ...cfg, themes })
  }

  const start = () => {
    const names = cfg.names.map((n, i) => n.trim().slice(0, 20) || defaultName(cfg.mode, i))
    setStartError(!onStart({ ...cfg, names, themes: cfg.themes.filter((t) => playable.includes(t)) }))
  }

  const back = () => (step === 0 ? onBack() : setStep(step - 1))
  const noun = cfg.mode === 'teams' ? 'équipe' : 'joueur'

  return (
    <main className="screen setup">
      <header className="topbar">
        <button type="button" className="icon-btn" onClick={back} aria-label={step === 0 ? 'Retour à l’accueil' : 'Étape précédente'}>
          <Ico icon={ArrowLeft} size={20} />
        </button>
        <div className="setup-title">
          <span className="progress">
            Étape {step + 1}/{STEPS.length}
          </span>
          <h2>{STEPS[step]}</h2>
        </div>
        <button type="button" className="icon-btn topbar-end" onClick={onHelp} aria-label="Rappel des règles">
          <Ico icon={Question} size={20} />
        </button>
      </header>
      <div className="stepper" aria-hidden="true">
        {STEPS.map((label, i) => (
          <span key={label} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      {step === 0 && (
        <section key="mode" className="step">
          {(['teams', 'players'] as const).map((m) => (
            <button key={m} type="button" className={`choice${cfg.mode === m ? ' active' : ''}`} onClick={() => chooseMode(m)}>
              <span className="choice-icon">
                <Ico icon={m === 'teams' ? UsersThree : User} size={34} weight="duotone" />
              </span>
              <span className="choice-text">
                <strong>{m === 'teams' ? 'Jouer en équipes' : 'Chacun pour soi'}</strong>
                <small>{m === 'teams' ? 'De 2 à 6 équipes, on se concerte' : 'De 2 à 10 joueurs, chacun ses réponses'}</small>
              </span>
              <Ico icon={CaretRight} size={20} className="choice-caret" />
            </button>
          ))}
        </section>
      )}

      {step === 1 && (
        <section key="names" className="step">
          <p className="help step-help">Donne un nom à chaque {noun} (ou garde ceux proposés).</p>
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
                  <button type="button" className="icon-btn small" aria-label={`Retirer ${name.trim() || defaultName(cfg.mode, i)}`} onClick={() => setCfg({ ...cfg, names: cfg.names.filter((_, k) => k !== i) })}>
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
          <div className="sticky-cta">
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
              Continuer
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section key="end" className="step">
          <p className="help step-help">En combien de questions, ou jusqu’à quel score&nbsp;?</p>
          {END_OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              className={`choice choice-small${sameEnd(cfg.end, o.value) ? ' active' : ''}`}
              onClick={() => {
                setCfg({ ...cfg, end: o.value })
                setStep(3)
              }}
            >
              <span className="choice-icon">
                <Ico icon={o.value.type === 'target' ? Flag : ListNumbers} size={24} weight="duotone" />
              </span>
              <span className="choice-text">
                <strong>{o.label}</strong>
                <small>{o.hint}</small>
              </span>
              <Ico icon={CaretRight} size={20} className="choice-caret" />
            </button>
          ))}
        </section>
      )}

      {step === 3 && (
        <section key="themes" className="step">
          <h3>
            {cfg.themes.filter((t) => playable.includes(t)).length}/{playable.length} thèmes sélectionnés
            <button type="button" className="link" onClick={() => setCfg({ ...cfg, themes: cfg.themes.length >= playable.length ? [] : playable })}>
              {cfg.themes.length >= playable.length ? 'Aucun' : 'Tous'}
            </button>
          </h3>
          <div className="chips">
            {FREE_THEMES.map((t) => (
              <button key={t} type="button" className={`chip${cfg.themes.includes(t) ? ' active' : ''}`} onClick={() => toggleTheme(t)}>
                <Ico icon={THEME_ICONS[t]} size={17} />
                {THEMES[t].label}
              </button>
            ))}
          </div>
          {PACKS_ENABLED && (
            <>
              <h3>
                Thèmes premium
                <button type="button" className="link" onClick={() => setStore({ focus: null })}>
                  Boutique
                </button>
              </h3>
              <div className="chips">
                {PAID_THEMES.map((t) => {
                  const ready = owned.includes(t) && packQuestionCount(t) > 0
                  if (ready) {
                    return (
                      <button key={t} type="button" className={`chip chip-premium${cfg.themes.includes(t) ? ' active' : ''}`} onClick={() => toggleTheme(t)}>
                        <Ico icon={THEME_ICONS[t]} size={17} />
                        {THEMES[t].label}
                      </button>
                    )
                  }
                  return (
                    <button key={t} type="button" className="chip chip-locked" onClick={() => setStore({ focus: t })} aria-label={`${THEMES[t].label} : thème premium verrouillé`}>
                      <Ico icon={LockSimple} size={15} weight="fill" />
                      {THEMES[t].label}
                      <small>{owned.includes(t) ? 'bientôt' : packForTheme(t).fallbackPrice}</small>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {!PACKS_ENABLED && (
            <>
              <h3>
                Thèmes premium
                <span className="soon-tag">Bientôt</span>
              </h3>
              <ul className="soon-list">
                {PACKS.map((p) => (
                  <li key={p.theme}>
                    <button type="button" className={`soon-card${teaser === p.theme ? ' active' : ''}`} onClick={() => setTeaser(p.theme)} aria-label={`${THEMES[p.theme].label} : bientôt disponible`}>
                      <Ico icon={THEME_ICONS[p.theme]} size={22} />
                      <span>
                        <strong>{THEMES[p.theme].label}</strong>
                        <small>{p.pitch}</small>
                      </span>
                      <Ico icon={LockSimple} size={16} weight="fill" className="soon-lock" />
                    </button>
                  </li>
                ))}
              </ul>
              {teaser && (
                <p className="soon-note" role="status">
                  {THEMES[teaser].label} arrive dans une prochaine mise à jour de Hors Norme.
                </p>
              )}
            </>
          )}
          {cfg.themes.length > 0 && available < needed && <p className="warning">Peu de questions sur ces thèmes&nbsp;: la partie risque d’être plus courte.</p>}
          {startError && <p className="warning">Aucune question disponible pour ces thèmes. Choisis-en d’autres.</p>}
          <label className="toggle">
            <input type="checkbox" checked={cfg.bonus} onChange={(e) => setCfg({ ...cfg, bonus: e.target.checked })} />
            <span>
              Manches bonus
              <small>Chrono, classement, plus ou moins, fourchette&nbsp;: une toutes les 4 questions</small>
            </span>
          </label>
          <p className="recap">
            {cfg.names.length} {noun}s · {END_OPTIONS.find((o) => sameEnd(o.value, cfg.end))?.label.toLowerCase()}
          </p>
          <div className="sticky-cta">
            <button type="button" className="btn btn-primary" disabled={cfg.themes.length === 0} onClick={start}>
              C’est parti&nbsp;!
            </button>
          </div>
        </section>
      )}
      {store && <PackStore focus={store.focus} onClose={() => setStore(null)} />}
    </main>
  )
}
