import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { App as NativeApp } from '@capacitor/app'
import { isNative } from './lib/native'
import { adUnlockedThemes, consumeAdUnlocks, getQuestions, syncPackQuestions, syncQuestions } from './data/bank'
import { PACKS_ENABLED } from './lib/packs'
import { getAppUserId, getOwnedThemes, refreshOwned } from './lib/purchases'
import { startAds } from './lib/ads'
import { buildDuels, buildRounds } from './game/deck'
import { reducer, resumeState } from './game/engine'
import type { Answer, GameConfig } from './game/types'
import { KEYS, load, loadSeen, markSeen, remove, save } from './lib/storage'
import { Home } from './screens/Home'
import { Setup, loadConfig } from './screens/Setup'
import { AllInScreen, DuelScreen, GameHeader, HandoffScreen, InputScreen, QuestionScreen, QuitSheet } from './screens/GameScreens'
import { useWakeLock } from './lib/wakeLock'
import { Tutorial } from './components/Tutorial'
import { track } from '@vercel/analytics'
import { EndScreen, RevealScreen } from './screens/Reveal'

type Screen = 'home' | 'setup' | 'game'

export default function App() {
  const [game, dispatch] = useReducer(reducer, null, () => resumeState(load<unknown>(KEYS.game, null)))
  const [screen, setScreen] = useState<Screen>('home')
  const [quitting, setQuitting] = useState(false)
  // Tutoriel : ouvert automatiquement au tout premier lancement.
  const [tutorial, setTutorial] = useState(() => !load(KEYS.tutorial, false))
  const openHelp = useCallback(() => setTutorial(true), [])
  const closeHelp = useCallback(() => {
    save(KEYS.tutorial, true)
    setTutorial(false)
  }, [])
  useWakeLock(screen === 'game' && game !== null && game.phase !== 'end')

  // Sauvegarde continue : on reprend la partie après un verrouillage d'écran ou un rechargement.
  useEffect(() => {
    if (game && game.phase !== 'end') save(KEYS.game, game)
    else remove(KEYS.game)
  }, [game])

  // Bouton « retour » Android : jamais de sortie de l'app en pleine partie.
  const backRef = useRef<() => void>(() => undefined)
  useEffect(() => {
    backRef.current = () => {
      if (tutorial) closeHelp()
      else if (screen === 'setup') setScreen('home')
      else if (screen === 'game' && game && game.phase !== 'end') setQuitting((q) => !q)
      else if (screen === 'game') setScreen('home')
      else void NativeApp.exitApp()
    }
  })
  useEffect(() => {
    if (!isNative) return
    const sub = NativeApp.addListener('backButton', () => backRef.current())
    return () => void sub.then((h) => h.remove())
  }, [])

  // V1.1 : thèmes premium achetés → leurs questions (vérifiées côté serveur).
  useEffect(() => {
    if (!PACKS_ENABLED) return
    void refreshOwned().then(async () => {
      if (getOwnedThemes().length > 0) await syncPackQuestions(await getAppUserId())
    })
  }, [])

  // V1.3 : consentement publicitaire puis préchargement de la première pub (iOS, ADS=1 uniquement).
  // Au tout premier lancement, on attend la fermeture du tutoriel pour ne pas empiler les écrans.
  useEffect(() => {
    if (!tutorial) void startAds()
  }, [tutorial])

  // Questions à jour depuis Supabase : au lancement, puis à chaque retour au premier plan.
  useEffect(() => {
    void syncQuestions()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncQuestions()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [])

  // Mesure d'usage (Vercel Web Analytics) : une partie menée jusqu'au podium.
  const ended = game?.phase === 'end'
  useEffect(() => {
    if (ended) track('game_end')
  }, [ended])

  // Chaque écran repart en haut de page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, game?.phase, game?.index, game?.turn])

  /** Lance une partie ; false s'il n'y a aucune question jouable (thèmes indisponibles) : rien ne change. */
  const start = useCallback((wanted: GameConfig): boolean => {
    const questions = getQuestions()
    // Thèmes réellement disponibles (un thème premium peut avoir disparu depuis la dernière partie).
    const available = new Set(questions.map((q) => q.theme))
    const config = { ...wanted, themes: wanted.themes.filter((t) => available.has(t)) }
    const seen = loadSeen()
    // Un thème débloqué par une vidéo est mis en avant : le joueur doit en profiter.
    const featured = config.themes.filter((t) => adUnlockedThemes().includes(t))
    const rounds = buildRounds(questions, config, seen, Math.random, featured)
    if (rounds.length === 0) return false
    save(KEYS.config, config)
    markSeen(rounds.map((r) => r.question.id))
    // Un thème débloqué par une vidéo vaut pour une seule partie (la partie garde ses questions).
    consumeAdUnlocks(config.themes)
    dispatch({ type: 'start', config, rounds, duels: buildDuels(questions, rounds, config.themes, seen) })
    track('game_start', { mode: config.mode, players: config.names.length, end: config.end.type === 'rounds' ? `${config.end.count}q` : `${config.end.points}pts` })
    setScreen('game')
    return true
  }, [])

  const submit = useCallback((answer: Answer) => dispatch({ type: 'submit', answer }), [])

  const goHome = () => {
    setQuitting(false)
    dispatch({ type: 'quit' })
    setScreen('home')
  }
  const pause = () => {
    setQuitting(false)
    dispatch({ type: 'pause' })
    setScreen('home')
  }

  let content
  if (screen === 'setup') {
    content = <Setup initial={loadConfig()} onBack={() => setScreen('home')} onStart={start} onHelp={openHelp} />
  } else if (screen === 'home' || !game) {
    content = <Home canResume={game !== null && game.phase !== 'end'} onNew={() => setScreen('setup')} onResume={() => setScreen('game')} onHelp={openHelp} />
  } else if (game.phase === 'end') {
    content = (
      <EndScreen
        state={game}
        onReplay={() => {
          if (!start(game.config)) setScreen('setup')
        }}
        onHome={goHome}
      />
    )
  } else {
    content = (
      <div className="game">
        {(game.phase === 'question' || game.phase === 'reveal') && <GameHeader state={game} onQuit={() => setQuitting(true)} onHelp={openHelp} />}
        {game.phase === 'question' && <QuestionScreen state={game} onGo={() => dispatch({ type: 'beginAnswers' })} />}
        {game.phase === 'handoff' && <HandoffScreen state={game} onReady={() => dispatch({ type: 'ready', now: Date.now() })} onUndo={() => dispatch({ type: 'undo' })} />}
        {game.phase === 'input' && <InputScreen state={game} onSubmit={submit} />}
        {game.phase === 'allin' && <AllInScreen state={game} onReveal={() => dispatch({ type: 'reveal' })} onUndo={() => dispatch({ type: 'undo' })} />}
        {game.phase === 'reveal' && <RevealScreen state={game} onNext={() => dispatch({ type: 'next' })} onDuel={() => dispatch({ type: 'startDuel' })} />}
        {game.phase === 'duel' && <DuelScreen state={game} onResolve={(winners, guesses) => dispatch({ type: 'resolveDuel', winners, guesses })} />}
        {quitting && <QuitSheet onPause={pause} onAbandon={goHome} onCancel={() => setQuitting(false)} />}
      </div>
    )
  }

  return (
    <>
      {content}
      {tutorial && <Tutorial onClose={closeHelp} />}
    </>
  )
}
