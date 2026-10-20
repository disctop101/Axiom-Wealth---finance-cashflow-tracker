import React, { useEffect } from 'react';
import {
  X,
  BookOpen,
  MousePointer,
  Sparkles,
} from 'lucide-react';
import { AppNavTab } from './Navbar';
import { PAGE_GUIDES } from './pageGuidesData';
import { useTooltips } from '../context/TooltipContext';

interface ContextualGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppNavTab;
  userName?: string;
}

export const ContextualGuideModal: React.FC<ContextualGuideModalProps> = ({
  isOpen,
  onClose,
  activeTab,
  userName,
}) => {
  const { tooltipsEnabled, toggleTooltips } = useTooltips();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentGuide = PAGE_GUIDES[activeTab] || PAGE_GUIDES.dashboard;
  const GuideIcon = currentGuide.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-x-hidden"
      onClick={onClose}
    >
      <div
        className="bg-white border border-neutral-300 w-full max-w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] flex flex-col shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Contextual Modal Header */}
        <div className="bg-[#212529] text-white px-4 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between border-b border-neutral-700 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-emerald-950/90 border border-emerald-600/70 rounded-lg text-emerald-400 shrink-0">
              <GuideIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-wide">
                  {currentGuide.title} Guide
                </h2>
                <span className="text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700">
                  Page Guide
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 font-mono truncate">
                {currentGuide.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer shrink-0 ml-2"
            title="Close guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Strictly Contextual to this active module */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-neutral-800 text-xs sm:text-sm leading-relaxed flex-1">
          {/* Quick Subtitle Banner */}
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              This guide provides operational walkthroughs and button references strictly relevant to the <strong>{currentGuide.title}</strong> module.
            </span>
          </div>

          {/* Contextual Section Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentGuide.sections.map((section, idx) => {
              const SecIcon = section.icon;
              return (
                <div
                  key={idx}
                  className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-neutral-300 transition flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white border border-neutral-300 rounded text-neutral-700 shadow-2xs">
                          <SecIcon className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-neutral-900 text-xs">{section.title}</h4>
                      </div>
                      {section.badge && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                          {section.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-600 text-[11px] leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Tooltip Info Strip */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MousePointer className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-[11px]">
                Hover over any metric card or button on this page for instant contextual explanations.
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTooltips}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer shrink-0 border ${
                tooltipsEnabled
                  ? 'bg-blue-600 text-white border-blue-700'
                  : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100'
              }`}
            >
              Tooltips: {tooltipsEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-100 px-4 sm:px-5 py-3 border-t border-neutral-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
            <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
            <span>{userName ? `${userName}'s Ledger Guide` : 'Axiom Wealth Operating Guide'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg text-xs transition shadow-xs cursor-pointer"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
