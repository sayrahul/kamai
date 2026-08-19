import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { AppShell } from '@/components/layout/AppShell';

import { PWAInstallBanner } from '@/components/pwa/PWAInstallBanner';

export const metadata: Metadata = {
  title: 'KamaiPlus (Kamai+) | Business Management & Growth Platform',
  description: 'Sell, Manage, and Grow your local Indian business with instant POS billing, offline Khata, inventory, and WhatsApp marketing.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <I18nProvider>
          <AppShell>
            {children}
          </AppShell>
          <PWAInstallBanner />
        </I18nProvider>
      </body>
    </html>
  );
}