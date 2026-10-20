import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  ShieldCheck,
  Zap,
  Lock,
  X,
  CreditCard,
  Star,
  Award,
  ArrowRight,
  Clock,
  CheckCircle2,
  Smartphone,
  Layers,
  Database,
  BarChart3,
  FileDown,
} from 'lucide-react';
import {
  SubscriptionPlanType,
  activateFreeTrial,
  isTrialActivated,
  getTrialStatus,
} from '../services/subscription';

export type GrowthCheckpointTrigger =
  | 'analytics'
  | 'purchase_checker'
  | 'stock_calculator'
  | 'cloud_sync'
  | 'recurring_automation'
  | 'export'
  | 'general';

export interface GrowthCheckpointModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSubscribe: (plan: SubscriptionPlanType) => Promise<void> | void;
  isAdminPreview?: boolean;
  triggerFeature?: GrowthCheckpointTrigger;
}

export const GrowthCheckpointModal: React.FC<GrowthCheckpointModalProps> = ({
  isOpen,
  onClose,
  onSubscribe,
  isAdminPreview = false,
  triggerFeature = 'general',
}) => {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanType>('annual');
  const [paymentMethodTab, setPaymentMethodTab] = useState<'card' | 'wallet'>('wallet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingGateway, setProcessingGateway] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Test card form inputs
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardZip, setCardZip] = useState('90210');

  const trial = getTrialStatus();
  const canStartTrial = !trial.isActivated && !trial.isExpired;

  if (!isOpen) return null;

  const planPricing: Record<SubscriptionPlanType, { price: string; period: string; billing: string }> = {
    monthly: { price: '$4.99', period: '/month', billing: 'Billed monthly' },
    annual: { price: '$39.99', period: '/year', billing: '$3.33/month · Billed annually' },
    lifetime: { price: '$89.99', period: 'one-time', billing: 'Lifetime access' },
  };

  const handleTestPayment = async (method: 'stripe_card' | 'apple_pay' | 'google_pay') => {
    try {
      setIsProcessing(true);
      const gatewayName =
        method === 'apple_pay'
          ? 'Apple Pay (Stripe Test)'
          : method === 'google_pay'
          ? 'Google Pay (Stripe Test)'
          : 'Stripe Web Gateway';

      setProcessingGateway(gatewayName);
      setStatusMessage(`Authenticating with ${gatewayName}...`);
      await new Promise((r) => setTimeout(r, 650));

      setStatusMessage('Processing tokenized test transaction (Test Mode)...');
      await new Promise((r) => setTimeout(r, 650));

      await onSubscribe(selectedPlan);
      setStatusMessage('Payment verified! Upgrading to Axiom Wealth Apex...');

      setTimeout(() => {
        setIsProcessing(false);
        setProcessingGateway(null);
        setStatusMessage(null);
        if (onClose) onClose();
      }, 750);
    } catch {
      setIsProcessing(false);
      setProcessingGateway(null);
      setStatusMessage('Payment simulation failed. Please try again.');
    }
  };

  const handleStartTrial = () => {
    activateFreeTrial();
    setStatusMessage('15-Day Free Trial activated! Unlocking Apex features...');
    setTimeout(() => {
      setStatusMessage(null);
      if (onClose) onClose();
    }, 700);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="growth-checkpoint-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-[#191d1f] text-white border border-neutral-700/80 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Header Banner */}
        <div className="relative bg-gradient-to-r from-emerald-950 via-neutral-900 to-emerald-950 p-5 sm:p-6 text-center border-b border-neutral-800 shrink-0">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800/80 transition cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 mb-2.5 shadow-inner">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>

          <div className="text-[10px] font-mono font-bold tracking-widest uppercase text-emerald-400 mb-1">
            Growth Checkpoint &bull; Tier Selection
          </div>

          <h2 id="growth-checkpoint-title" className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            Axiom Wealth Apex
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-2 max-w-md mx-auto leading-relaxed">
            &ldquo;Are you ready to master your cashflow? Choose your path to financial literacy.&rdquo;
          </p>

          {isAdminPreview && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 border border-amber-500/50 rounded-full text-[11px] text-amber-300 font-semibold">
              <Award className="w-3.5 h-3.5" />
              <span>Admin Customer Preview (Testing Apex Growth Checkpoint)</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto text-xs">
          {/* Essential vs Apex Comparison Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Essential Card */}
            <div className="bg-neutral-900/80 p-3.5 rounded-xl border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-neutral-300 uppercase tracking-wider text-[11px]">
                  Essential Tier
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                  FREE
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-neutral-400">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Manual income &amp; expense logging</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Standard personal balance sheet</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Local device storage only</span>
                </li>
              </ul>
            </div>

            {/* Apex Card */}
            <div className="bg-gradient-to-b from-emerald-950/40 to-neutral-900/90 p-3.5 rounded-xl border border-emerald-500/50 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400" />
                  Apex Tier
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  PREMIUM
                </span>
              </div>
              <ul className="space-y-1.5 text-[11px] text-emerald-200/90">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Encrypted Cloud Firestore synchronisation</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Advanced Financial Analytics &amp; Drilldown</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Real-time recurring ledger automations</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Vector PDF &amp; Spreadsheet Export tools</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Purchase Checker &amp; Stock/Dividend Simulator</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Optional 15-Day Free Trial Promotion Banner (If not yet activated) */}
          {canStartTrial && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-950 via-neutral-900 to-sky-950 border border-emerald-500/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>Optional 15-Day Free Trial Available</span>
                </div>
                <p className="text-[11px] text-neutral-300">
                  Try all Apex premium features risk-free for 15 days. No card required.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartTrial}
                disabled={isProcessing}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg font-bold text-xs shadow-md transition cursor-pointer self-start sm:self-auto shrink-0"
              >
                Activate 15-Day Trial
              </button>
            </div>
          )}

          {/* Pricing Plan Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-1">
              <span>Choose Your Apex Access Plan</span>
              <span className="text-[10px] text-emerald-400 lowercase font-mono">cancel anytime</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Monthly Plan */}
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={`relative flex flex-col p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedPlan === 'monthly'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-850 text-neutral-300'
                }`}
              >
                <span className="text-xs font-bold text-neutral-200">Monthly</span>
                <span className="text-lg font-black font-mono text-white mt-1">$4.99</span>
                <span className="text-[10px] text-neutral-400">per month</span>
              </button>

              {/* Annual Plan (Most Popular) */}
              <button
                type="button"
                onClick={() => setSelectedPlan('annual')}
                className={`relative flex flex-col p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedPlan === 'annual'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-850 text-neutral-300'
                }`}
              >
                <div className="absolute -top-2 right-2 bg-emerald-500 text-neutral-950 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-sm">
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
                className={`relative flex flex-col p-3 rounded-xl border text-left transition cursor-pointer ${
                  selectedPlan === 'lifetime'
                    ? 'border-emerald-500 bg-emerald-950/40 text-white shadow-md ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-900/60 hover:bg-neutral-850 text-neutral-300'
                }`}
              >
                <span className="text-xs font-bold text-neutral-200">Lifetime</span>
                <span className="text-lg font-black font-mono text-white mt-1">$89.99</span>
                <span className="text-[10px] text-neutral-400">One-time payment</span>
              </button>
            </div>
          </div>

          {/* Web Payment Gateway (Stripe Test Mode) Checkout Section */}
          <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs text-white">Web Payment Gateway Checkout</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 text-[10px] font-mono font-bold">
                ⚡ Stripe Test Mode
              </span>
            </div>

            {/* Mobile Wallet Buttons (Apple Pay & Google Pay) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Apple Pay Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleTestPayment('apple_pay')}
                className="w-full py-2.5 px-3 bg-black hover:bg-neutral-950 text-white rounded-lg font-semibold text-xs border border-neutral-700 flex items-center justify-center gap-2 transition cursor-pointer hover:border-neutral-500 active:scale-[0.99] disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.6-7.85-11.75-14.44-5.33-8.49-9.58-18.06-12.74-28.71-3.16-10.66-4.74-21.05-4.74-31.18 0-14.57 3.58-26.68 10.74-36.32 7.16-9.64 16.29-14.54 27.38-14.7 4.7 0 9.87 1.25 15.52 3.75 5.65 2.5 9.53 3.8 11.64 3.9 1.9.11 5.86-1.25 11.89-4.08 6.03-2.83 11.45-4.07 16.26-3.73 12.06.86 21.64 5.37 28.74 13.53-10.53 6.36-15.68 15.17-15.45 26.43.23 8.79 3.65 16.14 10.26 22.05 6.61 5.91 14.39 9.35 23.34 10.32-2.12 6.53-4.7 13.06-7.74 19.59zM119.22 31.84c0-7.39 2.66-14.37 7.98-20.94 5.32-6.57 11.87-10.52 19.65-11.86.33 1.1.5 2.1.5 3 0 7.28-2.73 14.34-8.19 21.18-5.46 6.84-12.18 10.8-20.16 11.88.22-1.1.22-2.19.22-3.26z" />
                </svg>
                <span>Pay with Apple Pay</span>
              </button>

              {/* Google Pay Button */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleTestPayment('google_pay')}
                className="w-full py-2.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-white rounded-lg font-semibold text-xs border border-neutral-700 flex items-center justify-center gap-2 transition cursor-pointer hover:border-neutral-500 active:scale-[0.99] disabled:opacity-50"
              >
                <span className="font-bold tracking-tight">
                  <span className="text-[#4285F4]">G</span>
                  <span className="text-[#EA4335]">o</span>
                  <span className="text-[#FBBC05]">o</span>
                  <span className="text-[#4285F4]">g</span>
                  <span className="text-[#34A853]">l</span>
                  <span className="text-[#EA4335]">e</span>
                </span>
                <span>Pay</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1 border-t border-neutral-800"></div>
              <span className="text-[10px] uppercase font-bold text-neutral-500">or pay with test card</span>
              <div className="flex-1 border-t border-neutral-800"></div>
            </div>

            {/* Test Card Fields */}
            <div className="space-y-2">
              <div>
                <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                  Card Number (Pre-filled Test Number)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    placeholder="4242 4242 4242 4242"
                  />
                  <CreditCard className="w-4 h-4 text-neutral-500 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                    Expires
                  </label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                    CVC
                  </label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase font-semibold block mb-1">
                    ZIP
                  </label>
                  <input
                    type="text"
                    value={cardZip}
                    onChange={(e) => setCardZip(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    placeholder="90210"
                  />
                </div>
              </div>
            </div>

            {/* Feedback / Progress status */}
            {statusMessage && (
              <div className="bg-emerald-950/70 border border-emerald-600/80 p-2.5 rounded-lg text-xs text-center font-medium text-emerald-200 animate-in fade-in flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Action Button: Subscribe with Card */}
            <button
              type="button"
              onClick={() => handleTestPayment('stripe_card')}
              disabled={isProcessing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-sm tracking-wide shadow-lg transition cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Processing Test Order...'
                  : `Upgrade to Apex (${planPricing[selectedPlan].price} · Test Mode)`}
              </span>
            </button>

            <div className="text-center text-[10px] text-neutral-400 pt-1">
              Test mode transactions only &bull; No real charge will ever be made
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
