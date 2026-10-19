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
  ChevronUp,
  User as UserIcon,
} from 'lucide-react';
import { AppNavTab } from './Navbar';
import { useTooltips } from '../context/TooltipContext';

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

  const [isToolsOpen, setIsToolsOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

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
        className="bg-[#1e2324] border-t border-neutral-700 w-full max-h-[85vh] rounded-t-2xl overflow-y-auto shadow-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-200"
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

        {/* Application Pages Section */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-2 py-0.5">
            Application Pages
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
              <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Financial Statement</div>
                <div className="text-[10px] text-neutral-400">Income Statement, Cashflow &amp; Balance Sheet</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
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
              <div className="w-7 h-7 rounded-md bg-amber-950/90 border border-amber-700/60 flex items-center justify-center text-amber-400">
                <ReceiptText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Income &amp; Expenses Tracker</div>
                <div className="text-[10px] text-neutral-400">Transaction logs, budgets &amp; recurring engine</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
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
              <div className="w-7 h-7 rounded-md bg-blue-950/90 border border-blue-700/60 flex items-center justify-center text-blue-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Wealth Portfolio &amp; Debts</div>
                <div className="text-[10px] text-neutral-400">Assets, holdings, liabilities &amp; net worth</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Tools & Utilities Accordion Section */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-700/60">
          <button
            type="button"
            onClick={() => setIsToolsOpen(!isToolsOpen)}
            className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200">
              <span>Tools &amp; Utilities</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-neutral-800 rounded-full text-neutral-400">3</span>
            </div>
            {isToolsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200" />
            )}
          </button>

          {isToolsOpen && (
            <div className="space-y-1 animate-in fade-in duration-150 pl-0.5">
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
                  <div className="w-7 h-7 rounded-md bg-cyan-950/90 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Analytics</div>
                    <div className="text-[10px] text-neutral-400">Stock-market style glowing trend line graph</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
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
                  <div className="w-7 h-7 rounded-md bg-purple-950/90 border border-purple-700/60 flex items-center justify-center text-purple-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Purchase Checker</div>
                    <div className="text-[10px] text-neutral-400">10x Rule Affordability &amp; Impulse Evaluator</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
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
                  <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Stock &amp; Dividend Calculator</div>
                    <div className="text-[10px] text-neutral-400">DRIP Compounding &amp; Yield Projections</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>
            </div>
          )}
        </div>

        {/* Settings & Preferences Accordion Section */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-700/60">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-neutral-800/50 transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 group-hover:text-neutral-200">
              <span>Settings &amp; Preferences</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-neutral-800 rounded-full text-neutral-400">4</span>
            </div>
            {isSettingsOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-200" />
            )}
          </button>

          {isSettingsOpen && (
            <div className="space-y-1 animate-in fade-in duration-150 pl-0.5">
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
                  <div className="w-7 h-7 rounded-md bg-amber-950/90 border border-amber-700/60 flex items-center justify-center text-amber-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Notifications &amp; Alerts</div>
                    <div className="text-[10px] text-neutral-400">Scheduled bill dues &amp; budget cap warnings</div>
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
                  <div className="w-7 h-7 rounded-md bg-emerald-950/90 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Settings &amp; Utilities</div>
                    <div className="text-[10px] text-neutral-400">Account management, wipe data &amp; Google Sheets</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>

              {/* Help & Guide */}
              <button
                type="button"
                onClick={handleHelpClick}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800/80 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-blue-950/90 border border-blue-700/60 flex items-center justify-center text-blue-400">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Help &amp; Guide</div>
                    <div className="text-[10px] text-neutral-400">Documentation, onboarding &amp; feature walkthrough</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-500" />
              </button>

              {/* Master Tooltip Switch on Mobile */}
              <button
                type="button"
                onClick={toggleTooltips}
                className="w-full flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-semibold text-neutral-200 hover:bg-neutral-800/80 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    tooltipsEnabled
                      ? 'bg-emerald-950/90 border border-emerald-700/60 text-emerald-400'
                      : 'bg-neutral-800 border border-neutral-700 text-neutral-500'
                  }`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">Hover Tooltips &amp; Guidance</div>
                    <div className="text-[10px] text-neutral-400">
                      {tooltipsEnabled ? 'Enabled on all buttons & metrics' : 'Disabled for minimal UI'}
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
                className="w-7 h-7 rounded-full object-cover ring-1 ring-emerald-500"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-600 flex items-center justify-center text-neutral-300">
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
