import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tipcalculator.plus',
  appName: 'Tip Calculator Plus+',
  webDir: 'dist',
  server: {
    url: 'https://tip-calculator-plus.vercel.app',
    cleartext: true,
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#060810',
    },
  },
};

export default config;
