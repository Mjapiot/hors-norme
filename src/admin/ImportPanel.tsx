import { useState } from 'react'
import { fromImport, validate } from './model'
import type { AdminQuestion } from './model'

interface Props {
  existingIds: Set<string>
  onImport: (rows: AdminQuestion[]) => Promise<string | null>
  onClose: () => void
}

/**
 * Import d'un lot (JSON) : par défaut au statut « À relire » pour validation.
 * Accepte un tableau d'objets au format du jeu (id, theme, type, prompt, unit, answer | items, source…).
 */
export function ImportPanel({ existingIds, onImport, onClose }: Props) {
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<AdminQuestion[] | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const analyse = () => {
    try {
      const raw = JSON.parse(text) as unknown
      if (!Array.isArray(raw)) throw new Error('Le JSON doit être un tableau.')
      const rows = raw.map((r) => fromImport(r as Record<string, unknown>))
      const issues = rows.flatMap((r) => validate(r).map((p) => `${r.id} : ${p}`))
      setPreview(rows)
      setProblems(issues)
    } catch (e) {
      setPreview(null)
      setProblems([e instanceof Error ? e.message : 'JSON invalide.'])
    }
  }

  const overwritten = preview?.filter((r) => existingIds.has(r.id)).length ?? 0

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Import de questions">
      <div className="admin-editor">
        <header>
          <h2>Importer un lot</h2>
          <button type="button" className="link" onClick={onClose}>
            Fermer
          </button>
        </header>
        <label className="admin-file">
          Choisir un fichier .json
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              setText(await file.text())
              setPreview(null)
              setProblems([])
            }}
          />
        </label>
        <p className="admin-meta">Ou colle un tableau JSON. Les questions arrivent au statut « À relire » sauf si un statut est précisé. Un identifiant existant est mis à jour.</p>
        <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder='[{ "theme": "sport", "type": "number", "prompt": "…", "unit": "m", "answer": 12.3, "source": "…" }]' />
        <div className="admin-row">
          <button type="button" className="btn btn-ghost small" onClick={analyse}>
            Analyser
          </button>
          <button
            type="button"
            className="btn btn-primary small"
            disabled={!preview || problems.length > 0 || busy}
            onClick={async () => {
              setBusy(true)
              const err = await onImport(preview!)
              setBusy(false)
              if (err) setProblems([err])
            }}
          >
            Importer {preview ? `${preview.length} question(s)` : ''}
          </button>
        </div>
        {preview && problems.length === 0 && (
          <p className="admin-meta">
            {preview.length} prête(s) · {overwritten} mise(s) à jour · {preview.length - overwritten} nouvelle(s)
          </p>
        )}
        {problems.length > 0 && (
          <ul className="admin-error">
            {problems.slice(0, 20).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
