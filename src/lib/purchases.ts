import { useSyncExternalStore } from 'react'
import { Purchases } from '@revenuecat/purchases-capacitor'
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor'
import type { PaidTheme } from '../game/types'
import { isNative, platform } from './native'
import { BUNDLE, PACKS, PACKS_ENABLED, themesFromEntitlements } from './packs'
import { load, save } from './storage'

/*
 * Achats intégrés via RevenueCat (iOS d'abord). Pas de compte joueur : RevenueCat attribue
 * un identifiant anonyme à l'appareil, et « Restaurer mes achats » retrouve les achats
 * liés à l'identifiant Apple. Les thèmes débloqués sont gardés en cache pour jouer hors ligne.
 */

const RC_IOS_KEY: string = import.meta.env.VITE_REVENUECAT_IOS_KEY ?? ''
const OWNED_KEY = 'hn:owned-themes:v1'

export const canPurchase = PACKS_ENABLED && isNative && platform === 'ios' && RC_IOS_KEY !== ''

let owned: PaidTheme[] = load<PaidTheme[]>(OWNED_KEY, [])
let configured: Promise<void> | null = null
const listeners = new Set<() => void>()

function setOwned(next: PaidTheme[]) {
  owned = [...new Set(next)]
  save(OWNED_KEY, owned)
  listeners.forEach((l) => l())
}

export const getOwnedThemes = () => owned
export function useOwnedThemes(): PaidTheme[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => owned,
  )
}

function applyCustomerInfo(info: CustomerInfo) {
  setOwned(themesFromEntitlements(Object.keys(info.entitlements.active)))
}

async function ensureConfigured(): Promise<boolean> {
  if (!canPurchase) return false
  configured ??= Purchases.configure({ apiKey: RC_IOS_KEY })
  await configured
  return true
}

/** Au démarrage : rafraîchit les thèmes possédés (silencieux hors ligne). */
export async function refreshOwned(): Promise<void> {
  try {
    if (!(await ensureConfigured())) return
    const { customerInfo } = await Purchases.getCustomerInfo()
    applyCustomerInfo(customerInfo)
  } catch {
    /* hors ligne : on garde le cache */
  }
}

export async function getAppUserId(): Promise<string | null> {
  if (!(await ensureConfigured())) return null
  return (await Purchases.getAppUserID()).appUserID
}

/** Prix localisés fournis par l'App Store (ex. « 1,99 € »), par identifiant de produit. */
export async function getPrices(): Promise<Record<string, string>> {
  try {
    if (!(await ensureConfigured())) return {}
    const ids = [...PACKS.map((p) => p.productId), BUNDLE.productId]
    const { products } = await Purchases.getProducts({ productIdentifiers: ids })
    return Object.fromEntries(products.map((p: PurchasesStoreProduct) => [p.identifier, p.priceString]))
  } catch {
    return {}
  }
}

export type PurchaseOutcome = 'success' | 'cancelled' | 'error'

export async function purchase(productId: string): Promise<PurchaseOutcome> {
  try {
    if (!(await ensureConfigured())) return 'error'
    const { products } = await Purchases.getProducts({ productIdentifiers: [productId] })
    if (!products[0]) return 'error'
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product: products[0] })
    applyCustomerInfo(customerInfo)
    return 'success'
  } catch (e) {
    return (e as { userCancelled?: boolean })?.userCancelled ? 'cancelled' : 'error'
  }
}

/** « Restaurer mes achats » (obligatoire pour Apple). */
export async function restore(): Promise<PaidTheme[] | null> {
  try {
    if (!(await ensureConfigured())) return null
    const { customerInfo } = await Purchases.restorePurchases()
    applyCustomerInfo(customerInfo)
    return owned
  } catch {
    return null
  }
}
