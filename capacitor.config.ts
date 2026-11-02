import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gstmedicose.billingandstockmanagement',
  appName: 'GST Medicose',
  webDir: 'dist/billing-and-stock-management-app',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,       
      launchAutoHide: false,       
      backgroundColor: '#ffffffff', 
      androidSplashResourceName: 'splash',
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;