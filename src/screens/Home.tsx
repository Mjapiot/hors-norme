import { InstallHint } from '../components/InstallHint'
import { QUESTIONS } from '../data/questions'

interface Props {
  canResume: boolean
  onNew: () => void
  onResume: () => void
}

export function Home({ canResume, onNew, onResume }: Props) {
  return (
    <main className="screen home">
      <div className="home-hero">
        <p className="eyebrow">Le jeu des records</p>
        <h1 className="logo">
          Hors
          <br />
          <span>Norme</span>
        </h1>
        <p className="tagline">Le plus grand, le plus vieux, le plus rapide… Qui tombera le plus près ?</p>
      </div>

      <div className="stack">
        {canResume && (
          <button type="button" className="btn btn-primary" onClick={onResume}>
            Reprendre la partie
          </button>
        )}
        <button type="button" className={canResume ? 'btn btn-ghost' : 'btn btn-primary'} onClick={onNew}>
          Nouvelle partie
        </button>
      </div>

      <InstallHint />

      <details className="rules">
        <summary>Comment on joue ?</summary>
        <ol>
          <li>Une question « le plus… » s’affiche : tout le monde la lit.</li>
          <li>On se passe le téléphone : chaque équipe tape son chiffre en secret.</li>
          <li>Révélation ! Le plus proche marque 3 pts, le 2e 2 pts, le 3e 1 pt.</li>
          <li>Bonus : +1 si tu es à moins de 5 %, +3 si c’est <em>tout pile</em>.</li>
          <li>Toutes les 4 questions : une manche bonus (chrono, classement, plus ou moins).</li>
        </ol>
      </details>

      <p className="footnote">{QUESTIONS.length} questions · version bêta, réponses en cours de vérification</p>
    </main>
  )
}
