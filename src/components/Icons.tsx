import { ArrowsDownUp } from '@phosphor-icons/react/dist/csr/ArrowsDownUp'
import { Buildings } from '@phosphor-icons/react/dist/csr/Buildings'
import { CheckCircle } from '@phosphor-icons/react/dist/csr/CheckCircle'
import { Fire } from '@phosphor-icons/react/dist/csr/Fire'
import { GlobeHemisphereWest } from '@phosphor-icons/react/dist/csr/GlobeHemisphereWest'
import { ListNumbers } from '@phosphor-icons/react/dist/csr/ListNumbers'
import { MinusCircle } from '@phosphor-icons/react/dist/csr/MinusCircle'
import { PawPrint } from '@phosphor-icons/react/dist/csr/PawPrint'
import { Person } from '@phosphor-icons/react/dist/csr/Person'
import { Planet } from '@phosphor-icons/react/dist/csr/Planet'
import { Medal } from '@phosphor-icons/react/dist/csr/Medal'
import { Question } from '@phosphor-icons/react/dist/csr/Question'
import { Scroll } from '@phosphor-icons/react/dist/csr/Scroll'
import { Sparkle } from '@phosphor-icons/react/dist/csr/Sparkle'
import { Target } from '@phosphor-icons/react/dist/csr/Target'
import { Timer } from '@phosphor-icons/react/dist/csr/Timer'
import { Warning } from '@phosphor-icons/react/dist/csr/Warning'
import { XCircle } from '@phosphor-icons/react/dist/csr/XCircle'
import { SoccerBall } from '@phosphor-icons/react/dist/csr/SoccerBall'
import { Football } from '@phosphor-icons/react/dist/csr/Football'
import { FilmSlate } from '@phosphor-icons/react/dist/csr/FilmSlate'
import { MusicNotes } from '@phosphor-icons/react/dist/csr/MusicNotes'
import { PersonSimpleRun } from '@phosphor-icons/react/dist/csr/PersonSimpleRun'
import type { Icon, IconWeight } from '@phosphor-icons/react'
import type { RoundKind, Theme, Tier } from '../game/types'

// Icônes Phosphor (licence MIT) : un seul style cohérent, embarqué dans le bundle → disponible hors connexion.

export const THEME_ICONS: Record<Theme, Icon> = {
  corps: Person,
  animaux: PawPrint,
  geo: GlobeHemisphereWest,
  espace: Planet,
  sport: Medal,
  constructions: Buildings,
  histoire: Scroll,
  insolite: Sparkle,
  football: SoccerBall,
  rugby: Football,
  cinema: FilmSlate,
  musique: MusicNotes,
  jo: PersonSimpleRun,
}

export const ROUND_ICONS: Record<RoundKind, Icon> = {
  classic: Question,
  chrono: Timer,
  ranking: ListNumbers,
  higherlower: ArrowsDownUp,
}

export const TIER_ICONS: Partial<Record<Tier, Icon>> = {
  exact: Target,
  perfect: Target,
  close: Fire,
  near: CheckCircle,
  good: CheckCircle,
  partial: CheckCircle,
  far: MinusCircle,
  miss: MinusCircle,
  bad: XCircle,
  absurd: Warning,
}

interface Props {
  icon: Icon
  size?: number
  weight?: IconWeight
  className?: string
}

/** Icône décorative (le texte voisin porte le sens pour les lecteurs d'écran). */
export function Ico({ icon: Component, size = 20, weight = 'bold', className }: Props) {
  return <Component size={size} weight={weight} className={className} aria-hidden="true" />
}
