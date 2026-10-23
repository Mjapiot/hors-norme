import { useSyncExternalStore } from 'react'
import { AdMob, AdmobConsentStatus, InterstitialAdPluginEvents, MaxAdContentRating, RewardAdPluginEvents } from '@capacitor-community/admob'
import { isNative, platform } from './native'

/*
 * Publicités Google AdMob (V1.3, iOS d'abord).
 * - Interstitiel à chaque fin de partie, vidéo récompensée pour jouer une partie avec un thème premium.
 * - Consentement RGPD (UMP de Google) puis demande de suivi d'Apple (ATT) avant toute pub.
 * - Sans identifiants AdMob au build, on utilise les blocs de démonstration de Google (pubs de test).
 * - Hors connexion ou si une pub ne charge pas : le jeu continue, sans attente ni message.
 */

/** Interrupteur de la V1.3 : `ADS=1` au build. Désactivé tant que la version avec pubs n'est pas publiée. */
export const ADS_ENABLED = import.meta.env.VITE_ADS === true

// Blocs de démonstration iOS de Google : ils renvoient toujours une pub de test.
const DEMO_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910'
const DEMO_REWARDED = 'ca-app-pub-3940256099942544/1712485313'

const INTERSTITIAL_ID: string = import.meta.env.VITE_ADMOB_INTERSTITIAL_IOS || DEMO_INTERSTITIAL
const REWARDED_ID: string = import.meta.env.VITE_ADMOB_REWARDED_IOS || DEMO_REWARDED
/** Vrai tant que les vrais blocs AdMob ne sont pas fournis au build. */
export const ADS_TESTING = INTERSTITIAL_ID === DEMO_INTERSTITIAL || REWARDED_ID === DEMO_REWARDED

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
  try {
    await AdMob.showInterstitial()
    await closed
  } catch {
    interstitialLoaded = false
  } finally {
    handles.forEach((h) => void h.remove())
  }
}

/**
 * Vidéo récompensée. Vrai si le joueur l'a regardée jusqu'au bout.
 * `ssvUserId` est transmis à AdMob, qui prévient le serveur (vérification côté serveur, lot C).
 */
export async function showRewarded(ssvUserId: string, customData: string): Promise<boolean> {
  if (!canShowAds || !(await startAds())) return false
  let rewarded = false
  const handle = await AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
    rewarded = true
  })
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_ID, isTesting: ADS_TESTING, ssv: { userId: ssvUserId, customData } })
    await AdMob.showRewardVideoAd()
  } catch {
    /* pas de vidéo disponible, ou fermée avant la fin */
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
