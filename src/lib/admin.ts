import { KEYS, load, save } from './storage'

/**
 * Mode admin (relecture des questions) : ouvrir l'app avec ?admin=1 pour l'activer,
 * ?admin=0 pour le couper. Affiche les mentions « à vérifier » masquées au public.
 */
export function isAdmin(): boolean {
  try {
    const flag = new URLSearchParams(window.location.search).get('admin')
    if (flag !== null) save(KEYS.admin, flag !== '0')
  } catch {
    /* ignoré */
  }
  return load(KEYS.admin, false)
}
