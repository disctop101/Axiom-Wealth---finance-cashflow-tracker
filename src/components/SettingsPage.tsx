import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Settings,
  User as UserIcon,
  LogOut,
  LogIn,
  FileSpreadsheet,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Coins,
  Edit3,
  Check,
  Sparkles,
  RotateCcw,
  Cloud,
  HardDrive,
  CreditCard,
  Sliders,
  ExternalLink,
  Lock,
  AlertCircle,
  CheckCircle2,
  Palette,
  HelpCircle,
  BookOpen,
  Smartphone,
  Download,
  Clock,
} from 'lucide-react';
import { useTooltips } from '../context/TooltipContext';
import { usePwa } from '../context/PwaContext';
import { Tooltip } from './Tooltip';
import {
  loadCategoryColors,
  saveCategoryColors,
  DEFAULT_CATEGORY_COLORS,
  COLOR_PRESETS,
} from '../services/categoryColors';
import {
  CurrencyConfig,
  AVAILABLE_CURRENCIES,
} from '../types/finance';
import {
  isOwnerUser,
  getOwnerEmail,
  setOwnerEmail,
  getDeveloperProOverride,
  setDeveloperProOverride,
  SubscriptionPlanType,
  getTrialStatus,
  setSimulateTrialExpired,
  resetTrialStartTime,
  simulateTrialDaysRemaining,
  activateFreeTrial,
  resetTrialToUnactivated,
  TrialStatus,
} from '../services/subscription';
import {
  changeUserPassword,
  getFriendlyAuthError,
} from '../firebase';

export type SettingsSubTab = 'profile-security' | 'app-preferences' | 'developer-settings';

