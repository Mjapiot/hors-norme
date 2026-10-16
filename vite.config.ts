import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

/*
 * Variables Supabase : Vercel impose des noms sans préfixe VITE_ (SUPABASE_URL, SUPABASE_ANON_KEY).
 * On injecte UNIQUEMENT ces deux valeurs publiques — jamais un envPrefix « SUPABASE_ », qui exposerait
 * aussi SUPABASE_SERVICE_ROLE_KEY / SUPABASE_JWT_SECRET si l'intégration Vercel ↔ Supabase les a créées.
 */
const pick = (env: Record<string, string | undefined>, ...names: string[]) => names.map((n) => env[n]).find(Boolean) ?? ''

/** Refuse une clé secrète : nouveau format sb_secret_…, ou ancien JWT dont le rôle est service_role. */
function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role'
  } catch {
    return false
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const supabaseUrl = pick(env, 'VITE_SUPABASE_URL', 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').replace(/\/+$/, '')
  const supabaseKey = pick(
    env,
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )
  if (isSecretKey(supabaseKey)) throw new Error('Clé Supabase secrète détectée : utilise la clé anon / publishable.')
  if (/^sk_/.test(pick(env, 'VITE_REVENUECAT_IOS_KEY', 'REVENUECAT_IOS_KEY'))) throw new Error('Clé RevenueCat secrète détectée : utilise la clé publique iOS (appl_…).')
  // `vite build --mode native` : version embarquée dans les apps iOS/Android (Capacitor).
  // Pas de service worker (les fichiers sont déjà dans l'app), pas d'analytics, pas de back-office.
  const native = mode === 'native'

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseKey),
      'import.meta.env.VITE_NATIVE': JSON.stringify(native),
      // Build de démo (captures des stores) : HN_DEMO=1 npm run build:native
      'import.meta.env.VITE_DEMO': JSON.stringify(process.env.HN_DEMO === '1'),
      // V1.1 : thèmes premium (achats intégrés). PACKS=1 au build pour les activer.
      'import.meta.env.VITE_PACKS': JSON.stringify(env.PACKS === '1'),
      // Clé publique RevenueCat iOS (« appl_… », faite pour être embarquée dans l'app).
      'import.meta.env.VITE_REVENUECAT_IOS_KEY': JSON.stringify(pick(env, 'VITE_REVENUECAT_IOS_KEY', 'REVENUECAT_IOS_KEY')),
    },
    plugins: [
      react(),
      !native && VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Hors Norme — le jeu des records',
          short_name: 'Hors Norme',
          description: 'Le jeu de soirée des records : le plus grand, le plus vieux, le plus rapide… Qui tombera le plus près ?',
          lang: 'fr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#120d26',
          theme_color: '#120d26',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Tout est pré-caché : une partie se joue entièrement hors connexion.
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
          // Police : on ne précache que les sous-ensembles latins.
          globIgnores: ['**/*vietnamese*'],
          navigateFallback: '/index.html',
          // Pages légales statiques : jamais remplacées par l'app.
          navigateFallbackDenylist: [/^\/(confidentialite|support|mentions-legales)/],
        },
      }),
    ],
    test: {
      include: ['src/**/*.test.ts'],
    },
  }
})
