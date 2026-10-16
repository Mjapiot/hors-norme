import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { standings } from '../game/engine'
import type { GameState } from '../game/types'
import { colorFor } from './format'
import { isNative } from './native'

/*
 * Image de résultats à partager (1080 × 1350, format portrait des réseaux sociaux) :
 * podium, scores et le meilleur « tout pile » de la partie. Natif : feuille de partage iOS/Android.
 * Web : partage natif du navigateur si disponible, sinon téléchargement.
 */

const W = 1080
const H = 1350
const DISPLAY = "'Bricolage Grotesque Variable', system-ui, sans-serif"
const SITE = 'hors-norme.vercel.app'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

export async function renderResults(state: GameState): Promise<Blob> {
  await document.fonts?.ready
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Fond
  const bg = ctx.createRadialGradient(W / 2, -200, 50, W / 2, 200, 1200)
  bg.addColorStop(0, '#3a2380')
  bg.addColorStop(1, '#120d26')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Logo
  ctx.textAlign = 'center'
  ctx.fillStyle = '#f7f3ff'
  ctx.font = `800 120px ${DISPLAY}`
  ctx.fillText('HORS', W / 2, 190)
  ctx.save()
  ctx.translate(W / 2, 300)
  ctx.rotate(-0.06)
  ctx.fillStyle = '#ff5c8a'
  ctx.fillText('NORME', 6, 8)
  ctx.fillStyle = '#ffd23f'
  ctx.fillText('NORME', 0, 0)
  ctx.restore()

  // Vainqueur
  const ranking = standings(state.scores)
  const winners = ranking.filter((r) => r.rank === 1).map((r) => state.config.names[r.index])
  ctx.fillStyle = '#3ee6d3'
  ctx.font = `800 34px ${DISPLAY}`
  ctx.fillText('RÉSULTATS DE LA PARTIE', W / 2, 400)
  ctx.fillStyle = '#f7f3ff'
  ctx.font = `800 72px ${DISPLAY}`
  ctx.fillText(fitText(ctx, winners.length > 1 ? 'Égalité !' : `${winners[0]} gagne !`, W - 120), W / 2, 490)

  // Classement (jusqu'à 6 lignes)
  const rows = ranking.slice(0, 6)
  const rowH = 104
  let y = 560
  for (const r of rows) {
    ctx.fillStyle = r.rank === 1 ? 'rgba(255, 210, 63, 0.16)' : 'rgba(255, 255, 255, 0.06)'
    roundRect(ctx, 90, y, W - 180, rowH - 16, 28)
    ctx.fillStyle = colorFor(r.index)
    ctx.beginPath()
    ctx.arc(150, y + (rowH - 16) / 2, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.textAlign = 'left'
    ctx.fillStyle = '#f7f3ff'
    ctx.font = `800 44px ${DISPLAY}`
    ctx.fillText(fitText(ctx, `${r.rank}. ${state.config.names[r.index]}`, W - 480), 190, y + 60)
    ctx.textAlign = 'right'
    ctx.fillStyle = r.rank === 1 ? '#ffd23f' : '#b3a9d6'
    ctx.fillText(`${r.score} pts`, W - 130, y + 60)
    y += rowH
  }

  // Exploit de la partie : nombre de « tout pile »
  const exacts = state.results.reduce((n, res) => n + res.tiers.filter((t) => t === 'exact' || t === 'perfect').length, 0)
  ctx.textAlign = 'center'
  ctx.fillStyle = '#b3a9d6'
  ctx.font = `600 36px ${DISPLAY}`
  const rounds = state.results.length
  ctx.fillText(`${rounds} manche${rounds > 1 ? 's' : ''} · ${exacts} « tout pile »`, W / 2, H - 150)
  ctx.fillStyle = '#ffd23f'
  ctx.font = `800 40px ${DISPLAY}`
  ctx.fillText(`Le jeu des records · ${SITE}`, W / 2, H - 85)

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image impossible'))), 'image/png'))
}

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

/** Partage l'image ; renvoie false si l'utilisateur annule ou si rien n'est possible. */
export async function shareResults(state: GameState): Promise<boolean> {
  const blob = await renderResults(state)
  const text = 'On vient de jouer à Hors Norme, le jeu des records !'
  try {
    if (isNative) {
      const file = await Filesystem.writeFile({ path: 'hors-norme-resultats.png', data: await blobToBase64(blob), directory: Directory.Cache })
      await Share.share({ title: 'Hors Norme', text, files: [file.uri] })
      return true
    }
    const file = new File([blob], 'hors-norme-resultats.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Hors Norme', text, files: [file] })
      return true
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false // partage annulé
  }
}
