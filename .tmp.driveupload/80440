import React, { createContext, useContext, useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PwaContextType {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  isIOSModalOpen: boolean;
  setIsIOSModalOpen: (open: boolean) => void;
  triggerInstall: () => Promise<boolean>;
  updateApp: () => void;
}

const PwaContext = createContext<PwaContextType | undefined>(undefined);

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isIOSModalOpen, setIsIOSModalOpen] = useState(false);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSWFn, setUpdateSWFn] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      setCanInstall(false);
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice && !isStandalone) {
      setCanInstall(true);
    }

    // 3. Listen for browser's native beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);
      console.log('[PWA] beforeinstallprompt event captured and ready for native install prompt.');
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Application successfully installed.');
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsIOSModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Register Workbox Service Worker via virtual:pwa-register
    try {
      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content available; ready to refresh.');
          setNeedRefresh(true);
        },
        onOfflineReady() {
          console.log('[PWA] Application assets cached and ready to work offline.');
          setOfflineReady(true);
        },
        onRegisteredSW(swScriptUrl, registration) {
          console.log('[PWA] Service Worker registered at:', swScriptUrl, registration);
        },
        onRegisterError(error) {
          console.warn('[PWA] Service Worker registration failed:', error);
        },
      });
      setUpdateSWFn(() => update);
    } catch (err) {
      console.warn('[PWA] registerSW initialization error:', err);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log('[PWA] Native installation prompt outcome:', choice.outcome);
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setCanInstall(false);
          setDeferredPrompt(null);
          return true;
        }
        return false;
      } catch (err) {
        console.error('[PWA] Error showing native install prompt:', err);
        return false;
      }
    }

    if (isIOS) {
      setIsIOSModalOpen(true);
      return false;
    }

    return false;
  };

  const updateApp = () => {
    if (updateSWFn) {
      updateSWFn();
    }
  };

  return (
    <PwaContext.Provider
      value={{
        canInstall,
        isInstalled,
        isIOS,
        needRefresh,
        offlineReady,
        isIOSModalOpen,
        setIsIOSModalOpen,
        triggerInstall,
        updateApp,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider');
  }
  return context;
};
