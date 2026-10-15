import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const background = { resizeOptions: { background: '#120d26' } }

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    // Le logo occupe déjà tout le carré : pas de marge blanche autour.
    apple: { ...minimal2023Preset.apple, padding: 0, ...background },
    maskable: { ...minimal2023Preset.maskable, padding: 0, ...background },
  },
  images: ['public/logo.svg'],
})
