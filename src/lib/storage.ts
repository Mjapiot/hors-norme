// localStorage peut être indisponible (navigation privée, quota) : on ne plante jamais.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignoré */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignoré */
  }
}

export const KEYS = {
  game: 'hn:game:v3',
  config: 'hn:config:v2',
  seen: 'hn:seen:v1',
  installHint: 'hn:install-hint-dismissed',
  sound: 'hn:sound',
  admin: 'hn:admin',
}

const SEEN_LIMIT = 400

export function loadSeen(): Set<string> {
  return new Set(load<string[]>(KEYS.seen, []))
}

export function markSeen(ids: string[]): void {
  const all = [...load<string[]>(KEYS.seen, []).filter((id) => !ids.includes(id)), ...ids]
  save(KEYS.seen, all.slice(-SEEN_LIMIT))
}
