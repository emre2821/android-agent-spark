import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0a957d4303c441f592167d605b188b38',
  appName: 'android-agent-spark',
  webDir: 'dist',
  server: {
    url: 'https://0a957d43-03c4-41f5-9216-7d605b188b38.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      showSpinner: false
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    BackgroundRunner: {
      enabled: true
    }
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a'
  },
  ios: {
    backgroundColor: '#0f172a',
    contentInset: 'always'
  }
};

export default config;