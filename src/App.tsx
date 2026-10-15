import { useCallback, useEffect, useReducer, useState } from 'react'
import { QUESTIONS } from './data/questions'
import { buildDuels, buildRounds } from './game/deck'
import { reducer, resumeState } from './game/engine'
import type { Answer, GameConfig, GameState } from './game/types'
import { KEYS, load, loadSeen, markSeen, remove, save } from './lib/storage'
import { Home } from './screens/Home'
import { DEFAULT_CONFIG, Setup } from './screens/Setup'
import { AllInScreen, DuelScreen, GameHeader, HandoffScreen, InputScreen, QuestionScreen } from './screens/GameScreens'
import { useWakeLock } from './lib/wakeLock'
import { track } from '@vercel/analytics'
import { EndScreen, RevealScreen } from './screens/Reveal'

type Screen = 'home' | 'setup' | 'game'

export default function App() {
  const [game, dispatch] = useReducer(reducer, null, () => resumeState(load<GameState | null>(KEYS.game, null)))
  const [screen, setScreen] = useState<Screen>('home')
  useWakeLock(screen === 'game' && game !== null && game.phase !== 'end')

  // Sauvegarde continue : on reprend la partie après un verrouillage d'écran ou un rechargement.
  useEffect(() => {
    if (game && game.phase !== 'end') save(KEYS.game, game)
    else remove(KEYS.game)
  }, [game])

  // Mesure d'usage (Vercel Web Analytics) : une partie menée jusqu'au podium.
  const ended = game?.phase === 'end'
  useEffect(() => {
    if (ended) track('game_end')
  }, [ended])

  // Chaque écran repart en haut de page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen, game?.phase, game?.index, game?.turn])

  const start = useCallback((config: GameConfig) => {
    save(KEYS.config, config)
    const rounds = buildRounds(QUESTIONS, config, loadSeen())
    markSeen(rounds.map((r) => r.question.id))
    dispatch({ type: 'start', config, rounds, duels: buildDuels(QUESTIONS, rounds) })
    track('game_start', { mode: config.mode, players: config.names.length, end: config.end.type === 'rounds' ? `${config.end.count}q` : `${config.end.points}pts` })
    setScreen('game')
  }, [])

  const submit = useCallback((answer: Answer) => dispatch({ type: 'submit', answer }), [])

  const goHome = () => {
    dispatch({ type: 'quit' })
    setScreen('home')
  }

  if (screen === 'setup') {
    return <Setup initial={load(KEYS.config, DEFAULT_CONFIG)} onBack={() => setScreen('home')} onStart={start} />
  }

  if (screen === 'home' || !game) {
    return <Home canResume={game !== null && game.phase !== 'end'} onNew={() => setScreen('setup')} onResume={() => setScreen('game')} />
  }

  if (game.phase === 'end') {
    return <EndScreen state={game} onReplay={() => start(game.config)} onHome={goHome} />
  }

  return (
    <div className="game">
      {(game.phase === 'question' || game.phase === 'reveal') && <GameHeader state={game} onQuit={goHome} />}
      {game.phase === 'question' && <QuestionScreen state={game} onGo={() => dispatch({ type: 'beginAnswers' })} />}
      {game.phase === 'handoff' && <HandoffScreen state={game} onReady={() => dispatch({ type: 'ready' })} onUndo={() => dispatch({ type: 'undo' })} />}
      {game.phase === 'input' && <InputScreen state={game} onSubmit={submit} />}
      {game.phase === 'allin' && <AllInScreen state={game} onReveal={() => dispatch({ type: 'reveal' })} onUndo={() => dispatch({ type: 'undo' })} />}
      {game.phase === 'reveal' && <RevealScreen state={game} onNext={() => dispatch({ type: 'next' })} onDuel={() => dispatch({ type: 'startDuel' })} />}
      {game.phase === 'duel' && <DuelScreen state={game} onResolve={(winner) => dispatch({ type: 'resolveDuel', winner })} />}
    </div>
  )
}
