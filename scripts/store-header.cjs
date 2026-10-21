/**
 * En-têtes de page produit App Store (3840 × 1646 et 5244 × 2950) : trois pistes.
 * Usage : node scripts/store-header.cjs  → content/store/visuels/entete/
 */
const sharp = require('sharp')
const path = require('path')

const V = path.join(__dirname, '..', 'content', 'store', 'visuels')
const RAW = path.join(V, 'raw')
const OUT = path.join(V, 'entete')
const FONT = "'Helvetica Neue', 'Arial Black', Arial, sans-serif"
const BG = [18, 13, 38]

/** Logo « HORS NORME » repris de l'écran d'accueil, fond rendu transparent. */
async function logo() {
  const { data, info } = await sharp(path.join(RAW, '01-accueil.png'))
    .extract({ left: 60, top: 960, width: 1200, height: 540 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.max(Math.abs(data[i] - BG[0]), Math.abs(data[i + 1] - BG[1]), Math.abs(data[i + 2] - BG[2]))
    data[i + 3] = Math.min(255, d * 4)
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

/** Capture d'écran en « téléphone » : coins arrondis + liseré clair, éventuellement inclinée. */
async function phone(id, height, angle = 0) {
  const shot = await sharp(path.join(RAW, `${id}.png`)).resize({ height }).png().toBuffer()
  const { width } = await sharp(shot).metadata()
  const r = Math.round(height * 0.06)
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${r}" fill="#fff"/></svg>`)
  const rounded = await sharp(shot).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  const pad = Math.round(height * 0.012)
  const frame = Buffer.from(
    `<svg width="${width + pad * 2}" height="${height + pad * 2}"><rect x="0" y="0" width="${width + pad * 2}" height="${height + pad * 2}" rx="${r + pad}" fill="#1c1538" stroke="#ffffff" stroke-opacity=".22" stroke-width="${Math.max(3, pad / 3)}"/></svg>`,
  )
  let out = await sharp(frame).composite([{ input: rounded, top: pad, left: pad }]).png().toBuffer()
  if (angle) out = await sharp(out).rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
  return out
}

const background = (w, h, accent = '#ff5c8a') =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="a" cx="30%" cy="0%" r="110%"><stop offset="0" stop-color="#4a2b9e"/><stop offset="1" stop-color="#120d26"/></radialGradient>
    <radialGradient id="b" cx="95%" cy="100%" r="70%"><stop offset="0" stop-color="${accent}" stop-opacity=".30"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>
</svg>`)

/** Confettis aux couleurs des équipes (positions fixes pour un rendu reproductible). */
function confetti(w, h, n, seed = 7) {
  const colors = ['#FFD23F', '#FF5C8A', '#3EE6D3', '#9B7BFF', '#FF8A3D', '#7CE35B']
  let s = seed
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
  const items = Array.from({ length: n }, (_, i) => {
    const x = rnd() * w
    const y = rnd() * h
    const sz = (0.004 + rnd() * 0.006) * w
    return `<rect x="${x}" y="${y}" width="${sz}" height="${sz * 0.45}" rx="${sz * 0.12}" fill="${colors[i % colors.length]}" opacity="${0.35 + rnd() * 0.5}" transform="rotate(${rnd() * 180} ${x} ${y})"/>`
  })
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${items.join('')}</svg>`)
}

const text = (w, h, lines) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${lines
    .map((l) => `<text x="${l.x}" y="${l.y}" text-anchor="${l.anchor ?? 'start'}" font-family="${FONT}" font-weight="${l.weight ?? 800}" font-size="${l.size}" fill="${l.color}" letter-spacing="${l.spacing ?? 0}">${l.t.replace(/&/g, '&amp;')}</text>`)
    .join('')}</svg>`)

const pill = (w, h, items, y, size) => {
  let x = 0
  const parts = items.map((t) => {
    const pw = t.length * size * 0.56 + size * 1.4
    const el = `<rect x="${x}" y="${y}" width="${pw}" height="${size * 1.9}" rx="${size * 0.95}" fill="#ffffff" fill-opacity=".08" stroke="#FFD23F" stroke-opacity=".55" stroke-width="${size * 0.08}"/><text x="${x + pw / 2}" y="${y + size * 1.28}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="${size}" fill="#f7f3ff">${t.replace(/&/g, '&amp;')}</text>`
    x += pw + size * 0.6
    return el
  })
  return { svg: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${parts.join('')}</svg>`), width: x }
}

/** Piste A « Affiche » : logo à gauche, trois écrans en éventail à droite. */
async function affiche(W, H) {
  const L = await logo()
  // Unité de taille commune aux deux formats (le texte ne doit jamais passer sous les écrans).
  const u = Math.min(H, W * 0.4286)
  const lw = Math.round(W * 0.36)
  const logoBuf = await sharp(L).resize({ width: lw }).png().toBuffer()
  const lh = (await sharp(logoBuf).metadata()).height
  const ph = Math.round(Math.min(H * 0.82, W * 0.33))
  const phones = [await phone('02-question', ph, -7), await phone('04-revelation', ph, 0), await phone('06-fourchette', ph, 7)]
  const meta = await Promise.all(phones.map((p) => sharp(p).metadata()))
  const cx = W * 0.72
  const lx = Math.round(W * 0.07)
  const ly = Math.round(H * 0.5 - lh * 0.62)
  return sharp(background(W, H))
    .composite([
      { input: confetti(W, H, 70), top: 0, left: 0 },
      { input: text(W, H, [{ t: 'LE JEU DES RECORDS', x: lx + W * 0.005, y: ly - u * 0.03, size: u * 0.045, color: '#3EE6D3', spacing: u * 0.012 }]), top: 0, left: 0 },
      { input: logoBuf, top: ly, left: lx },
      { input: text(W, H, [{ t: 'Le plus grand, le plus vieux, le plus rapide…', x: lx + W * 0.005, y: ly + lh + u * 0.08, size: u * 0.042, color: '#cfc6ef', weight: 600 }, { t: 'Qui tombera le plus près ?', x: lx + W * 0.005, y: ly + lh + u * 0.14, size: u * 0.042, color: '#FFD23F', weight: 800 }]), top: 0, left: 0 },
      { input: phones[0], top: Math.round((H - meta[0].height) / 2 + H * 0.05), left: Math.round(cx - meta[0].width * 1.32) },
      { input: phones[2], top: Math.round((H - meta[2].height) / 2 + H * 0.05), left: Math.round(cx + meta[2].width * 0.32) },
      { input: phones[1], top: Math.round((H - meta[1].height) / 2), left: Math.round(cx - meta[1].width / 2) },
    ])
    .png()
    .toBuffer()
}

/** Piste B « Tout pile » : accroche géante, un écran de révélation en vedette, confettis. */
async function toutPile(W, H) {
  const ph = Math.round(Math.min(H * 0.92, W * 0.4))
  const p = await phone('04-revelation', ph, -4)
  const m = await sharp(p).metadata()
  const x = W * 0.08
  return sharp(background(W, H, '#FFD23F'))
    .composite([
      { input: confetti(W, H, 160, 11), top: 0, left: 0 },
      {
        input: text(W, H, [
          { t: 'Tout pile ?', x, y: H * 0.36, size: H * 0.17, color: '#f7f3ff', weight: 900 },
          { t: 'Jackpot !', x, y: H * 0.56, size: H * 0.17, color: '#FFD23F', weight: 900 },
          { t: 'Le jeu des records à jouer entre amis,', x: x + W * 0.004, y: H * 0.69, size: H * 0.042, color: '#cfc6ef', weight: 600 },
          { t: 'sur un seul téléphone.', x: x + W * 0.004, y: H * 0.745, size: H * 0.042, color: '#cfc6ef', weight: 600 },
          { t: 'HORS NORME', x: x + W * 0.004, y: H * 0.85, size: H * 0.05, color: '#3EE6D3', weight: 900, spacing: H * 0.01 },
        ]),
        top: 0,
        left: 0,
      },
      { input: p, top: Math.round((H - m.height) / 2), left: Math.round(W * 0.68 - m.width / 2) },
    ])
    .png()
    .toBuffer()
}

/** Piste C « Thèmes » : logo centré, thèmes en pastilles, écrans en bas. */
async function themes(W, H) {
  const L = await logo()
  const lw = Math.round(W * 0.27)
  const logoBuf = await sharp(L).resize({ width: lw }).png().toBuffer()
  const lh = (await sharp(logoBuf).metadata()).height
  const size = Math.min(H * 0.036, W * 0.0125)
  const row1 = pill(W, H, ['Corps humain', 'Animaux', 'Géographie', 'Espace', 'Sport'], 0, size)
  const row2 = pill(W, H, ['Constructions', 'Histoire', 'Insolite', 'Amour & séduction'], 0, size)
  const ph = Math.round(Math.min(H * 0.74, W * 0.34))
  const ids = ['03-saisie', '05-duel']
  const phones = await Promise.all(ids.map((id) => phone(id, ph)))
  const pw = (await sharp(phones[0]).metadata()).width
  const lx = Math.round(W * 0.06)
  const ly = Math.round(H * 0.2)
  const composites = [
    { input: confetti(W, H, 60, 3), top: 0, left: 0 },
    { input: logoBuf, top: ly, left: lx },
    { input: text(W, H, [{ t: 'Des records du monde vérifiés, 9 thèmes.', x: lx, y: ly + lh + Math.min(H, W * 0.4286) * 0.08, size: Math.min(H, W * 0.4286) * 0.045, color: '#f7f3ff', weight: 800 }]), top: 0, left: 0 },
    { input: row1.svg, top: Math.round(ly + lh + H * 0.13), left: lx },
    { input: row2.svg, top: Math.round(ly + lh + H * 0.13 + size * 2.4), left: lx },
  ]
  const gap = W * 0.02
  const startX = W - W * 0.06 - phones.length * pw - (phones.length - 1) * gap
  phones.forEach((p, i) => composites.push({ input: p, top: Math.round((H - ph) / 2 + (i === 1 ? -H * 0.04 : H * 0.02)), left: Math.round(startX + i * (pw + gap)) }))
  return sharp(background(W, H, '#3EE6D3')).composite(composites).png().toBuffer()
}

;(async () => {
  for (const [W, H] of [
    [3840, 1646],
    [5244, 2950],
  ]) {
    for (const [name, fn] of [
      ['A-affiche', affiche],
      ['B-tout-pile', toutPile],
      ['C-themes', themes],
    ]) {
      const buf = await fn(W, H)
      const flat = sharp(buf).flatten({ background: '#120d26' })
      await flat.clone().jpeg({ quality: 92 }).toFile(path.join(OUT, `${name}-${W}x${H}.jpg`))
      // App Store Connect n'accepte que le PNG pour l'en-tête.
      await flat.clone().png({ compressionLevel: 9, palette: false }).toFile(path.join(OUT, `${name}-${W}x${H}.png`))
    }
  }
  console.log('en-têtes générés')
})()
