import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  X,
  FileText,
  ReceiptText,
  Wallet,
  TrendingUp,
  Shield,
  Calculator,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  LogIn,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Sliders,
  Sparkles,
  BookOpen,
  Moon,
  Sun,
  Download,
} from 'lucide-react';
import { AppNavTab } from './Navbar';
import { useTooltips } from '../context/TooltipContext';
import { useTheme } from '../context/ThemeContext';
import { usePwa } from '../context/PwaContext';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: AppNavTab;
  setActiveTab: (tab: AppNavTab) => void;
  totalAlertCount?: number;
  user: User | null;
  userName?: string;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  onOpenHelp?: () => void;
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  totalAlertCount = 0,
  user,
  userName,
  onOpenAuthModal,
  onSignOut,
  onOpenHelp,
}) => {
  const { tooltipsEnabled, toggleTooltips } = useTooltips();
  const { isDark, toggleTheme } = useTheme();
  const { canInstall, isInstalled, triggerInstall } = usePwa();

  // Accordion open states
  const isToolsActive =
    activeTab === 'analytics' ||
    activeTab === 'purchase-checker' ||
    activeTab === 'stock-dividend-calculator';
  const isSettingsActive = activeTab === 'notifications' || activeTab === 'settings';

  const [isToolsOpen, setIsToolsOpen] = useState<boolean>(isToolsActive);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(isSettingsActive);

  if (!isOpen) return null;

  const handleSelect = (tab: AppNavTab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleHelpClick = () => {
    onClose();
    if (onOpenHelp) {
      onOpenHelp();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1e2324] border-t border-neutral-700 w-full max-h-[88vh] rounded-t-2xl overflow-y-auto shadow-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Pill Indicator */}
        <div className="w-12 h-1 rounded-full bg-neutral-600 mx-auto" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-700/80">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Axiom Wealth"
              className="h-7 w-auto object-contain rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div>
              <span className="font-extrabold text-sm text-neutral-100 uppercase tracking-wider block">
                Axiom Wealth
              </span>
              <span className="text-[10px] text-neutral-400">Navigation &amp; Utilities</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition cursor-pointer"
            aria-label="Close Navigation Menu"
          >
            <X className="w-5 h-5 text-neutral-400 hover:text-white" />
          </button>
        </div>

        {/* Primary Application Pages Section */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5">
            Core Ledger Pages
          </div>

          {/* Tab 1: Financial Statement */}
          <button
            type="button"
            onClick={() => handleSelect('dashboard')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-bold shadow-xs'
                : 'text-neutral-200 hover:bg-neutral-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Financial Statement</div>
                <div className="text-[10px] text-neutral-400">Income Statement, Cashflow &amp; Balance Sheet</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </button>

          {/* Tab 2: Income & Expenses */}
          <button
            type="button"
            onClick={() => handleSelect('income-expenses')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'income-expenses'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700 font-bold shadow-xs'
                : 'text-neutral-200 hover:bg-neutral-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-amber-950/90 border border-amber-700/60 flex items-center justify-center text-amber-400 shrink-0">
                <ReceiptText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Income &amp; Expenses Tracker</div>
                <div className="text-[10px] text-neutral-400">Transaction logs, budgets &amp; recurring engine</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </button>

          {/* Tab 3: Wealth */}
          <button
            type="button"
            onClick={() => handleSelect('wealth')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'wealth' || activeTab === 'assets' || activeTab === 'liabilities'
                ? 'bg-blue-950/80 text-blue-300 border border-blue-700 font-bold shadow-xs'
                : 'text-neutral-200 hover:bg-neutral-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-blue-950/90 border border-blue-700/60 flex items-center justify-center text-blue-400 shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Wealth Portfolio &amp; Debts</div>
                <div className="text-[10px] text-neutral-400">Assets, holdings, liabilities &amp; net worth</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
          </button>
        </div>

        {/* ================= ACCORDION 1: TOOLS & UTILITIES ================= */}
        <div className="pt-2 border-t border-neutral-700/60 space-y-1.5">
          <button
            type="button"
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                Tools &amp; Utilities
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                3 Tools
              </span>
            </div>
            {isToolsOpen ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {isToolsOpen && (
            <div className="space-y-1.5 pl-1 animate-in fade-in duration-150">
              {/* Analytics */}
              <button
                type="button"
                onClick={() => handleSelect('analytics')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'analytics'
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700 font-bold shadow-xs'
                    : 'text-neutral-200 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-cyan-950/90 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Analytics</div>
                    <div className="text-[10px] text-neutral-400">Stock-market style glowing trend line graph</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
              </button>

              {/* Purchase Checker */}
              <button
                type="button"
                onClick={() => handleSelect('purchase-checker')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'purchase-checker'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-700 font-bold shadow-xs'
                    : 'text-neutral-200 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-purple-950/90 border border-purple-700/60 flex items-center justify-center text-purple-400 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Purchase Checker</div>
                    <div className="text-[10px] text-neutral-400">10x Rule Affordability &amp; Impulse Evaluator</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
              </button>

              {/* Stock & Dividend Calculator */}
              <button
                type="button"
                onClick={() => handleSelect('stock-dividend-calculator')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'stock-dividend-calculator'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-bold shadow-xs'
                    : 'text-neutral-200 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Stock &amp; Dividend Simulator</div>
                    <div className="text-[10px] text-neutral-400">DRIP Compounding &amp; Yield Projections</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* ================= ACCORDION 2: PREFERENCES & SYSTEM ================= */}
        <div className="pt-2 border-t border-neutral-700/60 space-y-1.5">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                Preferences &amp; System
              </span>
              {totalAlertCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-extrabold animate-pulse">
                  {totalAlertCount}
                </span>
              )}
            </div>
            {isSettingsOpen ? (
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {isSettingsOpen && (
            <div className="space-y-1.5 pl-1 animate-in fade-in duration-150">
              {/* Notifications */}
              <button
                type="button"
                onClick={() => handleSelect('notifications')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'notifications'
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-700 font-bold shadow-xs'
                    : 'text-neutral-200 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-amber-950/90 border border-amber-700/60 flex items-center justify-center text-amber-400 shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Notifications &amp; Alerts</div>
                    <div className="text-[10px] text-neutral-400">Scheduled bill dues &amp; budget warnings</div>
                  </div>
                </div>
                {totalAlertCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                    {totalAlertCount} active
                  </span>
                ) : (
                  <span className="text-[10px] text-neutral-400">0 alerts</span>
                )}
              </button>

              {/* Settings & Utilities */}
              <button
                type="button"
                onClick={() => handleSelect('settings')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700 font-bold shadow-xs'
                    : 'text-neutral-200 hover:bg-neutral-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Settings &amp; Utilities</div>
                    <div className="text-[10px] text-neutral-400">Subtabs: Profile, Preferences &amp; Dev Tools</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
              </button>

              {/* Contextual Page Guide */}
              <button
                type="button"
                onClick={handleHelpClick}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800/80 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Guide</div>
                    <div className="text-[10px] text-neutral-400">Operational walkthrough for active page</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0" />
              </button>

              {/* Master Tooltip Switch on Mobile */}
              <button
                type="button"
                onClick={toggleTooltips}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800/80 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    tooltipsEnabled
                      ? 'bg-emerald-950/90 border border-emerald-700/60 text-emerald-400'
                      : 'bg-neutral-800 border border-neutral-700 text-neutral-500'
                  }`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Hover Tooltips &amp; Guidance</div>
                    <div className="text-[10px] text-neutral-400">
                      {tooltipsEnabled ? 'Enabled across all buttons & metrics' : 'Disabled for clean UI'}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  tooltipsEnabled
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                }`}>
                  {tooltipsEnabled ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Theme Toggle on Mobile */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800/80 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                    isDark
                      ? 'bg-neutral-800 border border-cyan-800 text-cyan-400'
                      : 'bg-amber-950/90 border border-amber-700/60 text-amber-400'
                  }`}>
                    {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Theme Mode</div>
                    <div className="text-[10px] text-neutral-400">
                      {isDark ? 'Dark theme active' : 'Light theme active'}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                  isDark
                    ? 'bg-neutral-800 text-cyan-300 border border-cyan-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-700'
                }`}>
                  {isDark ? 'DARK' : 'LIGHT'}
                </span>
              </button>

              {/* Install Axiom Wealth PWA Button */}
              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    triggerInstall();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800/80 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">Install Axiom Wealth</div>
                      <div className="text-[10px] text-neutral-400">
                        Add to home screen / standalone app
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                    Install
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Account / Sign Out / Sign In Footer */}
        <div className="pt-3 border-t border-neutral-700/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 truncate max-w-[200px]">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt="User"
                className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center text-neutral-300 shrink-0">
                <UserIcon className="w-4 h-4 text-emerald-400" />
              </div>
            )}
            <div className="truncate">
              <div className="font-bold text-white truncate text-[11px]">
                {user?.displayName || userName || 'Guest User'}
              </div>
              <div className="text-[9px] text-neutral-400 truncate">
                {user?.email || 'Local Offline Mode'}
              </div>
            </div>
          </div>

          {user ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSignOut) onSignOut();
              }}
              className="px-3 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/70 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onOpenAuthModal) onOpenAuthModal();
              }}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
