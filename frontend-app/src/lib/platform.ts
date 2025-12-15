import { Capacitor } from '@capacitor/core'

export type RuntimePlatform = 'web' | 'android' | 'ios' | 'desktop'

const readRuntimeFromEnv = (): RuntimePlatform | undefined => {
  const target = import.meta.env?.VITE_RUNTIME_TARGET as RuntimePlatform | undefined
  return target
}

const detectRuntimePlatform = (): RuntimePlatform => {
  const envTarget = readRuntimeFromEnv()
  if (envTarget) {
    return envTarget
  }

  if (typeof window === 'undefined') {
    return 'web'
  }

  try {
    if (Capacitor.isNativePlatform?.()) {
      const platform = Capacitor.getPlatform()
      if (platform === 'ios' || platform === 'android') {
        return platform
      }
      if (platform === 'electron') {
        return 'desktop'
      }
    }
  } catch (error) {
    console.warn('Unable to determine runtime platform from Capacitor', error)
  }

  return 'web'
}

const runtimePlatform = detectRuntimePlatform()

export const getRuntimePlatform = (): RuntimePlatform => runtimePlatform

export const isNativeMobileRuntime = () => runtimePlatform === 'ios' || runtimePlatform === 'android'

export const isDesktopRuntime = () => runtimePlatform === 'desktop'

export const supportsNativeNotifications = () => isNativeMobileRuntime() || isDesktopRuntime()
