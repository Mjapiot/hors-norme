import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import { THEMES } from '../game/types'
import type { Theme } from '../game/types'
import { SUPABASE_KEY, SUPABASE_URL, hasRemote } from '../data/remote'
import { formatNumber } from '../lib/format'
import { QuestionEditor } from './QuestionEditor'
import { ImportPanel } from './ImportPanel'
import { blankQuestion, isDue, STATUS_LABELS } from './model'
import type { AdminQuestion, Status } from './model'
import './admin.css'

/*
 * Back-office (route /admin) : chargé à la demande, jamais par les joueurs.
 * Connexion par lien e-mail ; seuls les e-mails de la table admin_emails peuvent modifier (RLS).
 */

const supabase = hasRemote ? createClient(SUPABASE_URL!, SUPABASE_KEY!) : null
const ALL_THEMES = Object.keys(THEMES) as Theme[]

type Filter = 'all' | Status | 'unverified' | 'due'

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    document.body.classList.add('admin-mode')
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!supabase) {
    return (
      <main className="admin admin-center">
        <h1>Back-office Hors Norme</h1>
        <p>Supabase n’est pas configuré : ajoute VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.</p>
      </main>
    )
  }
  if (!ready) return <main className="admin admin-center">Chargement…</main>
  if (!session) return <Login />
  return <Dashboard session={session} />
}

function Login() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')
  return (
    <main className="admin admin-center">
      <h1>Back-office Hors Norme</h1>
      {state === 'sent' ? (
        <p>Lien de connexion envoyé à {email}. Ouvre-le sur cet appareil.</p>
      ) : (
        <form
          className="admin-login"
          onSubmit={async (e) => {
            e.preventDefault()
            setState('sending')
            const { error: err } = await supabase!.auth.signInWithOtp({
              email: email.trim().toLowerCase(),
              options: { emailRedirectTo: `${window.location.origin}/admin`, shouldCreateUser: true },
            })
            if (err) {
              setError(err.message)
              setState('error')
            } else setState('sent')
          }}
        >
          <label>
            E-mail administrateur
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
            Recevoir un lien de connexion
          </button>
          {state === 'error' && <p className="admin-error">{error}</p>}
        </form>
      )}
    </main>
  )
}

function Dashboard({ session }: { session: Session }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [theme, setTheme] = useState<Theme | 'all'>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminQuestion | null>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase!.from('questions').select('*').order('id').range(0, 4999)
    if (error) setMessage(`Erreur de chargement : ${error.message}`)
    else setQuestions(data as AdminQuestion[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void supabase!.rpc('is_admin').then(({ data }) => {
      setIsAdmin(data === true)
      if (data === true) void reload()
    })
  }, [reload])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: questions.length, draft: 0, review: 0, published: 0, archived: 0, unverified: 0, due: 0 }
    for (const q of questions) {
      c[q.status]++
      if (!q.verified_at) c.unverified++
      if (isDue(q)) c.due++
    }
    return c
  }, [questions])

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase()
    return questions.filter((q) => {
      if (theme !== 'all' && q.theme !== theme) return false
      if (filter === 'unverified' && q.verified_at) return false
      if (filter === 'due' && !isDue(q)) return false
      if (filter !== 'all' && filter !== 'unverified' && filter !== 'due' && q.status !== filter) return false
      return !s || q.prompt.toLowerCase().includes(s) || q.id.includes(s) || (q.subject ?? '').toLowerCase().includes(s)
    })
  }, [questions, filter, theme, search])

  const save = async (q: AdminQuestion) => {
    const { updated_at: _ignored, ...row } = q
    void _ignored
    const { error } = await supabase!.from('questions').upsert(row)
    if (error) return error.message
    setMessage(`« ${q.id} » enregistrée.`)
    setEditing(null)
    await reload()
    return null
  }

  const remove = async (q: AdminQuestion) => {
    const { error } = await supabase!.from('questions').delete().eq('id', q.id)
    if (error) return error.message
    setMessage(`« ${q.id} » supprimée.`)
    setEditing(null)
    await reload()
    return null
  }

  const signOut = () => void supabase!.auth.signOut()

  if (isAdmin === null) return <main className="admin admin-center">Vérification des droits…</main>
  if (!isAdmin) {
    return (
      <main className="admin admin-center">
        <h1>Accès refusé</h1>
        <p>{session.user.email} n’est pas administrateur.</p>
        <button type="button" className="btn btn-ghost" onClick={signOut}>
          Se déconnecter
        </button>
      </main>
    )
  }

  const filters: [Filter, string][] = [
    ['all', 'Toutes'],
    ['review', STATUS_LABELS.review],
    ['draft', STATUS_LABELS.draft],
    ['published', STATUS_LABELS.published],
    ['archived', STATUS_LABELS.archived],
    ['unverified', 'Non vérifiées'],
    ['due', 'À revérifier'],
  ]

  return (
    <main className="admin">
      <header className="admin-header">
        <h1>Hors Norme · questions</h1>
        <div className="admin-actions">
          <button type="button" className="btn btn-primary small" onClick={() => setEditing(blankQuestion(theme === 'all' ? 'insolite' : theme))}>
            Nouvelle question
          </button>
          <button type="button" className="btn btn-ghost small" onClick={() => setImporting(true)}>
            Importer
          </button>
          <button type="button" className="link" onClick={signOut}>
            Déconnexion ({session.user.email})
          </button>
        </div>
      </header>

      {message && (
        <p className="admin-message" role="status">
          {message}
        </p>
      )}

      <div className="admin-filters">
        <div className="chips">
          {filters.map(([key, label]) => (
            <button key={key} type="button" className={`chip${filter === key ? ' active' : ''}`} onClick={() => setFilter(key)}>
              {label} <span className="admin-count">{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="admin-row">
          <select value={theme} onChange={(e) => setTheme(e.target.value as Theme | 'all')} aria-label="Thème">
            <option value="all">Tous les thèmes</option>
            {ALL_THEMES.map((t) => (
              <option key={t} value={t}>
                {THEMES[t].label}
              </option>
            ))}
          </select>
          <input type="search" placeholder="Rechercher (énoncé, id, sujet)…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Question</th>
              <th>Réponse</th>
              <th>Statut</th>
              <th>Vérifiée</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((q) => (
              <tr key={q.id} onClick={() => setEditing(q)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setEditing(q)}>
                <td>
                  <span className="admin-id">
                    {q.id} · {THEMES[q.theme].label}
                  </span>
                  {q.prompt}
                </td>
                <td className="admin-answer">
                  {q.type === 'number' ? `${formatNumber(q.answer ?? 0, q.year)} ${q.unit}` : 'Classement'}
                </td>
                <td>
                  <span className={`admin-status status-${q.status}`}>{STATUS_LABELS[q.status]}</span>
                </td>
                <td className={isDue(q) ? 'admin-due' : ''}>{q.verified_at ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="admin-foot">{visible.length} question(s) affichée(s)</p>

      {editing && <QuestionEditor question={editing} isNew={!questions.some((q) => q.id === editing.id)} onSave={save} onDelete={remove} onClose={() => setEditing(null)} />}
      {importing && (
        <ImportPanel
          existingIds={new Set(questions.map((q) => q.id))}
          onImport={async (rows) => {
            const { error } = await supabase!.from('questions').upsert(rows)
            if (error) return error.message
            setMessage(`${rows.length} question(s) importée(s).`)
            setImporting(false)
            await reload()
            return null
          }}
          onClose={() => setImporting(false)}
        />
      )}
    </main>
  )
}
