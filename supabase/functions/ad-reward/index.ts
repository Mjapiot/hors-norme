// Fonction Edge « ad-reward » : rappel de vérification côté serveur (SSV) des vidéos récompensées AdMob.
//
// Appelée par Google (GET), jamais par l'app. URL à saisir dans AdMob → bloc « Récompensé » →
// Vérification côté serveur : https://<projet>.supabase.co/functions/v1/ad-reward
// Déploiement sans vérification du jeton Supabase (voir supabase/config.toml) : la preuve est la signature.
//
// Une vidéo valide crée un droit (table ad_grants) : cet appareil peut jouer une partie avec ce thème
// dans les 3 heures. Au plus 3 droits par appareil et par 24 heures.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { GOOGLE_KEYS_URL, readCallback, verifySignature } from '../_shared/admob-ssv.ts'
import type { VerifierKey } from '../_shared/admob-ssv.ts'

const PAID_THEMES = ['football', 'rugby', 'cinema', 'musique', 'jo']
export const DAILY_LIMIT = 3

let cachedKeys: { keys: VerifierKey[]; at: number } | null = null

/** Clés publiques de Google, gardées 6 heures (rechargées si une clé est inconnue). */
async function googleKeys(force = false): Promise<VerifierKey[]> {
  if (!force && cachedKeys && Date.now() - cachedKeys.at < 6 * 3600_000) return cachedKeys.keys
  const res = await fetch(GOOGLE_KEYS_URL)
  if (!res.ok) throw new Error('keys')
  const keys = ((await res.json())?.keys ?? []) as VerifierKey[]
  cachedKeys = { keys, at: Date.now() }
  return keys
}

const text = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/plain' } })

Deno.serve(async (req) => {
  if (req.method !== 'GET') return text('method', 405)
  const query = new URL(req.url).search

  let valid = await verifySignature(query, await googleKeys().catch(() => []))
  if (!valid) valid = await verifySignature(query, await googleKeys(true).catch(() => []))
  if (!valid) return text('signature', 403)

  const reward = readCallback(query)
  // Rappel valide mais incomplet (ex. bouton « Vérifier l'URL » d'AdMob) : rien à enregistrer.
  if (!reward || !PAID_THEMES.includes(reward.customData) || !/^hn-[\w-]{8,64}$/.test(reward.userId)) return text('ok')

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const since = new Date(Date.now() - 24 * 3600_000).toISOString()
  const { count, error: countError } = await db
    .from('ad_grants')
    .select('transaction_id', { count: 'exact', head: true })
    .eq('device_id', reward.userId)
    .gte('created_at', since)
  if (countError) return text('db', 500)
  // Plafond atteint : on répond 200 pour que Google ne réessaie pas, sans créer de droit.
  if ((count ?? 0) >= DAILY_LIMIT) return text('limit')

  const { error } = await db
    .from('ad_grants')
    .upsert(
      { transaction_id: reward.transactionId, device_id: reward.userId, theme: reward.customData, ad_unit: reward.adUnit },
      { onConflict: 'transaction_id', ignoreDuplicates: true },
    )
  // En cas d'erreur, Google réessaiera plus tard.
  if (error) return text('db', 500)
  return text('ok')
})
