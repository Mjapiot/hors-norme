const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 })

export function formatNumber(value: number, year = false): string {
  // Une année s'écrit sans espace de milliers : 1832, pas 1 832.
  return year ? String(value) : nf.format(value)
}

/** Formatte la saisie en cours (« 12345,6 » → « 12 345,6 ») sans perdre la virgule finale. */
export function formatDraft(draft: string, year = false): string {
  if (draft === '' || year) return draft
  const [int, dec] = draft.split(',')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return dec === undefined ? grouped : `${grouped},${dec}`
}

const MAX_DRAFT_LENGTH = 12

/** Applique une touche du pavé numérique à la saisie en cours. */
export function applyKey(value: string, key: string, year = false): string {
  if (key === '⌫') return value.slice(0, -1)
  if (value.length >= MAX_DRAFT_LENGTH) return value
  if (key === ',') {
    if (year || value.includes(',')) return value
    return value === '' ? '0,' : value + ','
  }
  if (value === '0') return key
  return value + key
}

export function parseDraft(draft: string): number | null {
  if (draft === '' || draft === ',') return null
  const n = Number(draft.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const TEAM_COLORS = [
  '#FFD23F',
  '#FF5C8A',
  '#3EE6D3',
  '#9B7BFF',
  '#FF8A3D',
  '#7CE35B',
  '#4DA8FF',
  '#F25CFF',
  '#FFFFFF',
  '#C9A27E',
]

export const colorFor = (index: number) => TEAM_COLORS[index % TEAM_COLORS.length]

/** Typographie française : espace insécable avant ? ! : ; (évite un « ? » seul en fin de ligne). */
export function frenchSpacing(text: string): string {
  return text.replace(/ ([?!:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0')
}
