// Fonction Edge « ad-unlock » : thème premium débloqué pour une partie grâce à une vidéo récompensée.
//
// Entrée  : POST { deviceId: string, action: 'status' }
//           → { remaining }            vidéos encore possibles sur 24 heures
//           POST { deviceId: string, action: 'claim', theme: string }
//           → { ready: false, remaining }                 le rappel de Google n'est pas (encore) arrivé
//           → { ready: true, remaining, questions: Row[] } droit consommé : une partie avec ce thème
//
// Le droit est créé par `ad-reward` (signature Google vérifiée), valable 3 heures et consommé une seule fois.
// Les questions payantes sont lues avec la clé service_role, jamais exposée à l'app.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const PAID_THEMES = ['football', 'rugby', 'cinema', 'musique', 'jo']
const DAILY_LIMIT = 3
const GRANT_HOURS = 3
const COLUMNS = 'id,theme,type,prompt,unit,answer,items,year,tolerance,subject,source,perishable,difficulty,verified_at,pack_id'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)

  let body: { deviceId?: unknown; action?: unknown; theme?: unknown }
  try {
    body = (await req.json()) ?? {}
  } catch {
    return json({ error: 'body' }, 400)
  }
  const deviceId = String(body.deviceId ?? '')
  if (!/^hn-[\w-]{8,64}$/.test(deviceId)) return json({ error: 'deviceId' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { count, error: countError } = await db
    .from('ad_grants')
    .select('transaction_id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .gte('created_at', since)
  if (countError) return json({ error: 'db' }, 500)
  const remaining = Math.max(0, DAILY_LIMIT - (count ?? 0))

  if (body.action === 'status') return json({ remaining })
  if (body.action !== 'claim') return json({ error: 'action' }, 400)

  const theme = String(body.theme ?? '')
  if (!PAID_THEMES.includes(theme)) return json({ error: 'theme' }, 400)

  // Dernier droit non utilisé pour ce thème, encore valable.
  const validSince = new Date(Date.now() - GRANT_HOURS * 3600_000).toISOString()
  const { data: grants, error: grantError } = await db
    .from('ad_grants')
    .select('transaction_id')
    .eq('device_id', deviceId)
    .eq('theme', theme)
    .is('used_at', null)
    .gte('created_at', validSince)
    .order('created_at', { ascending: false })
    .limit(1)
  if (grantError) return json({ error: 'db' }, 500)
  if (!grants?.length) return json({ ready: false, remaining })

  // Consommation atomique : deux appels simultanés ne peuvent pas utiliser le même droit.
  const { data: used, error: useError } = await db
    .from('ad_grants')
    .update({ used_at: new Date().toISOString() })
    .eq('transaction_id', grants[0].transaction_id)
    .is('used_at', null)
    .select('transaction_id')
  if (useError) return json({ error: 'db' }, 500)
  if (!used?.length) return json({ ready: false, remaining })

  const { data: packs, error: packsError } = await db.from('packs').select('id').eq('theme', theme)
  if (packsError || !packs?.length) return json({ error: 'packs' }, 500)
  const { data: questions, error } = await db
    .from('questions')
    .select(COLUMNS)
    .in('pack_id', packs.map((p) => p.id))
    .eq('status', 'published')
    .order('id')
  if (error) {
    // Le droit n'a pas servi : on le rend.
    await db.from('ad_grants').update({ used_at: null }).eq('transaction_id', grants[0].transaction_id)
    return json({ error: 'questions' }, 500)
  }

  return json({ ready: true, remaining, questions })
})
