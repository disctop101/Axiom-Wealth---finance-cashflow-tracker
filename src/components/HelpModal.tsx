import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  X,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
  RefreshCw,
  Search,
  BookOpen,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  ShieldCheck,
  CheckCircle2,
  Scan,
  Coins,
  Bell,
  Settings as SettingsIcon,
  MousePointer,
  Eye,
  Scale,
  ArrowRight,
  Palette,
} from 'lucide-react';
import { AppNavTab } from './Navbar';
import { useTooltips } from '../context/TooltipContext';

import { PAGE_GUIDES } from './pageGuidesData';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: AppNavTab;
  userName?: string;
  onNavigateTab?: (tab: AppNavTab) => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  activeTab = 'dashboard',
  userName,
  onNavigateTab,
}) => {
  const [selectedTab, setSelectedTab] = useState<AppNavTab>(activeTab);
  const { tooltipsEnabled, toggleTooltips } = useTooltips();

  useEffect(() => {
    if (isOpen) {
      setSelectedTab(activeTab);
    }
  }, [isOpen, activeTab]);

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

  const currentGuide = PAGE_GUIDES[selectedTab] || PAGE_GUIDES.dashboard;
  const GuideIcon = currentGuide.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150 overflow-x-hidden"
    >
      <div className="bg-white border border-neutral-300 w-full max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[92vh] flex flex-col shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-[#212529] text-white px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-neutral-700 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 bg-emerald-950/90 border border-emerald-600/70 rounded-lg text-emerald-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-wide">
                  Help &amp; Operational Guide
                </h2>
                <span className="text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-700 truncate max-w-[140px] sm:max-w-none">
                  {userName ? `${userName}'s Ledger` : 'Axiom Wealth'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-neutral-400 font-mono truncate">
                Comprehensive reference for page functions, workflows &amp; button behaviours
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto shrink-0">
            {/* Quick Master Tooltip Toggle in Header */}
            <button
              type="button"
              onClick={toggleTooltips}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                tooltipsEnabled
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600 hover:bg-emerald-900'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
              }`}
              title="Toggle interactive tooltips across all pages"
            >
              <MousePointer className="w-3.5 h-3.5" />
              <span>Tooltips: {tooltipsEnabled ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              title="Close guide (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Selector Tabs Strip */}
        <div className="bg-[#2a2f32] px-3 py-2 border-b border-neutral-700 flex items-center gap-1 overflow-x-auto shrink-0 select-none no-scrollbar">
          {(Object.keys(PAGE_GUIDES) as AppNavTab[]).map((tabKey) => {
            const isCurrent = selectedTab === tabKey;
            const TabIcon = PAGE_GUIDES[tabKey].icon;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setSelectedTab(tabKey)}
                className={`px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-700/60'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span className="capitalize">{tabKey.replace('-', ' ')}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body: Active Page Guide */}
        <div className="p-5 overflow-y-auto space-y-4 text-neutral-800 text-xs sm:text-sm leading-relaxed flex-1">
          {/* Active Page Header Banner */}
          <div className="p-3.5 bg-neutral-900 text-white rounded-lg border border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-lg">
                <GuideIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">{currentGuide.title}</h3>
                <p className="text-xs text-neutral-400">{currentGuide.subtitle}</p>
              </div>
            </div>

            {onNavigateTab && selectedTab !== activeTab && (
              <button
                type="button"
                onClick={() => {
                  onNavigateTab(selectedTab);
                  onClose();
                }}
                className="self-start sm:self-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Navigate to this Page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Section Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

          {/* Master Tooltip Information Banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <b>Interactive Hover Tooltips:</b> Hover over any metric card, chart element, or actionable button across the entire platform to view instant contextual explanations.
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTooltips}
              className={`px-2.5 py-1 rounded text-xs font-bold transition cursor-pointer self-start sm:self-auto shrink-0 ${
                tooltipsEnabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
              }`}
            >
              {tooltipsEnabled ? 'Tooltips Enabled ✓' : 'Tooltips Disabled (Click to Enable)'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-neutral-100 px-5 py-3 border-t border-neutral-300 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-mono">
            <BookOpen className="w-3.5 h-3.5 text-neutral-400" />
            <span>Axiom Wealth Standard Operating Guidance</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded text-xs transition shadow-xs cursor-pointer"
          >
            Got it, Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
