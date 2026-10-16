import { useEffect, useState } from 'react'
import { ArrowClockwise } from '@phosphor-icons/react/dist/csr/ArrowClockwise'
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { Crown } from '@phosphor-icons/react/dist/csr/Crown'
import { X } from '@phosphor-icons/react/dist/csr/X'
import { THEMES } from '../game/types'
import type { PaidTheme } from '../game/types'
import { syncPackQuestions } from '../data/bank'
import { BUNDLE, PACKS } from '../lib/packs'
import { canPurchase, getAppUserId, getPrices, purchase, restore, useOwnedThemes } from '../lib/purchases'
import type { PurchaseOutcome } from '../lib/purchases'
import { Ico, THEME_ICONS } from './Icons'

/** Lien App Store, à renseigner une fois l'app publiée (id numérique App Store Connect). */
export const APP_STORE_URL = ''

interface Props {
  /** Thème touché dans la configuration (mis en avant), ou null. */
  focus: PaidTheme | null
  onClose: () => void
}

/** Boutique des thèmes premium (achats intégrés RevenueCat). Sur le web : « disponible dans l'app ». */
export function PackStore({ focus, onClose }: Props) {
  const owned = useOwnedThemes()
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const allOwned = PACKS.every((p) => owned.includes(p.theme))

  useEffect(() => {
    void getPrices().then(setPrices)
  }, [])

  const afterPurchase = async (outcome: PurchaseOutcome, label: string) => {
    if (outcome === 'success') {
      setMessage(`${label} débloqué ! Les questions se téléchargent…`)
      await syncPackQuestions(await getAppUserId())
      setMessage(`${label} débloqué, bonne partie !`)
    } else if (outcome === 'error') setMessage('L’achat n’a pas abouti. Vérifie ta connexion et réessaie.')
  }

  const buy = async (productId: string, label: string) => {
    setBusy(productId)
    setMessage('')
    await afterPurchase(await purchase(productId), label)
    setBusy(null)
  }

  const price = (productId: string, fallback: string) => prices[productId] ?? fallback

  return (
    <div className="store" role="dialog" aria-modal="true" aria-label="Thèmes premium">
      <div className="store-sheet">
        <header className="store-head">
          <div>
            <p className="eyebrow">Thèmes premium</p>
            <h2>Encore plus de records</h2>
          </div>
          <button type="button" className="icon-btn" aria-label="Fermer" onClick={onClose}>
            <Ico icon={X} size={20} />
          </button>
        </header>

        {!canPurchase && (
          <p className="store-note">
            Les thèmes premium s’achètent dans l’application iPhone Hors Norme.
            {APP_STORE_URL && (
              <>
                {' '}
                <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
                  Ouvrir l’App Store
                </a>
              </>
            )}
          </p>
        )}

        {!allOwned && (
          <button
            type="button"
            className="store-bundle"
            disabled={!canPurchase || busy !== null}
            onClick={() => void buy(BUNDLE.productId, 'Le pack complet')}
          >
            <Ico icon={Crown} size={28} weight="duotone" />
            <span>
              <strong>Pack complet · 5 thèmes</strong>
              <small>{BUNDLE.pitch}</small>
            </span>
            <em>{busy === BUNDLE.productId ? '…' : price(BUNDLE.productId, BUNDLE.fallbackPrice)}</em>
          </button>
        )}

        <ul className="store-list">
          {PACKS.map((p) => {
            const has = owned.includes(p.theme)
            return (
              <li key={p.theme} className={`${focus === p.theme ? 'focus' : ''}${has ? ' owned' : ''}`}>
                <span className="store-icon">
                  <Ico icon={THEME_ICONS[p.theme]} size={24} />
                </span>
                <span className="store-text">
                  <strong>{THEMES[p.theme].label}</strong>
                  <small>{p.pitch}</small>
                </span>
                {has ? (
                  <span className="store-owned">
                    <Ico icon={CheckCircle} size={18} weight="fill" /> Acheté
                  </span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary store-buy"
                    disabled={!canPurchase || busy !== null}
                    onClick={() => void buy(p.productId, THEMES[p.theme].label)}
                  >
                    {busy === p.productId ? '…' : price(p.productId, p.fallbackPrice)}
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        {message && (
          <p className="store-message" role="status">
            {message}
          </p>
        )}

        {canPurchase && (
          <button
            type="button"
            className="link link-icon store-restore"
            disabled={busy !== null}
            onClick={async () => {
              setBusy('restore')
              const res = await restore()
              if (res) await syncPackQuestions(await getAppUserId())
              setMessage(res === null ? 'Restauration impossible pour le moment.' : res.length ? `${res.length} thème(s) restauré(s).` : 'Aucun achat à restaurer.')
              setBusy(null)
            }}
          >
            <Ico icon={ArrowClockwise} size={16} /> Restaurer mes achats
          </button>
        )}
        <p className="store-legal">Achat unique, sans abonnement. Paiement via ton compte Apple.</p>
      </div>
    </div>
  )
}
