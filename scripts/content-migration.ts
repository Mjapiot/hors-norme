/**
 * Transforme des fichiers d'import (content/imports/*.json) en migration SQL appliquée en production
 * par l'intégration GitHub de Supabase. Aucune clé secrète nécessaire.
 *
 * Garde-fous :
 *  - question existante : mise à jour SEULEMENT si elle n'a jamais été modifiée depuis le back-office
 *    (admin_edited_at null) → une correction faite par un admin n'est jamais écrasée ;
 *  - nouvelle question : insérée, jamais en remplacement d'une question existante (on conflict do nothing).
 *
 * Usage : npx tsx scripts/content-migration.ts <nom> content/imports/a.json [b.json …]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { addMonths, fromImport, REVIEW_MONTHS, validate } from '../src/admin/model'
import type { AdminQuestion } from '../src/admin/model'

const [name, ...files] = process.argv.slice(2)
if (!name || files.length === 0) throw new Error('Usage : content-migration <nom> <fichiers…>')

const rows: AdminQuestion[] = files
  .flatMap((f) => (JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>[]).map((r) => fromImport(r)))
  // Record périssable vérifié : revérification programmée à +6 mois si l'agent ne l'a pas fixée.
  .map((r) => (r.perishable && r.verified_at && !r.review_due_at ? { ...r, review_due_at: addMonths(r.verified_at, REVIEW_MONTHS) } : r))
const problems = rows.flatMap((r) => validate(r).map((p) => `${r.id} : ${p}`))
if (problems.length) throw new Error(`Données invalides :\n${problems.join('\n')}`)
const ids = rows.map((r) => r.id)
if (new Set(ids).size !== ids.length) throw new Error('Identifiants en double dans les fichiers.')

const sql = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}
const COLS = ['id', 'pack_id', 'theme', 'type', 'prompt', 'unit', 'answer', 'items', 'year', 'tolerance', 'subject', 'source', 'source_url', 'perishable', 'difficulty', 'status', 'verified_at', 'review_due_at', 'notes'] as const
const values = (r: AdminQuestion) =>
  `(${COLS.map((c) => {
    if (c === 'items') return r.items ? `${sql(JSON.stringify(r.items))}::jsonb` : 'null'
    if (c === 'type') return `${sql(r.type)}::public.question_type`
    if (c === 'status') return `${sql(r.status)}::public.question_status`
    return sql(r[c])
  }).join(', ')})`

const updatable = COLS.filter((c) => c !== 'id' && c !== 'pack_id')
// Horodatage strictement postérieur à toutes les migrations existantes (l'ordre d'application en dépend).
const now = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const latest = readdirSync('supabase/migrations').map((f) => f.slice(0, 14)).sort().at(-1) ?? '0'
const stamp = now > latest ? now : String(BigInt(latest) + 1n)
const out = `-- Contenu « ${name} » — généré par scripts/content-migration.ts (${rows.length} questions).
-- Mise à jour uniquement des questions jamais modifiées dans le back-office (admin_edited_at null).
insert into public.questions (${COLS.join(', ')})
values
${rows.map(values).join(',\n')}
on conflict (id) do update set
  ${updatable.map((c) => `${c} = excluded.${c}`).join(',\n  ')}
where public.questions.admin_edited_at is null;
`
const path = `supabase/migrations/${stamp}_${name}.sql`
writeFileSync(path, out)
const by = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {})
console.log(`${path} : ${rows.length} questions ${JSON.stringify(by)}`)
