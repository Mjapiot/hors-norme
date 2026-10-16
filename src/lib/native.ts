import { Capacitor } from '@capacitor/core'

/** Vrai dans les apps iOS/Android (Capacitor), faux dans le navigateur. */
export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'
