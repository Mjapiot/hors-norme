// Fonction Edge « pack-questions » : renvoie les questions des thèmes premium achetés.
//
// Entrée  : POST { appUserId: string }  (identifiant RevenueCat anonyme de l'appareil)
// Sortie  : { themes: string[], questions: Row[] }
//
// L'achat est vérifié côté serveur auprès de RevenueCat (clé secrète REVENUECAT_SECRET_KEY,
// à définir dans Supabase → Edge Functions → Secrets). Les questions payantes sont lues avec la
// clé service_role (fournie automatiquement par Supabase), jamais exposée à l'app.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const COLUMNS = 'id,theme,type,prompt,unit,answer,items,year,tolerance,subject,source,perishable,difficulty,verified_at,pack_id'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let appUserId = ''
  try {
    appUserId = String((await req.json())?.appUserId ?? '')
  } catch {
    return json({ error: 'body' }, 400)
  }
  if (!/^[\w$:.-]{3,128}$/.test(appUserId)) return json({ error: 'appUserId' }, 400)

  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY')
  if (!rcKey) return json({ error: 'config' }, 500)

  // 1. Droits actifs chez RevenueCat
  const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: { Authorization: `Bearer ${rcKey}`, 'Content-Type': 'application/json' },
  })
  if (!rc.ok) return json({ error: 'revenuecat', status: rc.status }, 502)
  const entitlements: Record<string, { expires_date: string | null }> = (await rc.json())?.subscriber?.entitlements ?? {}
  const now = Date.now()
  const active = Object.entries(entitlements)
    .filter(([, e]) => e.expires_date === null || Date.parse(e.expires_date) > now)
    .map(([id]) => id)
  if (active.length === 0) return json({ themes: [], questions: [] })

  // 2. Packs correspondants, puis leurs questions publiées
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const { data: packs, error: packsError } = await db.from('packs').select('id,theme').in('entitlement', active)
  if (packsError) return json({ error: 'packs' }, 500)
  if (!packs?.length) return json({ themes: [], questions: [] })

  const { data: questions, error } = await db
    .from('questions')
    .select(COLUMNS)
    .in('pack_id', packs.map((p) => p.id))
    .eq('status', 'published')
    .order('id')
  if (error) return json({ error: 'questions' }, 500)

  return json({ themes: packs.map((p) => p.theme), questions })
})
