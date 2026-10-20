import { Component } from 'react'
import type { ReactNode } from 'react'
import { KEYS, remove } from '../lib/storage'

/**
 * Filet de sécurité : si un écran plante (sauvegarde d'une ancienne version, donnée inattendue…),
 * on propose de repartir proprement au lieu d'un écran blanc qui reviendrait à chaque lancement.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Hors Norme a rencontré une erreur', error)
  }

  restart = () => {
    // La partie en cours est la cause la plus probable : on l'efface, les réglages restent.
    remove(KEYS.game)
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="screen oops">
        <p className="eyebrow">Hors Norme</p>
        <h2 className="end-title">Oups, quelque chose a coincé</h2>
        <p className="help">La partie en cours n’a pas pu être affichée. On repart sur une base propre&nbsp;: tes réglages sont conservés.</p>
        <button type="button" className="btn btn-primary" onClick={this.restart}>
          Redémarrer
        </button>
      </main>
    )
  }
}
