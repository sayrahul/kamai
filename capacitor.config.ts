import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kamaiplus.pos',
  appName: 'KamaiPlus',
  webDir: 'public',
  server: {
    url: 'https://kamaiplus.proventure.in',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
  plugins: {
    // Custom native plugin configs
  },
};

export default config;
