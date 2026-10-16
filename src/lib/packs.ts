import type { PaidTheme } from '../game/types'

/*
 * Catalogue des thèmes premium (achats intégrés, V1.1).
 * Chaque thème est un achat unique (non-consommable) ; le pack global débloque les 5.
 * Identifiants à créer à l'identique dans App Store Connect et RevenueCat :
 *   produits   : hn_pack_<thème>, hn_pack_global
 *   droits RC  : pack_<thème>  (le produit global est rattaché aux 5 droits)
 */

/** Interrupteur de la V1.1 : `PACKS=1` au build. Désactivé pour la V1.0 gratuite. */
export const PACKS_ENABLED = import.meta.env.VITE_PACKS === true

export interface PackInfo {
  theme: PaidTheme
  productId: string
  entitlement: string
  /** Prix de référence affiché si le store ne répond pas (le prix réel vient d'Apple). */
  fallbackPrice: string
  pitch: string
}

export const PACKS: PackInfo[] = [
  { theme: 'football', productId: 'hn_pack_football', entitlement: 'pack_football', fallbackPrice: '1,99 €', pitch: 'Ligue 1, Coupe du monde, Ballon d’or, transferts records…' },
  { theme: 'rugby', productId: 'hn_pack_rugby', entitlement: 'pack_rugby', fallbackPrice: '1,99 €', pitch: 'Top 14, Coupe du monde, Tournoi des Six Nations, essais records…' },
  { theme: 'cinema', productId: 'hn_pack_cinema', entitlement: 'pack_cinema', fallbackPrice: '1,99 €', pitch: 'Box-office, Oscars, films les plus longs, séries les plus vues…' },
  { theme: 'musique', productId: 'hn_pack_musique', entitlement: 'pack_musique', fallbackPrice: '1,99 €', pitch: 'Albums les plus vendus, concerts géants, streams records…' },
  { theme: 'jo', productId: 'hn_pack_jo', entitlement: 'pack_jo', fallbackPrice: '1,99 €', pitch: 'Records olympiques, médailles, Paris 2024, champions hors norme…' },
]

export const BUNDLE = { productId: 'hn_pack_global', fallbackPrice: '6,99 €', pitch: 'Les 5 thèmes premium, à prix réduit' }

export const packForTheme = (t: PaidTheme) => PACKS.find((p) => p.theme === t)!

/** Droits RevenueCat actifs → thèmes débloqués. */
export function themesFromEntitlements(active: string[]): PaidTheme[] {
  return PACKS.filter((p) => active.includes(p.entitlement)).map((p) => p.theme)
}
