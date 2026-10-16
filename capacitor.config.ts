import type { CapacitorConfig } from '@capacitor/cli'

// Identifiant définitif une fois l'app publiée : à confirmer avant la première soumission.
const config: CapacitorConfig = {
  appId: 'app.horsnorme',
  appName: 'Hors Norme',
  webDir: 'dist',
  backgroundColor: '#120d26',
  ios: {
    contentInset: 'never',
    backgroundColor: '#120d26',
  },
  android: {
    backgroundColor: '#120d26',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#120d26',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
  },
}

export default config
