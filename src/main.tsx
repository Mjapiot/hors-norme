import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import '@fontsource-variable/bricolage-grotesque'
import './index.css'
import App from './App.tsx'
import { unlockAudio } from './lib/sound'

// Mesure d'audience Vercel (sans cookies) — à activer dans le tableau de bord Vercel du projet.
inject()

// iOS n'autorise l'audio qu'après un premier geste de l'utilisateur.
window.addEventListener('pointerdown', unlockAudio, { once: true })

// Back-office : chargé à la demande sur /admin, jamais téléchargé par les joueurs.
const AdminApp = lazy(() => import('./admin/AdminApp'))
const isAdminRoute = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdminRoute ? (
      <Suspense fallback={null}>
        <AdminApp />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
