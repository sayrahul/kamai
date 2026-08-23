'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global variable to capture event even before component mounts
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('pwa_prompt_available'));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(true); // default to true during SSR to prevent flash
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  useEffect(() => {
    // Comprehensive check for installed state
    const checkInstalled = () => {
      if (typeof window === 'undefined') return false;

      // 1. Stored installation flag
      const storedInstalled = localStorage.getItem('kamai_app_installed') === 'true';

      // 2. Electron / Desktop App wrapper
      const isElectron = 
        Boolean((window as any).electron) || 
        Boolean((window as any).isElectron) || 
        navigator.userAgent.toLowerCase().includes('electron');

      // 3. Standalone display mode (PWA / Fullscreen window)
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches || 
        window.matchMedia('(display-mode: window-controls-overlay)').matches || 
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      return storedInstalled || isElectron || isStandalone;
    };

    const installed = checkInstalled();
    setIsInstalled(installed);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    const handlePromptAvailable = () => {
      if (!checkInstalled()) {
        setDeferredPrompt(globalDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      try {
        localStorage.setItem('kamai_app_installed', 'true');
        localStorage.setItem('kamai_pwa_banner_dismissed', 'true');
      } catch (e) {
        // ignore
      }
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };

    const standaloneMedia = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        handleAppInstalled();
      }
    };

    window.addEventListener('pwa_prompt_available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);
    if (standaloneMedia.addEventListener) {
      standaloneMedia.addEventListener('change', handleDisplayModeChange);
    }

    // Register service worker if supported
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('SW registration:', err));
    }

    return () => {
      window.removeEventListener('pwa_prompt_available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (standaloneMedia.removeEventListener) {
        standaloneMedia.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (isInstalled) {
      alert('KamaiPlus is already installed on your device!');
      return false;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
          return true;
        }
      } catch (err) {
        console.error('Install prompt error:', err);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Desktop Chrome / Edge fallback manual instruction
      alert('To install KamaiPlus on your PC:\n1. Click the Install icon (⊞ or ⬇) in your browser address bar.\n2. Or click the 3 dots menu ⋮ ➔ "Install KamaiPlus" / "Add shortcut".');
    }
    return false;
  };

  return {
    canInstall: !isInstalled,
    isInstalled,
    isIOS,
    showIOSModal,
    setShowIOSModal,
    triggerInstall,
  };
}
