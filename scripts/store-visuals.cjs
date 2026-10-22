/**
 * Visuels des stores à partir des captures brutes du simulateur (content/store/visuels/raw).
 * Usage : node scripts/store-visuals.cjs
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..', 'content', 'store', 'visuels')
const RAW = path.join(ROOT, 'raw')
const SHOTS = [
  ['01-accueil', 'Le jeu des records', 'à jouer entre amis'],
  ['02-question', 'Le plus grand, le plus vieux…', 'à toi d’estimer !'],
  ['03-saisie', 'Un seul téléphone,', 'chacun répond en secret'],
  ['04-revelation', 'Tout pile ?', 'Jackpot !'],
  ['05-duel', 'Égalité parfaite ?', 'Duel éclair !'],
  ['06-fourchette', 'Nouveau : la Fourchette', 'vise juste et serré'],
  ['07-tutoriel', 'Des règles simples,', 'apprises en 1 minute'],
  ['08-difficulte', 'Détente ou Expert ?', 'à chacun son niveau'],
]
const FONT = "'Helvetica Neue', 'Arial Black', Arial, sans-serif"
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const background = (w, h) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs>
    <radialGradient id="a" cx="50%" cy="0%" r="90%"><stop offset="0" stop-color="#4a2b9e"/><stop offset="1" stop-color="#120d26"/></radialGradient>
    <radialGradient id="b" cx="100%" cy="100%" r="70%"><stop offset="0" stop-color="#ff5c8a" stop-opacity=".28"/><stop offset="1" stop-color="#ff5c8a" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>
</svg>`)

const caption = (w, h, l1, l2, size) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <text x="50%" y="${h * 0.44}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" fill="#f7f3ff">${esc(l1)}</text>
  <text x="50%" y="${h * 0.44 + size * 1.18}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${size}" fill="#ffd23f">${esc(l2)}</text>
</svg>`)

async function framed(file, height, radius) {
  const shot = await sharp(file).resize({ height }).png().toBuffer()
  const { width } = await sharp(shot).metadata()
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="#fff"/></svg>`)
  const rounded = await sharp(shot).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  return { buf: rounded, width }
}

async function compose(id, l1, l2, W, H, captionH, size, out) {
  const shotH = H - captionH - Math.round(H * 0.035)
  const { buf, width } = await framed(path.join(RAW, `${id}.png`), shotH, Math.round(shotH * 0.035))
  const border = Buffer.from(`<svg width="${width + 8}" height="${shotH + 8}"><rect x="2" y="2" width="${width + 4}" height="${shotH + 4}" rx="${Math.round(shotH * 0.035) + 3}" fill="none" stroke="#ffffff" stroke-opacity=".18" stroke-width="4"/></svg>`)
  const left = Math.round((W - width) / 2)
  await sharp(background(W, H))
    .composite([
      { input: caption(W, captionH, l1, l2, size), top: 0, left: 0 },
      { input: buf, top: captionH, left },
      { input: border, top: captionH - 4, left: left - 4 },
    ])
    .png()
    .toFile(out)
}

;(async () => {
  for (const dir of ['ios-6.9', 'android']) fs.mkdirSync(path.join(ROOT, dir), { recursive: true })
  for (const [id, l1, l2] of SHOTS) {
    await compose(id, l1, l2, 1320, 2868, 560, 104, path.join(ROOT, 'ios-6.9', `${id}.png`))
    await compose(id, l1, l2, 1080, 1920, 360, 74, path.join(ROOT, 'android', `${id}.png`))
  }
  // Bannière Google Play 1024 × 500
  const phone = await framed(path.join(RAW, '04-revelation.png'), 440, 22)
  const banner = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
    <text x="60" y="190" font-family="${FONT}" font-weight="900" font-size="104" fill="#f7f3ff">HORS</text>
    <g transform="rotate(-4 60 300)"><text x="66" y="306" font-family="${FONT}" font-weight="900" font-size="112" fill="#ff5c8a">NORME</text>
    <text x="60" y="300" font-family="${FONT}" font-weight="900" font-size="112" fill="#ffd23f">NORME</text></g>
    <text x="62" y="380" font-family="${FONT}" font-weight="700" font-size="34" fill="#3ee6d3">Le jeu des records entre amis</text>
  </svg>`)
  await sharp(background(1024, 500))
    .composite([{ input: banner, top: 0, left: 0 }, { input: phone.buf, top: 30, left: 1024 - phone.width - 70 }])
    .png()
    .toFile(path.join(ROOT, 'android', 'banniere-1024x500.png'))
  // Icône Google Play 512 × 512
  await sharp(path.join(__dirname, '..', 'assets', 'icon-only.png')).resize(512, 512).png().toFile(path.join(ROOT, 'android', 'icone-512.png'))
  console.log('visuels générés')
})()
