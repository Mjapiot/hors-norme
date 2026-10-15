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
          <li>
            Précision : <strong>3 pts</strong> si tout pile, <strong>2 pts</strong> à moins de 5 %, <strong>1 pt</strong> à moins de 20 %, sinon 0.
          </li>
          <li>Le plus proche gagne +1 (s’il a marqué). Égalité parfaite : duel de rapidité.</li>
          <li>À partir de 3 équipes, une réponse « Hors Norme » (plus du double ou moins de la moitié) coûte 1 point.</li>
          <li>Une manche bonus toutes les 4 questions, et la dernière question compte double.</li>
        </ol>
      </details>

      <p className="footnote">{QUESTIONS.length} questions · version bêta, réponses en cours de vérification</p>
    </main>
  )
}
