import { useState } from 'react'
import { THEMES } from '../game/types'
import type { Theme } from '../game/types'
import { markVerified, STATUS_LABELS, validate } from './model'
import type { AdminQuestion, Status } from './model'

const ALL_THEMES = Object.keys(THEMES) as Theme[]
const EMPTY_ITEMS = [0, 1, 2, 3].map(() => ({ label: '', value: 0 }))

interface Props {
  question: AdminQuestion
  isNew: boolean
  onSave: (q: AdminQuestion) => Promise<string | null>
  onDelete: (q: AdminQuestion) => Promise<string | null>
  onClose: () => void
}

export function QuestionEditor({ question, isNew, onSave, onDelete, onClose }: Props) {
  const [q, setQ] = useState<AdminQuestion>(question)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof AdminQuestion>(key: K, value: AdminQuestion[K]) => setQ((prev) => ({ ...prev, [key]: value }))

  const submit = async (next: AdminQuestion) => {
    const problems = validate(next)
    if (problems.length) {
      setError(problems.join(' '))
      return
    }
    setBusy(true)
    const err = await onSave(next)
    setBusy(false)
    if (err) setError(err)
  }

  const items = q.items ?? EMPTY_ITEMS

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Édition de la question">
      <form
        className="admin-editor"
        onSubmit={(e) => {
          e.preventDefault()
          void submit(q)
        }}
      >
        <header>
          <h2>{isNew ? 'Nouvelle question' : q.id}</h2>
          <button type="button" className="link" onClick={onClose}>
            Fermer
          </button>
        </header>

        <div className="admin-grid">
          {isNew && (
            <label>
              Identifiant
              <input value={q.id} onChange={(e) => set('id', e.target.value)} />
            </label>
          )}
          <label>
            Thème
            <select value={q.theme} onChange={(e) => set('theme', e.target.value as Theme)}>
              {ALL_THEMES.map((t) => (
                <option key={t} value={t}>
                  {THEMES[t].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as AdminQuestion['type']
                setQ((prev) => ({ ...prev, type, answer: type === 'number' ? (prev.answer ?? 0) : null, items: type === 'ranking' ? (prev.items ?? EMPTY_ITEMS) : null }))
              }}
            >
              <option value="number">Réponse chiffrée</option>
              <option value="ranking">Classement (4 éléments)</option>
            </select>
          </label>
          <label>
            Statut
            <select value={q.status} onChange={(e) => set('status', e.target.value as Status)}>
              {(Object.keys(STATUS_LABELS) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulté
            <select value={q.difficulty} onChange={(e) => set('difficulty', Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}>1 · facile</option>
              <option value={2}>2 · moyen</option>
              <option value={3}>3 · difficile</option>
            </select>
          </label>
          <label>
            Pack
            <input value={q.pack_id} onChange={(e) => set('pack_id', e.target.value)} />
          </label>
        </div>

        <label>
          Énoncé
          <textarea rows={3} value={q.prompt} onChange={(e) => set('prompt', e.target.value)} />
        </label>

        {q.type === 'number' ? (
          <div className="admin-grid">
            <label>
              Réponse
              <input type="number" step="any" value={q.answer ?? ''} onChange={(e) => set('answer', e.target.value === '' ? null : Number(e.target.value))} />
            </label>
            <label>
              Unité
              <input value={q.unit} onChange={(e) => set('unit', e.target.value)} placeholder="m, kg, ans…" />
            </label>
            <label className="admin-check">
              <input type="checkbox" checked={q.year} onChange={(e) => set('year', e.target.checked)} /> La réponse est une année
            </label>
          </div>
        ) : (
          <fieldset className="admin-items">
            <legend>Éléments (n’importe quel ordre : le jeu trie par valeur)</legend>
            <label>
              Unité
              <input value={q.unit} onChange={(e) => set('unit', e.target.value)} />
            </label>
            {items.map((it, i) => (
              <div key={i} className="admin-row">
                <input
                  placeholder={`Élément ${i + 1}`}
                  value={it.label}
                  onChange={(e) => set('items', items.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                />
                <input
                  type="number"
                  step="any"
                  value={it.value}
                  onChange={(e) => set('items', items.map((x, k) => (k === i ? { ...x, value: Number(e.target.value) } : x)))}
                />
              </div>
            ))}
          </fieldset>
        )}

        <div className="admin-grid">
          <label>
            Source
            <input value={q.source} onChange={(e) => set('source', e.target.value)} placeholder="Guinness World Records…" />
          </label>
          <label>
            URL de la source
            <input type="url" value={q.source_url ?? ''} onChange={(e) => set('source_url', e.target.value || null)} />
          </label>
          <label>
            Sujet (anti-recoupement)
            <input value={q.subject ?? ''} onChange={(e) => set('subject', e.target.value || null)} placeholder="ex. burj-khalifa" />
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={q.perishable} onChange={(e) => set('perishable', e.target.checked)} /> Record susceptible d’évoluer
          </label>
        </div>

        <label>
          Notes internes
          <textarea rows={2} value={q.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        <p className="admin-meta">
          Vérifiée le {q.verified_at ?? '—'} · prochaine vérification {q.review_due_at ?? '—'}
          {q.source_url && (
            <>
              {' · '}
              <a href={q.source_url} target="_blank" rel="noreferrer">
                ouvrir la source
              </a>
            </>
          )}
        </p>

        {error && <p className="admin-error">{error}</p>}

        <footer>
          {!isNew && (
            <button
              type="button"
              className="link admin-danger"
              onClick={async () => {
                if (!window.confirm(`Supprimer définitivement « ${q.id} » ? (Préfère « Archivée » pour la retirer du jeu.)`)) return
                const err = await onDelete(q)
                if (err) setError(err)
              }}
            >
              Supprimer
            </button>
          )}
          <button type="button" className="btn btn-ghost small" disabled={busy} onClick={() => void submit(markVerified(q))}>
            Vérifiée aujourd’hui + enregistrer
          </button>
          <button type="button" className="btn btn-ghost small" disabled={busy} onClick={() => void submit({ ...markVerified(q), status: 'published' })}>
            Vérifier + publier
          </button>
          <button type="submit" className="btn btn-primary small" disabled={busy}>
            Enregistrer
          </button>
        </footer>
      </form>
    </div>
  )
}
