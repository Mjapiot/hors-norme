import { describe, expect, it } from 'vitest'
import { derToRaw, readCallback, verifySignature } from '../../supabase/functions/_shared/admob-ssv'
import type { VerifierKey } from '../../supabase/functions/_shared/admob-ssv'

/** r‖s → DER, comme les signatures envoyées par Google. */
function rawToDer(raw: Uint8Array): Uint8Array {
  const int = (bytes: Uint8Array) => {
    let v = bytes
    while (v.length > 1 && v[0] === 0 && !(v[1] & 0x80)) v = v.subarray(1)
    if (v[0] & 0x80) v = Uint8Array.from([0, ...v])
    return [0x02, v.length, ...v]
  }
  const body = [...int(raw.subarray(0, 32)), ...int(raw.subarray(32))]
  return Uint8Array.from([0x30, body.length, ...body])
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function signedQuery(message: string, keyId = 1234) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
  const raw = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, new TextEncoder().encode(message)))
  const keys: VerifierKey[] = [{ keyId, base64: btoa(String.fromCharCode(...spki)) }]
  return { query: `${message}&signature=${b64url(rawToDer(raw))}&key_id=${keyId}`, keys }
}

const MESSAGE =
  'ad_network=5450213213286189855&ad_unit=1234567890&custom_data=football&reward_amount=1&reward_item=partie&timestamp=1761475200000&transaction_id=abc123&user_id=hn-device-42'

describe('vérification SSV AdMob', () => {
  it('accepte une signature valide', async () => {
    const { query, keys } = await signedQuery(MESSAGE)
    expect(await verifySignature(query, keys)).toBe(true)
    expect(await verifySignature(`?${query}`, keys)).toBe(true)
  })

  it('refuse un rappel modifié (autre thème)', async () => {
    const { query, keys } = await signedQuery(MESSAGE)
    expect(await verifySignature(query.replace('custom_data=football', 'custom_data=rugby'), keys)).toBe(false)
  })

  it('refuse une clé inconnue ou une signature absente', async () => {
    const { query, keys } = await signedQuery(MESSAGE)
    expect(await verifySignature(query, [{ ...keys[0], keyId: 999 }])).toBe(false)
    expect(await verifySignature(MESSAGE, keys)).toBe(false)
  })

  it('lit les paramètres du rappel', () => {
    expect(readCallback(`${MESSAGE}&signature=x&key_id=1`)).toEqual({
      transactionId: 'abc123',
      userId: 'hn-device-42',
      customData: 'football',
      adUnit: '1234567890',
      timestamp: 1761475200000,
    })
  })

  it('convertit une signature DER avec des zéros de tête', () => {
    const raw = new Uint8Array(64)
    raw[0] = 0x80
    raw[63] = 1
    expect(derToRaw(rawToDer(raw))).toEqual(raw)
  })
})
