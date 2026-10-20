import React, { useState } from 'react';
import { usePwa } from '../context/PwaContext.tsx';
import { Download, Share2, PlusSquare, X, RefreshCw, CheckCircle2 } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const {
    canInstall,
    isInstalled,
    isIOS,
    isIOSModalOpen,
    setIsIOSModalOpen,
    triggerInstall,
    needRefresh,
    offlineReady,
    updateApp,
  } = usePwa();

  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('axiom_pwa_banner_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const [offlineToastVisible, setOfflineToastVisible] = useState(true);

  const handleDismissBanner = () => {
    setIsBannerDismissed(true);
    try {
      sessionStorage.setItem('axiom_pwa_banner_dismissed', 'true');
    } catch {}
  };

  const handleInstallClick = async () => {
    await triggerInstall();
  };

  return (
    <>
      {/* 1. Offline Ready Toast (Discreet notification) */}
      {offlineReady && offlineToastVisible && !isInstalled && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-neutral-900 border border-emerald-700/80 rounded-lg shadow-xl text-xs text-neutral-200 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Axiom Wealth is cached and ready to work offline.</span>
          <button
            type="button"
            onClick={() => setOfflineToastVisible(false)}
            className="text-neutral-400 hover:text-white p-0.5 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. New Version Available Update Banner */}
      {needRefresh && (
        <div className="fixed top-16 right-4 z-50 flex items-center gap-3 px-3.5 py-2.5 bg-neutral-900 border border-blue-500 rounded-lg shadow-2xl text-xs text-neutral-100 animate-in fade-in slide-in-from-top-2">
          <RefreshCw className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
          <span>New update available for Axiom Wealth!</span>
          <button
            type="button"
            onClick={updateApp}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 font-bold rounded text-white text-[11px] transition shadow-xs cursor-pointer"
          >
            Update Now
          </button>
        </div>
      )}

      {/* 3. Floating Install App Banner (Desktop & Mobile) */}
      {canInstall && !isInstalled && !isBannerDismissed && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] bg-neutral-900/95 dark:bg-[#1a1e20]/95 backdrop-blur-md border border-neutral-700/80 dark:border-neutral-700 p-3.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 text-neutral-100">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <img
                src="/pwa-192x192.png"
                alt="Axiom Wealth Logo"
                className="w-10 h-10 rounded-lg shadow-md border border-neutral-700 shrink-0 object-cover"
              />
              <div>
                <h4 className="font-bold text-xs text-white">Install Axiom Wealth</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                  Fast offline access, full-screen view &amp; home screen shortcut.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDismissBanner}
              className="text-neutral-400 hover:text-white p-1 rounded transition cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismissBanner}
              className="px-2.5 py-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition font-medium cursor-pointer"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-md transition hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          </div>
        </div>
      )}

      {/* 4. iOS Safari Add to Home Screen Instructions Modal */}
      {isIOS && isIOSModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-700 max-w-sm w-full p-4 rounded-2xl shadow-2xl text-neutral-100 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <img
                  src="/pwa-192x192.png"
                  alt="Axiom Wealth"
                  className="w-7 h-7 rounded-md border border-neutral-700"
                />
                <h3 className="font-bold text-sm text-white">Install on iOS</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsIOSModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Install <strong>Axiom Wealth</strong> on your iPhone or iPad for an app-like full-screen experience:
            </p>

            <ol className="text-xs space-y-2.5 text-neutral-300">
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-[10px] text-emerald-400 shrink-0">
                  1
                </div>
                <div>
                  Tap the <strong className="text-white">Share</strong> button in Safari's bottom toolbar (<Share2 className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" />).
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-[10px] text-emerald-400 shrink-0">
                  2
                </div>
                <div>
                  Scroll down the share sheet and select <strong className="text-white">Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" />).
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-[10px] text-emerald-400 shrink-0">
                  3
                </div>
                <div>
                  Tap <strong className="text-white">Add</strong> in the top-right corner to finish.
                </div>
              </li>
            </ol>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsIOSModalOpen(false)}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-lg text-xs text-white transition shadow-sm cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
