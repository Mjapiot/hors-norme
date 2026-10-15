import { KEYS, load, save } from './storage'

/*
 * Effets sonores synthétisés (Web Audio) : aucun fichier à charger, fonctionne hors connexion.
 * Sur iPhone, l'audio ne démarre qu'après un geste de l'utilisateur, et le bouton
 * « silencieux » du téléphone coupe le son des pages web.
 */

export type Sfx = 'tap' | 'tick' | 'go' | 'reveal' | 'exact' | 'good' | 'bad' | 'win'

let ctx: AudioContext | null = null
let enabled = load(KEYS.sound, true)

export const isSoundOn = () => enabled

export function setSoundOn(on: boolean): void {
  enabled = on
  save(KEYS.sound, on)
  if (on) unlockAudio()
}

/** À appeler dans un gestionnaire de clic/toucher (exigence iOS). */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    ctx = null
  }
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; g?: number; slide?: number }

const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const C6 = 1046.5

const SOUNDS: Record<Sfx, Note[]> = {
  tap: [{ f: 620, t: 0, d: 0.04, g: 0.04 }],
  tick: [{ f: 880, t: 0, d: 0.08, type: 'square', g: 0.04 }],
  go: [{ f: 1320, t: 0, d: 0.22, type: 'square', g: 0.05 }],
  reveal: [
    { f: C5, t: 0, d: 0.1, type: 'triangle' },
    { f: E5, t: 0.08, d: 0.1, type: 'triangle' },
    { f: G5, t: 0.16, d: 0.18, type: 'triangle' },
  ],
  exact: [
    { f: C5, t: 0, d: 0.1, type: 'triangle' },
    { f: E5, t: 0.1, d: 0.1, type: 'triangle' },
    { f: G5, t: 0.2, d: 0.1, type: 'triangle' },
    { f: C6, t: 0.3, d: 0.35, type: 'triangle', g: 0.12 },
  ],
  good: [
    { f: G5, t: 0, d: 0.09, type: 'triangle' },
    { f: C6, t: 0.09, d: 0.16, type: 'triangle' },
  ],
  bad: [{ f: 220, t: 0, d: 0.28, type: 'sawtooth', g: 0.05, slide: 130 }],
  win: [
    { f: G5, t: 0, d: 0.12, type: 'triangle' },
    { f: C6, t: 0.12, d: 0.12, type: 'triangle' },
    { f: G5, t: 0.24, d: 0.12, type: 'triangle' },
    { f: C6, t: 0.36, d: 0.5, type: 'triangle', g: 0.12 },
  ],
}

export function play(sfx: Sfx): void {
  if (!enabled) return
  unlockAudio()
  if (!ctx) return
  const now = ctx.currentTime
  for (const n of SOUNDS[sfx]) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = n.type ?? 'sine'
    osc.frequency.setValueAtTime(n.f, now + n.t)
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, now + n.t + n.d)
    const peak = n.g ?? 0.08
    gain.gain.setValueAtTime(0.0001, now + n.t)
    gain.gain.exponentialRampToValueAtTime(peak, now + n.t + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + n.t)
    osc.stop(now + n.t + n.d + 0.02)
  }
}