interface SettingsPageProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenAuthModal?: () => void;
  isSyncing?: boolean;
  userName: string;
  onUpdateUserName: (name: string) => void;
  currency: CurrencyConfig;
  onChangeCurrency: (curr: CurrencyConfig) => void;
  onOpenExportSheets: () => void;
  onOpenBackupRestore?: (tab?: 'export' | 'restore') => void;
  onWipeAllData: () => Promise<void> | void;
  onOpenPaywall: () => void;
  previewAsCustomer: boolean;
  onTogglePreviewAsCustomer: (val: boolean) => void;
  isSubscribed: boolean;
  subscriptionPlan: SubscriptionPlanType | null;
  onResetTestSubscription: () => void;
  onInjectMockData?: () => void;
  onOpenHelp?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  user,
  onSignIn,
  onSignOut,
  onOpenAuthModal,
  isSyncing,
  userName,
  onUpdateUserName,
  currency,
  onChangeCurrency,
  onOpenExportSheets,
  onOpenBackupRestore,
  onWipeAllData,
  onOpenPaywall,
  previewAsCustomer,
  onTogglePreviewAsCustomer,
  isSubscribed,
  subscriptionPlan,
  onResetTestSubscription,
  onInjectMockData,
  onOpenHelp,
}) => {
  // Master Tooltip Toggle State
  const { tooltipsEnabled, toggleTooltips } = useTooltips();

  // PWA & Service Worker Status
  const { isInstalled, canInstall, triggerInstall, needRefresh, updateApp, offlineReady } = usePwa();

  // Active Subtab State
  const isAdmin = isOwnerUser(user);
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('profile-security');

  useEffect(() => {
    if (activeSubTab === 'developer-settings' && !isAdmin) {
      setActiveSubTab('profile-security');
    }
  }, [isAdmin, activeSubTab]);

  // Personalized Name Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  // Admin Custom Email State
  const [ownerEmailInput, setOwnerEmailInput] = useState(getOwnerEmail());
  const [ownerEmailSaved, setOwnerEmailSaved] = useState(false);

  // In-app Change Password State
  const isPasswordUser = user?.providerData?.some((p) => p.providerId === 'password') ?? false;
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Wipe All Data State & Text Verification
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [wipeConfirmationText, setWipeConfirmationText] = useState('');
  const [wipePasswordError, setWipePasswordError] = useState<string | null>(null);
  const [wipeSuccessMsg, setWipeSuccessMsg] = useState<string | null>(null);

  const isWipeConfirmed = wipeConfirmationText.trim().toLowerCase() === 'wipe all data';

  // 15-Day Free Trial Simulation Controls State
  const [trialInfo, setTrialInfo] = useState<TrialStatus>(getTrialStatus);
  const [isDevProActive, setIsDevProActive] = useState<boolean>(() => getDeveloperProOverride(user?.email));

  useEffect(() => {
    const handleSyncTrial = () => {
      setTrialInfo(getTrialStatus());
      setIsDevProActive(getDeveloperProOverride(user?.email));
    };
    window.addEventListener('axiom_trial_change', handleSyncTrial);
    return () => window.removeEventListener('axiom_trial_change', handleSyncTrial);
  }, [user?.email]);

  const handleActivateTrial = () => {
    const next = activateFreeTrial();
    setTrialInfo(next);
  };

  const handleResetToUnactivated = () => {
    const next = resetTrialToUnactivated();
    setTrialInfo(next);
  };

  const handleSimulateTrialExpired = () => {
    setSimulateTrialExpired(true);
    setTrialInfo(getTrialStatus());
  };

  const handleResetTrial = () => {
    const next = resetTrialStartTime();
    setTrialInfo(next);
  };

  const handleSimulateTrial3Days = () => {
    const next = simulateTrialDaysRemaining(3);
    setTrialInfo(next);
  };

  // Global Category Color Management State
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(() => loadCategoryColors());
  const [colorCategoryTab, setColorCategoryTab] = useState<'income' | 'expense' | 'asset' | 'liability'>('income');
  const [colorFeedback, setColorFeedback] = useState<string | null>(null);

  const handleUpdateCategoryColor = (category: string, hexColor: string) => {
    const updated = { ...categoryColors, [category]: hexColor };
    setCategoryColors(updated);
    saveCategoryColors(updated);
    setColorFeedback(`Color updated for "${category}"`);
    setTimeout(() => setColorFeedback(null), 2500);
  };

  const handleResetCategoryColors = () => {
    setCategoryColors({ ...DEFAULT_CATEGORY_COLORS });
    saveCategoryColors({ ...DEFAULT_CATEGORY_COLORS });
    setColorFeedback('Category colors reset to system defaults');
    setTimeout(() => setColorFeedback(null), 2500);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdateUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleSaveOwnerEmail = () => {
    if (ownerEmailInput.trim()) {
      setOwnerEmail(ownerEmailInput.trim());
      setOwnerEmailSaved(true);
      setTimeout(() => setOwnerEmailSaved(false), 2000);
    }
  };

  const handleConfirmWipe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isWipeConfirmed) {
      setWipePasswordError('Please type "wipe all data" exactly to authorize.');
      return;
    }

    try {
      setIsWiping(true);
      setWipePasswordError(null);
      await onWipeAllData();
      setIsWipeModalOpen(false);
      setWipeConfirmationText('');
      setWipeSuccessMsg('All logged assets, liabilities, transactions, and cash balances were completely purged to a zero-balance state.');
      setTimeout(() => setWipeSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Wipe data failed:', err);
      setWipePasswordError(err?.message || 'Data wipe failed.');
    } finally {
      setIsWiping(false);
    }
  };

  // In-app Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordError('Please provide both current and new password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError(null);
      await changeUserPassword(currentPassword, newPassword);
      setPasswordSuccess('Password successfully updated!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setIsChangingPassword(false);
        setPasswordSuccess(null);
      }, 2500);
    } catch (err: any) {
      setPasswordError(getFriendlyAuthError(err));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 select-none animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-[#24292b] text-white p-4 sm:p-5 shadow-sm border border-neutral-700/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 text-emerald-400 shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wider uppercase">
              Settings &amp; Utilities
            </h1>
            <p className="text-xs text-neutral-400 font-mono">
              Account Management, Data Operations, Currency &amp; Access Controls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onOpenHelp && (
            <Tooltip content="Open operational guide and comprehensive settings walkthrough" position="bottom">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-600 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Guide</span>
              </button>
            </Tooltip>
          )}

          {/* Sync Status Badge */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800/90 border border-neutral-700 text-xs font-medium"
            title={user ? 'Synced with Firebase Firestore' : 'Stored in Local Browser Storage'}
          >
            {user ? (
              <>
                <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
                <span className="text-neutral-200">Cloud Synced</span>
              </>
            ) : (
              <>
                <HardDrive className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-300">Local Only</span>
              </>
            )}
          </div>
        </div>
      </div>

      {wipeSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{wipeSuccessMsg}</span>
        </div>
      )}

      {/* ================= SUBTAB NAVIGATION STRIP ================= */}
      <div className="flex items-center gap-1.5 p-1.5 bg-neutral-900 border border-neutral-700/80 rounded-xl overflow-x-auto no-scrollbar shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile-security')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'profile-security'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5" />
          <span>Profile &amp; Security</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('app-preferences')}
          className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'app-preferences'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>App Preferences</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveSubTab('developer-settings')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'developer-settings'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Developer Settings</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-600/60 uppercase">
              Admin
            </span>
          </button>
        )}
      </div>

      {/* ================= SUBTAB 1: PROFILE & SECURITY ================= */}
      {activeSubTab === 'profile-security' && (
        <section id="settings-profile-security" className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-[#2d3134] text-white px-4 py-2.5 border-b border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Account &amp; Profile</h2>
              </div>
              {user && (
                <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded border border-neutral-600 font-mono">
                  {isPasswordUser ? 'Email/Password' : 'Google Authenticated'}
                </span>
              )}
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {user ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-10 h-10 rounded-full object-cover border border-neutral-300 ring-2 ring-emerald-500/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-neutral-900 text-sm">
                        {user.displayName || 'Authorized User'}
                      </div>
                      <div className="text-neutral-500 font-mono text-[11px]">{user.email}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">UID: {user.uid}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-red-700 text-neutral-200 hover:text-white rounded text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <div className="font-bold text-neutral-800">Not signed in</div>
                    <div className="text-neutral-500 text-[11px]">
                      Sign in or register to sync your transactions, assets, and liabilities safely to Cloud Firestore.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAuthModal || onSignIn}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer self-start sm:self-auto"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Create Account</span>
                  </button>
                </div>
              )}

              {/* In-app Change Password for Email/Password Users */}
              {user && isPasswordUser && (
                <div className="border-t border-neutral-200 pt-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Password &amp; Security</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        Update your account master password securely.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(!isChangingPassword)}
                      className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      {isChangingPassword ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>

                  {isChangingPassword && (
                    <form onSubmit={handleChangePassword} className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 space-y-3 animate-in fade-in duration-100">
                      {passwordError && (
                        <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                          <span>{passwordError}</span>
                        </div>
                      )}
                      {passwordSuccess && (
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{passwordSuccess}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 uppercase">Current Password</label>
                          <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white focus:outline-emerald-600"
                            placeholder="Current password"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 uppercase">New Password</label>
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white focus:outline-emerald-600"
                            placeholder="At least 6 chars"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-neutral-600 uppercase">Confirm Password</label>
                          <input
                            type="password"
                            required
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1.5 border border-neutral-300 rounded text-xs bg-white focus:outline-emerald-600"
                            placeholder="Confirm password"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {passwordLoading ? 'Updating Password...' : 'Save New Password'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Personalized Ledger Owner Name */}
              <div className="border-t border-neutral-200 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="font-bold text-neutral-800">Personalized Ledger Owner Name</div>
                  <div className="text-[11px] text-neutral-500">
                    Printed on the financial statement title bar, reports, and generated vector PDF.
                  </div>
                </div>

                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="px-2.5 py-1 border border-neutral-400 rounded text-xs focus:outline-emerald-600 bg-white"
                      placeholder="Enter your name"
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="px-2 py-1 bg-neutral-200 text-neutral-700 rounded text-xs hover:bg-neutral-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-neutral-100 border border-neutral-300 px-3 py-1.5 rounded">
                    <span className="font-bold text-neutral-800">{userName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempName(userName);
                        setIsEditingName(true);
                      }}
                      className="text-neutral-500 hover:text-emerald-700 p-0.5 rounded cursor-pointer"
                      title="Edit ledger owner name"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= SUBTAB 2: APP PREFERENCES ================= */}
      {activeSubTab === 'app-preferences' && (
        <section id="settings-app-preferences" className="space-y-6 animate-in fade-in duration-150">
          {/* General Preferences Card */}
          <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-[#2d3134] text-white px-4 py-2.5 border-b border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Preferences &amp; Tools</h2>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Display &amp; Formatting</span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Global Currency Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-neutral-200">
                <div>
                  <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-yellow-600" />
                    <span>Primary Currency</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Determines the monetary symbol and formatting used throughout all balance sheets and modules.
                  </div>
                </div>

                <select
                  value={currency.code}
                  onChange={(e) => {
                    const found = AVAILABLE_CURRENCIES.find((c) => c.code === e.target.value);
                    if (found) onChangeCurrency(found);
                  }}
                  className="bg-white border border-neutral-300 rounded px-3 py-1.5 text-xs font-bold text-neutral-800 focus:outline-emerald-600 cursor-pointer"
                >
                  {AVAILABLE_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Master Tooltip and Contextual Guide Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <div className="font-bold text-neutral-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                    <span>Interactive Tooltips &amp; Guidance Overlays</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        tooltipsEnabled
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-neutral-200 text-neutral-700'
                      }`}
                    >
                      {tooltipsEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5 max-w-xl">
                    Display contextual hover tooltips, metric definitions, and formula explanations across all cards, charts, and buttons. Turn off for a minimalist, distraction-free view.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleTooltips}
                  className={`px-4 py-2 rounded text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto shrink-0 ${
                    tooltipsEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{tooltipsEnabled ? 'Disable All Tooltips' : 'Enable Tooltips'}</span>
                </button>
              </div>

              {/* Account Backup & Restore (Google Sheets / CSV / JSON) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-emerald-600" />
                    <span>Account Backup &amp; Restore</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      GOOGLE SHEETS / CSV / JSON
                    </span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Export your full cloud account (transactions, assets, liabilities, and budgets) to a downloadable CSV for Google Sheets, or restore an existing backup directly into your cloud ledger.
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenBackupRestore?.('export')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Backup</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenBackupRestore?.('restore')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore Data</span>
                  </button>
                </div>
              </div>

              {/* Export to Google Sheets */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Export to Google Sheets</span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    Export your full ledger, balance sheets, and historical income statements to Google Drive spreadsheet.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenExportSheets}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0f9d58] hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Sheets Export</span>
                </button>
              </div>

              {/* Progressive Web App (PWA) & Offline Mode */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-neutral-50 dark:bg-neutral-850 rounded-lg border border-neutral-200 dark:border-neutral-700/80">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="font-bold text-neutral-900 dark:text-white flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Progressive Web App (PWA)</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isInstalled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-600'
                          : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700'
                      }`}
                    >
                      {isInstalled ? 'STANDALONE APP' : 'WEB BROWSER'}
                    </span>
                    {offlineReady && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-600 shrink-0">
                        OFFLINE CACHED
                      </span>
                    )}
                  </div>
                  <div className="text-neutral-500 dark:text-neutral-400 text-[11px] leading-relaxed max-w-xl">
                    {isInstalled
                      ? 'Axiom Wealth is running as an installed native app with offline cache and instant loading.'
                      : 'Install Axiom Wealth to your desktop or mobile device for full offline access, faster boot times, and a standalone native app experience.'}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 w-full sm:w-auto">
                  {needRefresh && (
                    <button
                      type="button"
                      onClick={updateApp}
                      className="w-full sm:w-auto px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Update App</span>
                    </button>
                  )}
                  {!isInstalled && (
                    <button
                      type="button"
                      onClick={triggerInstall}
                      className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install Axiom Wealth</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Global Category Color Palette Card */}
          <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-[#2d3134] text-white px-4 py-2.5 border-b border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Global Category Colors &amp; Palette</h2>
              </div>
              <div className="flex items-center gap-2">
                {colorFeedback && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold animate-pulse">
                    {colorFeedback}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleResetCategoryColors}
                  className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-2 py-1 rounded border border-neutral-600 transition cursor-pointer flex items-center gap-1"
                  title="Reset all categories to default color palette"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-400" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-200">
                <div>
                  <div className="font-bold text-neutral-800">Custom Category Color Assignments</div>
                  <div className="text-[11px] text-neutral-500">
                    Colors chosen here sync globally across all Donut charts, Bar graphs, Period Visualizers, and Category tags.
                  </div>
                </div>

                {/* Category Type Tabs */}
                <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
                  {(['income', 'expense', 'asset', 'liability'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setColorCategoryTab(tab)}
                      className={`px-3 py-1 rounded font-bold text-xs capitalize transition cursor-pointer ${
                        colorCategoryTab === tab
                          ? 'bg-neutral-900 text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                      }`}
                    >
                      {tab === 'income' ? 'Income' : tab === 'expense' ? 'Expenses' : tab === 'asset' ? 'Assets' : 'Liabilities'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Color Pickers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {Object.keys(DEFAULT_CATEGORY_COLORS)
                  .filter((cat) => {
                    const incomeCats = [
                      'Salary/Wages',
                      'Interest/Dividends',
                      'Investments',
                      'Real Estate/Business Investments',
                      'Account Payables',
                      'Account Receivables',
                      'Bank Transaction',
                      'Savings',
                    ];
                    const expenseCats = [
                      'Housing',
                      'Utilities',
                      'Food',
                      'Health Care',
                      'Personal Care',
                      'Entertainment',
                      'Transportation',
                      'Miscellaneous',
                      'Real Estate/Business Expenses',
                    ];
                    const assetCats = [
                      'Cash and cash equivalents',
                      'Investment accounts',
                      'Retirement accounts',
                      'Real estate',
                      'Vehicles',
                      'Other assets',
                    ];
                    const liabilityCats = [
                      'Mortgage balance',
                      'Car loan',
                      'Student loan',
                      'Credit card balances',
                      'Other debts',
                    ];

                    if (colorCategoryTab === 'income') return incomeCats.includes(cat);
                    if (colorCategoryTab === 'expense') return expenseCats.includes(cat);
                    if (colorCategoryTab === 'asset') return assetCats.includes(cat);
                    return liabilityCats.includes(cat);
                  })
                  .map((cat) => {
                    const currentColor = categoryColors[cat] || DEFAULT_CATEGORY_COLORS[cat] || '#10b981';

                    return (
                      <div
                        key={cat}
                        className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between gap-3 hover:border-neutral-300 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-5 h-5 rounded-full border border-black/20 shadow-xs shrink-0"
                            style={{ backgroundColor: currentColor }}
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-800 text-xs truncate" title={cat}>
                              {cat}
                            </div>
                            <div className="font-mono text-[10px] text-neutral-400 uppercase">
                              {currentColor}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="color"
                            value={currentColor}
                            onChange={(e) => handleUpdateCategoryColor(cat, e.target.value)}
                            className="w-7 h-7 rounded border border-neutral-300 cursor-pointer p-0.5 bg-white"
                            title={`Select custom color for ${cat}`}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Quick Palette Swatches Reference */}
              <div className="pt-2 border-t border-neutral-200 flex flex-wrap items-center gap-1.5 text-[11px] text-neutral-500">
                <span className="font-bold text-neutral-700 mr-1">Recommended Swatches:</span>
                {COLOR_PRESETS.map((hex) => (
                  <span
                    key={hex}
                    className="w-4 h-4 rounded-full border border-neutral-300 shadow-2xs inline-block"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Subscription & Membership Card */}
          <div className="bg-white border border-neutral-300 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-[#2d3134] text-white px-4 py-2.5 border-b border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider">Subscription &amp; Membership</h2>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono">Stripe Test Mode</span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Axiom Wealth Tier Status</span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    {isAdmin && !previewAsCustomer
                      ? 'Owner Admin Account: Full unrestricted access granted via permanent owner bypass (Apex Tier).'
                      : isSubscribed
                      ? `Apex Tier Active (${subscriptionPlan || 'Active'} membership) · Cloud sync & full automations enabled.`
                      : 'Essential Tier (Free): Local device storage only. Upgrade to Apex for cloud sync, advanced analytics, and PDF exports.'}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenPaywall}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Growth Checkpoint &bull; Apex Plans</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Data Management: Wipe All Data (User Utility) */}
          <div className="bg-white border border-red-200 rounded-lg shadow-xs overflow-hidden">
            <div className="bg-[#2d3134] text-white px-4 py-2.5 border-b border-neutral-700 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider">Data Management</h2>
            </div>
            <div className="p-4 sm:p-5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <div className="font-bold text-red-700 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>Wipe All Logged Data (Pure Zero Reset)</span>
                  </div>
                  <div className="text-red-600/80 text-[11px] mt-0.5">
                    Permanently deletes all transactions, assets, liabilities and cash balances from this device and your cloud ledger. This cannot be undone.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWipeModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe All Data</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= SUBTAB 3: DEVELOPER SETTINGS (RESTRICTED TO OWNER/ADMIN) ================= */}
      {isAdmin && activeSubTab === 'developer-settings' && (
        <section id="settings-developer-settings" className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-neutral-900 border-2 border-emerald-500/80 rounded-lg shadow-xl overflow-hidden text-neutral-100">
            <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 px-4 py-3 border-b border-neutral-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Developer Settings &amp; Owner Control Center
                </h2>
              </div>
              <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-600 px-2 py-0.5 rounded-full font-bold">
                Admin Verified
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4 text-xs">
              {/* Toggle Switch: Developer Pro / Apex Mode */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-emerald-950/60 rounded-lg border border-emerald-600/80 shadow-md">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2 text-sm">
                    <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Developer Pro / Apex Mode</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        isDevProActive
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/60'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {isDevProActive ? 'UNCONDITIONAL APEX ACTIVE' : 'STANDARD TIER RULES'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 max-w-xl leading-relaxed">
                    Unconditionally unlocks the highest Apex tier for this account. Automatically hides all paywalls, trial countdowns, upgrade prompts, and restricted tool locks. (Enabled by default for <code className="text-emerald-400 font-mono">emmanuelfajutagana@gmail.com</code>).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !isDevProActive;
                    setIsDevProActive(next);
                    setDeveloperProOverride(next);
                  }}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-md cursor-pointer shrink-0 ${
                    isDevProActive
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-600'
                  }`}
                >
                  {isDevProActive ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Pro Override: ON</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-neutral-400" />
                      <span>Enable Pro Override</span>
                    </>
                  )}
                </button>
              </div>

              {/* Toggle: Preview as Customer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-neutral-800/80 rounded-lg border border-neutral-700">
                <div className="space-y-1">
                  <div className="font-bold text-white flex items-center gap-2 text-sm">
                    {previewAsCustomer ? (
                      <EyeOff className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Preview as Customer</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        previewAsCustomer
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {previewAsCustomer ? 'PREVIEW ON' : 'ADMIN BYPASS ACTIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 max-w-xl leading-relaxed">
                    {previewAsCustomer
                      ? 'Admin bypass is currently DISABLED. You are viewing the app as a standard customer to test paywalls, free tier restrictions, and the exact subscription purchase journey.'
                      : 'Admin bypass is ENABLED. Your owner email grants unrestricted access directly to all dashboard features, completely skipping subscription checks.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onTogglePreviewAsCustomer(!previewAsCustomer)}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-md cursor-pointer shrink-0 ${
                    previewAsCustomer
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                  }`}
                >
                  {previewAsCustomer ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      <span>Exit Customer Preview</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Enable Customer Preview</span>
                    </>
                  )}
                </button>
              </div>

              {/* Configurable Owner Email */}
              <div className="p-3.5 bg-neutral-850 rounded-lg border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-neutral-200">Configured Admin Owner Email</div>
                  <div className="text-[11px] text-neutral-400">
                    Any logged-in user whose email matches this address receives the automatic admin bypass.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={ownerEmailInput}
                    onChange={(e) => setOwnerEmailInput(e.target.value)}
                    className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white focus:outline-emerald-500 w-56 font-mono"
                    placeholder="admin@example.com"
                  />
                  <button
                    type="button"
                    onClick={handleSaveOwnerEmail}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition cursor-pointer"
                  >
                    {ownerEmailSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Mock Test Data Injection Utility */}
              {onInjectMockData && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-950/40 rounded-lg border border-blue-800/80">
                  <div>
                    <div className="font-bold text-blue-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>Inject 90-Day Comprehensive Test Data</span>
                    </div>
                    <div className="text-blue-200/70 text-[11px] mt-0.5">
                      Injects realistic income &amp; expense transactions, recurring bills, and multi-asset entries (Tech equities, dividend aristocrats, real estate) spanning the past 90 days.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onInjectMockData}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Inject 90-Day Test Data</span>
                  </button>
                </div>
              )}

              {/* 15-Day Free Trial Simulation & Testing Panel */}
              <div className="p-4 bg-neutral-850 rounded-lg border border-neutral-700/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Apex 15-Day Free Trial Controls</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          !trialInfo.isActivated
                            ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                            : trialInfo.isActive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-red-950 text-red-300 border border-red-700'
                        }`}
                      >
                        {!trialInfo.isActivated
                          ? 'UNACTIVATED (Essential Tier)'
                          : trialInfo.isActive
                          ? `ACTIVE (${trialInfo.daysRemaining}d remaining)`
                          : 'EXPIRED (Downgraded to Essential)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Test Essential vs. Apex gating. Trials do not start automatically; users must activate them. Use buttons below to simulate states.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!trialInfo.isActivated && (
                      <button
                        type="button"
                        onClick={handleActivateTrial}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-bold border border-emerald-500 transition cursor-pointer"
                      >
                        Activate 15-Day Trial
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleSimulateTrialExpired}
                      className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-red-100 rounded text-xs font-bold border border-red-700 transition cursor-pointer"
                    >
                      Simulate Trial Expired
                    </button>
                    <button
                      type="button"
                      onClick={handleSimulateTrial3Days}
                      className="px-2.5 py-1.5 bg-amber-900/70 hover:bg-amber-800 text-amber-200 rounded text-xs font-bold border border-amber-700 transition cursor-pointer"
                    >
                      Simulate 3 Days Left
                    </button>
                    <button
                      type="button"
                      onClick={handleResetTrial}
                      className="px-2.5 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded text-xs font-bold border border-neutral-600 transition cursor-pointer"
                    >
                      Reset (Day 1)
                    </button>
                    <button
                      type="button"
                      onClick={handleResetToUnactivated}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded text-xs font-bold border border-neutral-650 transition cursor-pointer"
                    >
                      Reset Unactivated
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800 text-[11px] font-mono">
                  <div>
                    <span className="text-neutral-500 block text-[10px]">TRIAL STARTED</span>
                    <span className="text-neutral-200">
                      {trialInfo.startTime ? new Date(trialInfo.startTime).toLocaleDateString() : 'Not activated'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">TRIAL EXPIRES</span>
                    <span className="text-neutral-200">
                      {trialInfo.endTime ? new Date(trialInfo.endTime).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">DAYS REMAINING</span>
                    <span className={trialInfo.isActive ? 'text-emerald-400 font-bold' : trialInfo.isExpired ? 'text-red-400 font-bold' : 'text-neutral-400'}>
                      {trialInfo.isActivated ? `${trialInfo.daysRemaining} days` : '15 days (unclaimed)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[10px]">SIMULATION STATUS</span>
                    <span className={trialInfo.simExpired ? 'text-red-400 font-bold' : 'text-neutral-400'}>
                      {trialInfo.simExpired ? 'Forced Expired' : 'Normal Clock'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Developer Test Utilities */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800">
                <span className="text-[11px] text-neutral-400 font-medium">Quick Test Actions:</span>
                <button
                  type="button"
                  onClick={onOpenPaywall}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-[11px] border border-neutral-700 cursor-pointer"
                >
                  Launch Paywall Modal
                </button>
                <button
                  type="button"
                  onClick={onResetTestSubscription}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-[11px] border border-neutral-700 cursor-pointer"
                  title="Clears mock active subscription flag"
                >
                  Reset Simulated Subscription
                </button>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Text Verification Modal for Wipe All Data */}
      {isWipeModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-[#212529] text-white w-full max-w-md rounded-xl shadow-2xl border border-red-800/80 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-red-950 via-neutral-900 to-red-950 border-b border-red-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-700 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-red-200">
                    Authorize Data Wipe
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Text Verification Required
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isWiping) {
                    setIsWipeModalOpen(false);
                    setWipeConfirmationText('');
                    setWipePasswordError(null);
                  }
                }}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleConfirmWipe} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-red-200 leading-relaxed text-[11px]">
                <b>Warning: Irreversible Action</b>. This operation will purge all logged transactions, assets, liabilities, and recurring expenses, zeroing out beginning balances and cash equivalents across your local browser storage and Cloud Firestore.
              </div>

              {wipePasswordError && (
                <div className="p-2.5 bg-red-900/80 border border-red-600 text-red-100 rounded text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
                  <span>{wipePasswordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-neutral-300 block">
                  To confirm permanent deletion, please type <span className="text-red-400 font-mono font-bold bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700">wipe all data</span> below:
                </label>

                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    value={wipeConfirmationText}
                    onChange={(e) => setWipeConfirmationText(e.target.value)}
                    placeholder='Type "wipe all data"'
                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-red-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-neutral-400">
                  Type the exact phrase <code className="text-red-300">wipe all data</code> to activate the deletion button.
                </p>
              </div>

              <div className="pt-2 border-t border-neutral-700/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isWiping}
                  onClick={() => {
                    setIsWipeModalOpen(false);
                    setWipeConfirmationText('');
                    setWipePasswordError(null);
                  }}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWiping || !isWipeConfirmed}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isWiping ? 'Wiping All Data...' : 'Authorize & Wipe All Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
