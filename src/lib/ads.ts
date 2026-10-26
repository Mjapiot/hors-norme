import { useSyncExternalStore } from 'react'
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, MaxAdContentRating, RewardAdPluginEvents } from '@capacitor-community/admob'
import { isNative, platform } from './native'

/*
 * Publicités Google AdMob (V1.3, iOS d'abord).
 * - Interstitiel à chaque fin de partie, vidéo récompensée pour jouer une partie avec un thème premium.
 * - Consentement RGPD (UMP de Google) puis demande de suivi d'Apple (ATT) avant toute pub.
 * - `ADS_TEST=1` au build : blocs de démonstration de Google (pubs de test).
 * - Hors connexion ou si une pub ne charge pas : le jeu continue, sans attente ni message.
 */

/** Interrupteur de la V1.3 : `ADS=1` au build. Désactivé tant que la version avec pubs n'est pas publiée. */
export const ADS_ENABLED = import.meta.env.VITE_ADS === true

// Blocs AdMob de Hors Norme (identifiants publics, compte éditeur pub-8821579567596008).
const PROD_INTERSTITIAL = 'ca-app-pub-8821579567596008/1957624004' // « HN fin de partie »
const PROD_REWARDED = 'ca-app-pub-8821579567596008/1923506979' // « HN theme premium » (vérification côté serveur : ad-reward)
// Blocs de démonstration iOS de Google : ils renvoient toujours une pub de test.
const DEMO_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910'
const DEMO_REWARDED = 'ca-app-pub-3940256099942544/1712485313'

/** `ADS_TEST=1` au build : pubs de démonstration (développement). Le simulateur reçoit toujours des pubs de test. */
export const ADS_TESTING = import.meta.env.VITE_ADS_TEST === true
const INTERSTITIAL_ID = ADS_TESTING ? DEMO_INTERSTITIAL : PROD_INTERSTITIAL
const REWARDED_ID = ADS_TESTING ? DEMO_REWARDED : PROD_REWARDED

export const canShowAds = ADS_ENABLED && isNative && platform === 'ios'

let started: Promise<boolean> | null = null
let ready = false
let privacyOptions = false
let interstitialLoaded = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

/** Vrai si le joueur doit pouvoir modifier ses choix publicitaires (lien obligatoire en Europe). */
export function usePrivacyOptions(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => privacyOptions,
  )
}

/** Consentement RGPD : formulaire de Google si nécessaire. Faux si les pubs ne peuvent pas être demandées. */
async function gatherConsent(): Promise<boolean> {
  try {
    let info = await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false })
    if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) info = await AdMob.showConsentForm()
    privacyOptions = String(info.privacyOptionsRequirementStatus) === 'REQUIRED'
    notify()
    return info.canRequestAds
  } catch {
    // Pas de message RGPD configuré (blocs de démonstration) : on teste quand même les pubs.
    // En production, une erreur de consentement (hors ligne…) veut dire : pas de pub cette fois.
    return ADS_TESTING
  }
}

/** Demande de suivi d'Apple, une seule fois : en cas de refus, les pubs restent non personnalisées. */
async function askTracking() {
  try {
    const { status } = await AdMob.trackingAuthorizationStatus()
    if (status === 'notDetermined') await AdMob.requestTrackingAuthorization()
  } catch {
    /* iOS < 14 ou refus système : rien à faire */
  }
}

async function prepareInterstitial() {
  if (!ready || interstitialLoaded) return
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: ADS_TESTING })
    interstitialLoaded = true
  } catch {
    /* hors ligne ou pas de pub disponible : on réessaiera à la prochaine partie */
  }
}

async function start(): Promise<boolean> {
  if (!(await gatherConsent())) return false
  await askTracking()
  await AdMob.initialize({
    // Public familial (app classée 9+) : pubs « tous publics avec accord parental » au maximum.
    maxAdContentRating: MaxAdContentRating.ParentalGuidance,
    tagForUnderAgeOfConsent: false,
  })
  await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    interstitialLoaded = false
    void prepareInterstitial()
  })
  await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
    interstitialLoaded = false
  })
  ready = true
  void prepareInterstitial()
  return true
}

/** Au démarrage de l'app, une fois l'interface affichée. Sans effet hors iOS ou si les pubs sont désactivées. */
export function startAds(): Promise<boolean> {
  if (!canShowAds) return Promise.resolve(false)
  started ??= start().catch(() => false)
  return started
}

/** Interstitiel de fin de partie. Se résout quand la pub est fermée, ou tout de suite si aucune n'est prête. */
export async function showEndInterstitial(): Promise<void> {
  if (!canShowAds || !(await startAds())) return
  if (!interstitialLoaded) {
    void prepareInterstitial()
    return
  }
  let done!: () => void
  const closed = new Promise<void>((resolve) => (done = resolve))
  const handles = await Promise.all([
    AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => done()),
    AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => done()),
  ])
  // Filet de sécurité : si la fermeture n'est jamais signalée, on ne bloque pas le jeu.
  const timeout = new Promise<void>((resolve) => window.setTimeout(resolve, 120_000))
  try {
    await AdMob.showInterstitial()
    await Promise.race([closed, timeout])
  } catch {
    interstitialLoaded = false
  } finally {
    handles.forEach((h) => void h.remove())
  }
}

// Vidéo récompensée préparée à l'avance (une seule à la fois) : elle démarre sans attente au toucher.
let rewardedPrep: { key: string; ready: Promise<boolean> } | null = null

/**
 * Prépare la vidéo dès l'ouverture de la feuille d'un thème premium. Les paramètres de vérification
 * côté serveur (appareil, thème) sont fixés à la préparation.
 */
export function prepareRewarded(ssvUserId: string, customData: string): Promise<boolean> {
  const key = `${ssvUserId}|${customData}`
  if (rewardedPrep?.key === key) return rewardedPrep.ready
  const ready = (async () => {
    if (!canShowAds || !(await startAds())) return false
    try {
      await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID, isTesting: ADS_TESTING, ssv: { userId: ssvUserId, customData } })
      return true
    } catch {
      return false
    }
  })()
  rewardedPrep = { key, ready }
  // Échec (hors ligne, pas de vidéo) : on réessaiera au prochain appel.
  void ready.then((ok) => {
    if (!ok && rewardedPrep?.ready === ready) rewardedPrep = null
  })
  return ready
}

/**
 * Vidéo récompensée. Vrai si le joueur l'a regardée jusqu'au bout.
 * `ssvUserId` est transmis à AdMob, qui prévient le serveur (vérification côté serveur).
 */
export async function showRewarded(ssvUserId: string, customData: string): Promise<boolean> {
  if (!(await prepareRewarded(ssvUserId, customData))) return false
  rewardedPrep = null
  let rewarded = false
  const handle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    rewarded = true
  })
  try {
    await AdMob.showRewardVideoAd()
  } catch {
    /* fermée avant la fin, ou vidéo expirée */
  } finally {
    void handle.remove()
  }
  return rewarded
}

/** « Gérer mes choix publicitaires » : rouvre le formulaire de consentement de Google. */
export async function showAdPrivacyOptions(): Promise<void> {
  try {
    await AdMob.showPrivacyOptionsForm()
  } catch {
    /* formulaire indisponible hors ligne */
  }
}
