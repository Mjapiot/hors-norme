import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { Ico } from '../components/Icons'
import { InstallHint } from '../components/InstallHint'
import { QUESTIONS } from '../data/questions'
import { isAdmin } from '../lib/admin'

interface Props {
  canResume: boolean
  onHelp: () => void
  onNew: () => void
  onResume: () => void
}

export function Home({ canResume, onNew, onResume, onHelp }: Props) {
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

      <button type="button" className="btn btn-ghost btn-icon" onClick={onHelp}>
        <Ico icon={Question} size={22} /> Comment on joue&nbsp;?
      </button>

      <p className="footnote">
        {QUESTIONS.length} questions
        {isAdmin() && ` · admin : ${QUESTIONS.filter((q) => q.verified_at).length} vérifiées`}
      </p>
    </main>
  )
}
