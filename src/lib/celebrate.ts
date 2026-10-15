import confetti from 'canvas-confetti'

const COLORS = ['#FFD23F', '#FF5C8A', '#3EE6D3', '#9B7BFF', '#FFFFFF']

/** Confettis (désactivés si l'utilisateur préfère réduire les animations). */
export function celebrate(big = false): void {
  void confetti({
    particleCount: big ? 160 : 70,
    spread: big ? 100 : 65,
    startVelocity: big ? 50 : 38,
    origin: { y: big ? 0.45 : 0.35 },
    colors: COLORS,
    disableForReducedMotion: true,
  })
}
