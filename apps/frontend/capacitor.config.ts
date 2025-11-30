import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.0a957d4303c441f592167d605b188b38',
  appName: 'android-agent-spark',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#1a1a2e',
      showSpinner: false
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

