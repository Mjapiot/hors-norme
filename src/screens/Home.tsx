import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { Ico } from '../components/Icons'
import { InstallHint } from '../components/InstallHint'
import { bankSource, useQuestionBank } from '../data/bank'
import { isAdmin } from '../lib/admin'

/** Pages légales hébergées sur le site (ouvertes dans le navigateur depuis l'app native). */
const SITE = 'https://hors-norme.vercel.app'

interface Props {
  canResume: boolean
  onHelp: () => void
  onNew: () => void
  onResume: () => void
}

export function Home({ canResume, onNew, onResume, onHelp }: Props) {
  const questions = useQuestionBank()
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

      <nav className="legal-links" aria-label="Informations">
        <a href={`${SITE}/support`} target="_blank" rel="noreferrer">Aide</a>
        <a href={`${SITE}/confidentialite`} target="_blank" rel="noreferrer">Confidentialité</a>
        <a href={`${SITE}/mentions-legales`} target="_blank" rel="noreferrer">Mentions légales</a>
      </nav>

      <p className="footnote">
        {questions.length} questions
        {isAdmin() && ` · admin : ${questions.filter((q) => q.verified_at).length} vérifiées · source ${bankSource() === 'remote' ? 'Supabase' : 'embarquée'}`}
      </p>
    </main>
  )
}
