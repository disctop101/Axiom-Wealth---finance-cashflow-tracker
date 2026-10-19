import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Lock,
  X,
  CreditCard,
  RotateCcw,
  Star,
  Award,
} from 'lucide-react';
import { SubscriptionPlanType } from '../services/subscription';

interface PaywallModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSubscribe: (plan: SubscriptionPlanType) => Promise<void> | void;
  onRestore: () => Promise<void> | void;
  isAdminPreview?: boolean;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onSubscribe,
  onRestore,
  isAdminPreview = false,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectAndSubscribe = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Connecting to Google Play / App Store...');
      await new Promise((r) => setTimeout(r, 600));
      await onSubscribe(selectedPlan);
      setStatusMessage('Subscription activated! Unlocking full dashboard...');
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMessage(null);
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      setIsProcessing(false);
      setStatusMessage('Purchase cancelled or failed. Please retry.');
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setIsProcessing(true);
      setStatusMessage('Restoring previous purchases with store account...');
      await new Promise((r) => setTimeout(r, 700));
      await onRestore();
      setStatusMessage('Restored successfully! Access verified.');
      setTimeout(() => {
        setIsProcessing(false);
        setStatusMessage(null);
        if (onClose) onClose();
      }, 700);
    } catch {
      setIsProcessing(false);
      setStatusMessage('No active subscription found to restore.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#1e2324] text-white border border-neutral-700 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 p-5 text-center border-b border-neutral-700/80 shrink-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 mb-2 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <h2 id="paywall-title" className="text-xl font-black uppercase tracking-wider text-white">
            Axiom Wealth Pro
          </h2>
          <p className="text-xs text-emerald-300 font-mono mt-0.5">
            Professional Personal Ledger &amp; Wealth Analytics
          </p>

          {isAdminPreview && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full text-[10px] text-amber-300 font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Admin Preview Mode Active (Testing User Paywall Journey)</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Feature Value Props */}
          <div className="space-y-2 bg-neutral-900/60 p-3.5 rounded-lg border border-neutral-800 text-xs">
            <div className="flex items-center gap-2 text-neutral-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Unlimited Ledger Logging:</strong> Income, expenses, debt payments &amp; assets.
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Rolling Liquidity &amp; Balance Reconciliation:</strong> Real-time cash tracking.
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Vector PDF &amp; Google Sheets Export:</strong> Crisp vector financial statements.
              </span>
            </div>
            <div className="flex items-center gap-2 text-neutral-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Cloud Firestore Sync:</strong> Encrypted backup across all mobile and web devices.
              </span>
            </div>
          </div>

          {/* Pricing Plans Selection */}
          <div className="space-y-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1">
              Select Your Access Plan
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Monthly Plan */}
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`relative flex flex-col p-3 rounded-lg border text-left transition cursor-pointer ${
                  selectedPlan === 'monthly'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md'
                    : 'border-neutral-700 bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <span className="text-xs font-bold text-neutral-200">Monthly</span>
                <span className="text-lg font-black font-mono text-white mt-1">$4.99</span>
                <span className="text-[10px] text-neutral-400">per month</span>
              </button>

              {/* Annual Plan (Best Value) */}
              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`relative flex flex-col p-3 rounded-lg border text-left transition cursor-pointer ${
                  selectedPlan === 'annual'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md ring-1 ring-emerald-500'
                    : 'border-neutral-700 bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <div className="absolute -top-2 right-2 bg-emerald-500 text-neutral-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">
                  Save 33%
                </div>
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-emerald-400" />
                  Annual (Popular)
                </span>
                <span className="text-lg font-black font-mono text-white mt-1">$39.99</span>
                <span className="text-[10px] text-emerald-400 font-mono">$3.33 / month</span>
              </button>

              {/* Lifetime Plan */}
              <button
                type="button"
                onClick={() => setSelectedPlan('lifetime')}
                className={`relative flex flex-col p-3 rounded-lg border text-left transition cursor-pointer ${
                  selectedPlan === 'lifetime'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md'
                    : 'border-neutral-700 bg-neutral-850 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <span className="text-xs font-bold text-neutral-200">Lifetime</span>
                <span className="text-lg font-black font-mono text-white mt-1">$89.99</span>
                <span className="text-[10px] text-neutral-400">One-time payment</span>
              </button>
            </div>
          </div>

          {/* Feedback / Progress status */}
          {statusMessage && (
            <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded text-xs text-center font-medium text-emerald-300 animate-in fade-in">
              {statusMessage}
            </div>
          )}

          {/* Action Button: Subscribe */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={handleSelectAndSubscribe}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm tracking-wide shadow-lg transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Processing Order...'
                  : selectedPlan === 'lifetime'
                  ? 'Unlock Lifetime Access ($89.99)'
                  : `Start Pro Plan (${selectedPlan === 'annual' ? '$39.99/year' : '$4.99/month'})`}
              </span>
            </button>

            {/* Restore Purchases & Legal Links */}
            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
              <button
                type="button"
                onClick={handleRestorePurchases}
                disabled={isProcessing}
                className="hover:text-emerald-400 transition cursor-pointer underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restore Purchases</span>
              </button>

              <span className="flex items-center gap-1 text-neutral-500 text-[10px]">
                <ShieldCheck className="w-3 h-3" />
                Secured via Google Play &amp; RevenueCat
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
