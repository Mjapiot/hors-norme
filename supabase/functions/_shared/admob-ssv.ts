// Vérification côté serveur (SSV) des vidéos récompensées AdMob.
//
// Quand un joueur a regardé une vidéo jusqu'au bout, Google appelle notre fonction avec une URL du type :
//   ?ad_network=…&ad_unit=…&custom_data=…&reward_amount=1&reward_item=…&timestamp=…&transaction_id=…
//    &user_id=…&signature=…&key_id=…
// La signature (ECDSA P-256 / SHA-256, encodée DER puis en base64 « web-safe ») porte sur toute la chaîne
// de requête jusqu'à « &signature= » exclu. Les clés publiques sont publiées par Google.
// Code sans dépendance Deno : il est aussi testé avec Vitest (src/lib/admob-ssv.test.ts).

export const GOOGLE_KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json'

export interface VerifierKey {
  keyId: number
  /** Clé publique SPKI en base64. */
  base64: string
}

export interface RewardCallback {
  transactionId: string
  userId: string
  customData: string
  adUnit: string
  timestamp: number
}

function fromBase64(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const bin = atob(padded)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Signature ECDSA DER (SEQUENCE { r, s }) → format brut r‖s de 64 octets attendu par WebCrypto. */
export function derToRaw(der: Uint8Array): Uint8Array<ArrayBuffer> | null {
  if (der[0] !== 0x30) return null
  let offset = 2
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f)
  const out = new Uint8Array(64)
  for (let part = 0; part < 2; part++) {
    if (der[offset] !== 0x02) return null
    const len = der[offset + 1]
    let value = der.subarray(offset + 2, offset + 2 + len)
    while (value.length > 32 && value[0] === 0) value = value.subarray(1)
    if (value.length > 32) return null
    out.set(value, part * 32 + (32 - value.length))
    offset += 2 + len
  }
  return out
}

/** Découpe la chaîne de requête brute (encodée telle que reçue) en message signé + paramètres. */
export function splitQuery(rawQuery: string): { message: string; params: URLSearchParams } | null {
  const query = rawQuery.startsWith('?') ? rawQuery.slice(1) : rawQuery
  const at = query.indexOf('&signature=')
  if (at <= 0) return null
  return { message: query.slice(0, at), params: new URLSearchParams(query) }
}

/** Vrai si la signature est valide pour l'une des clés de Google. */
export async function verifySignature(rawQuery: string, keys: VerifierKey[]): Promise<boolean> {
  const parts = splitQuery(rawQuery)
  if (!parts) return false
  const signature = parts.params.get('signature')
  const keyId = Number(parts.params.get('key_id'))
  const key = keys.find((k) => k.keyId === keyId)
  if (!signature || !key) return false
  const raw = derToRaw(fromBase64(signature))
  if (!raw) return false
  try {
    const publicKey = await crypto.subtle.importKey('spki', fromBase64(key.base64), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, raw, new TextEncoder().encode(parts.message))
  } catch {
    return false
  }
}

/** Paramètres utiles d'un rappel (déjà vérifié). Null s'il manque un champ indispensable. */
export function readCallback(rawQuery: string): RewardCallback | null {
  const parts = splitQuery(rawQuery)
  if (!parts) return null
  const p = parts.params
  const transactionId = p.get('transaction_id') ?? ''
  const userId = p.get('user_id') ?? ''
  const customData = p.get('custom_data') ?? ''
  const timestamp = Number(p.get('timestamp'))
  if (!transactionId || !userId || !Number.isFinite(timestamp)) return null
  return { transactionId, userId, customData, adUnit: p.get('ad_unit') ?? '', timestamp }
}
