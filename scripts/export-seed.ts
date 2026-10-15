/**
 * Génère la migration d'import des questions à partir de src/data/questions.ts (base embarquée).
 * (L'intégration GitHub de Supabase applique les migrations en production, pas seed.sql.)
 * Les URL de vérification (commentaires « // https://… ») sont reprises dans source_url.
 * Usage : npm run seed:export
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { QUESTIONS } from '../src/data/questions'

const file = readFileSync(new URL('../src/data/questions.ts', import.meta.url), 'utf8')
// Une question = une ligne commençant par n( ou r( — même ordre que le tableau QUESTIONS.
const lines = file.split('\n').filter((l) => /^\s*[nr]\(/.test(l))
if (lines.length !== QUESTIONS.length) throw new Error(`Lignes (${lines.length}) ≠ questions (${QUESTIONS.length})`)

const sql = (v: unknown): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const rows = QUESTIONS.map((q, i) => {
  const url = lines[i].match(/\/\/\s*(https?:\/\/\S+)/)?.[1] ?? null
  const reviewDue = q.perishable && q.verified_at ? sql(addMonths(q.verified_at, 6)) : 'null'
  return `(${[
    sql(q.id),
    sql(q.theme),
    sql(q.type),
    sql(q.prompt),
    sql(q.unit),
    q.type === 'number' ? sql(q.answer) : 'null',
    q.type === 'ranking' ? `${sql(JSON.stringify(q.items))}::jsonb` : 'null',
    sql(q.type === 'number' && q.year === true),
    sql(q.subject ?? null),
    sql(q.source),
    sql(url),
    sql(q.perishable),
    String(q.difficulty),
    `'published'`,
    sql(q.verified_at),
    reviewDue,
  ].join(', ')})`
})

function addMonths(isoDate: string, months: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

const out = `-- Généré par scripts/export-seed.ts — ne pas modifier à la main.
-- ${QUESTIONS.length} questions, toutes publiées dans le pack « classique ».
insert into public.questions
  (id, theme, type, prompt, unit, answer, items, year, subject, source, source_url, perishable, difficulty, status, verified_at, review_due_at)
values
${rows.join(',\n')}
on conflict (id) do update set
  theme = excluded.theme, type = excluded.type, prompt = excluded.prompt, unit = excluded.unit,
  answer = excluded.answer, items = excluded.items, year = excluded.year, subject = excluded.subject,
  source = excluded.source, source_url = excluded.source_url, perishable = excluded.perishable,
  difficulty = excluded.difficulty, verified_at = excluded.verified_at, review_due_at = excluded.review_due_at;
`
writeFileSync(new URL('../supabase/migrations/20261015120100_seed_questions.sql', import.meta.url), out)
console.log(`migration d'import : ${QUESTIONS.length} questions, ${rows.filter((r) => r.includes("'http")).length} avec URL de source`)
