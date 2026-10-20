/**
 * Copie les questions publiées de Supabase dans src/data/snapshot.json : c'est la base embarquée dans l'app
 * (utilisée hors connexion tant que la première synchronisation n'a pas eu lieu). À relancer avant chaque version.
 * Usage : npm run questions:pull   (lit SUPABASE_URL / SUPABASE_ANON_KEY dans .env.local)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { rowToQuestion } from '../src/data/remote'
import type { QuestionRow } from '../src/data/remote'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL
const key = env.SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY manquants dans .env.local')

const cols = 'id,theme,type,prompt,unit,answer,items,year,tolerance,subject,source,perishable,difficulty,verified_at'
const res = await fetch(`${url}/rest/v1/questions?select=${cols}&status=eq.published&order=id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
})
if (!res.ok) throw new Error(`Supabase : ${res.status} ${await res.text()}`)
const questions = ((await res.json()) as QuestionRow[]).map(rowToQuestion).filter(Boolean)
if (questions.length < 200) throw new Error(`Seulement ${questions.length} questions : snapshot refusé.`)
writeFileSync('src/data/snapshot.json', JSON.stringify(questions))
console.log(`snapshot.json : ${questions.length} questions publiées`)
