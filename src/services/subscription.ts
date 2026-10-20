import { User } from 'firebase/auth';

export type SubscriptionPlanType = 'monthly' | 'annual' | 'lifetime';
export type AppTier = 'essential' | 'apex';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  plan: SubscriptionPlanType | null;
  expiresAt?: string;
  source: 'stripe_test' | 'admin_bypass' | 'preview_mock' | 'trial' | 'free';
}

export interface TrialStatus {
  isActivated: boolean;
  isActive: boolean;
  isExpired: boolean;
  daysRemaining: number;
  startTime: number;
  endTime: number;
  simExpired: boolean;
}

export interface UserAccessInfo {
  tier: AppTier;
  hasApexAccess: boolean;
  hasFullAccess: boolean; // Alias for backward compatibility
  isAdmin: boolean;
  isAdminBypassActive: boolean;
  isSubscribed: boolean;
  plan: SubscriptionPlanType | null;
  statusLabel: string;
  isTrialActivated: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
}

export const TRIAL_DURATION_DAYS = 15;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

const STORAGE_KEYS = {
  OWNER_EMAIL: 'axiom_wealth_owner_email',
  PREVIEW_AS_CUSTOMER: 'axiom_wealth_preview_as_customer',
  DEVELOPER_PRO_OVERRIDE: 'axiom_wealth_dev_pro_override',
  IS_SUBSCRIBED: 'axiom_wealth_is_subscribed',
  SUBSCRIPTION_PLAN: 'axiom_wealth_sub_plan',
  TRIAL_ACTIVATED: 'axiom_wealth_trial_activated',
  TRIAL_START_TIME: 'axiom_wealth_trial_start_time',
  SIMULATE_TRIAL_EXPIRED: 'axiom_wealth_sim_trial_expired',
};

// Developer & owner emails that always receive Pro/Apex access bypass
export const DEVELOPER_PREMIUM_EMAILS = [
  'emmanuelfajutagana@gmail.com',
  'fajutaganaemmanuel@gmail.com',
];

// Owner/admin email can also be supplied via environment config (VITE_OWNER_EMAIL)
export const DEFAULT_OWNER_EMAIL: string = ((import.meta as any).env?.VITE_OWNER_EMAIL as string | undefined) || 'emmanuelfajutagana@gmail.com';
export const PRIMARY_OWNER_EMAILS: string[] = [
  ...DEVELOPER_PREMIUM_EMAILS,
  ...(DEFAULT_OWNER_EMAIL ? [DEFAULT_OWNER_EMAIL.toLowerCase()] : []),
];

/**
 * Returns the configured owner email address (case-insensitive).
 */
export function getOwnerEmail(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.OWNER_EMAIL);
    if (saved && saved.trim()) return saved.trim().toLowerCase();
  } catch {}
  return DEFAULT_OWNER_EMAIL.toLowerCase();
}

/**
 * Saves a custom owner email.
 */
export function setOwnerEmail(email: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.OWNER_EMAIL, email.trim().toLowerCase());
  } catch {}
}

/**
 * Checks whether a given user object or email belongs to the app owner / admin.
 */
export function isOwnerUser(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  const userEmail = user.email.trim().toLowerCase();
  const ownerEmail = getOwnerEmail();
  return (
    (!!ownerEmail && userEmail === ownerEmail) ||
    PRIMARY_OWNER_EMAILS.includes(userEmail) ||
    DEVELOPER_PREMIUM_EMAILS.includes(userEmail)
  );
}

/**
 * Checks if the developer pro / apex override toggle is enabled.
 * Defaults to true for emmanuelfajutagana@gmail.com and developer emails if not explicitly set to 'false'.
 */
export function getDeveloperProOverride(userEmail?: string | null): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DEVELOPER_PRO_OVERRIDE);
    if (saved !== null) {
      return saved === 'true';
    }
  } catch {}
  if (userEmail) {
    const normalized = userEmail.trim().toLowerCase();
    if (DEVELOPER_PREMIUM_EMAILS.includes(normalized)) return true;
  }
  return false;
}

/**
 * Updates the 'Developer Pro / Apex Mode' toggle state.
 */
export function setDeveloperProOverride(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.DEVELOPER_PRO_OVERRIDE, String(enabled));
    window.dispatchEvent(new Event('axiom_trial_change'));
  } catch {}
}

/**
 * Checks if the admin has enabled the 'Preview as Customer' mode.
 */
export function getPreviewAsCustomer(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.PREVIEW_AS_CUSTOMER) === 'true';
  } catch {
    return false;
  }
}

/**
 * Updates the 'Preview as Customer' toggle state.
 */
export function setPreviewAsCustomer(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEYS.PREVIEW_AS_CUSTOMER, String(enabled));
  } catch {}
}

/**
 * Loads mock / local subscription state.
 */
export function getLocalSubscriptionStatus(): { isSubscribed: boolean; plan: SubscriptionPlanType | null } {
  try {
    const sub = localStorage.getItem(STORAGE_KEYS.IS_SUBSCRIBED) === 'true';
    const plan = (localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_PLAN) as SubscriptionPlanType) || null;
    return { isSubscribed: sub, plan };
  } catch {
    return { isSubscribed: false, plan: null };
  }
}

/**
 * Sets mock / local subscription state.
 */
export function setLocalSubscriptionStatus(isSubscribed: boolean, plan: SubscriptionPlanType | null) {
  try {
    localStorage.setItem(STORAGE_KEYS.IS_SUBSCRIBED, String(isSubscribed));
    if (plan) {
      localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_PLAN, plan);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_PLAN);
    }
    window.dispatchEvent(new Event('axiom_trial_change'));
  } catch {}
}

/**
 * Checks if the user has explicitly activated the 15-day free trial.
 * Does NOT start automatically!
 */
export function isTrialActivated(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.TRIAL_ACTIVATED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Returns the timestamp when the trial was activated.
 */
export function getTrialStartTime(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIAL_START_TIME);
    if (raw) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {}
  return 0;
}

/**
 * Explicitly activates the 15-Day Free Trial of Apex from this exact moment.
 */
export function activateFreeTrial(): TrialStatus {
  try {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEYS.TRIAL_ACTIVATED, 'true');
    localStorage.setItem(STORAGE_KEYS.TRIAL_START_TIME, String(now));
    localStorage.removeItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED);
    window.dispatchEvent(new Event('axiom_trial_change'));
  } catch {}
  return getTrialStatus();
}

/**
 * Resets trial to unactivated state (Essential Free Tier).
 */
export function resetTrialToUnactivated(): TrialStatus {
  try {
    localStorage.removeItem(STORAGE_KEYS.TRIAL_ACTIVATED);
    localStorage.removeItem(STORAGE_KEYS.TRIAL_START_TIME);
    localStorage.removeItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED);
    window.dispatchEvent(new Event('axiom_trial_change'));
  } catch {}
  return getTrialStatus();
}

/**
 * Checks whether the 'Simulate Trial Expired' developer switch is active.
 */
export function getSimulateTrialExpired(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED) === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggles the 'Simulate Trial Expired' state for developer testing.
 */
export function setSimulateTrialExpired(expired: boolean) {
  try {
    if (expired) {
      // Ensure trial is marked activated so simulation behaves realistically as an expired trial
      localStorage.setItem(STORAGE_KEYS.TRIAL_ACTIVATED, 'true');
      localStorage.setItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED, 'true');
      // Also clear active mock subscription so it doesn't mask expired trial state
      localStorage.removeItem(STORAGE_KEYS.IS_SUBSCRIBED);
      localStorage.removeItem(STORAGE_KEYS.SUBSCRIPTION_PLAN);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED);
    }
    window.dispatchEvent(new Event('axiom_trial_change'));
  } catch {}
}

/**
 * Resets the 15-day trial to Day 1 (15 days remaining).
 */
export function resetTrialStartTime(): TrialStatus {
  return activateFreeTrial();
}

/**
 * Simulates a custom number of days remaining on the trial.
 */
export function simulateTrialDaysRemaining(daysRemaining: number): TrialStatus {
  try {
    const clamped = Math.max(0, Math.min(15, daysRemaining));
    const simulatedStartTime = Date.now() - (TRIAL_DURATION_DAYS - clamped) * 24 * 60 * 60 * 1000;
    localStorage.setItem(STORAGE_KEYS.TRIAL_ACTIVATED, 'true');
    localStorage.setItem(STORAGE_KEYS.TRIAL_START_TIME, String(simulatedStartTime));
    if (clamped === 0) {
      localStorage.setItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEYS.SIMULATE_TRIAL_EXPIRED);
    }
    window.dispatchEvent(new Event('axiom_trial_change'));
  } catch {}
  return getTrialStatus();
}

/**
 * Evaluates the current 15-day trial status.
 * Returns isActivated: false if the user hasn't explicitly activated the trial yet.
 */
export function getTrialStatus(): TrialStatus {
  const activated = isTrialActivated();
  const startTime = getTrialStartTime();
  const simExpired = getSimulateTrialExpired();

  if (!activated || !startTime) {
    return {
      isActivated: false,
      isActive: false,
      isExpired: false,
      daysRemaining: TRIAL_DURATION_DAYS,
      startTime: 0,
      endTime: 0,
      simExpired: false,
    };
  }

  const elapsedMs = Math.max(0, Date.now() - startTime);
  const remainingMs = Math.max(0, TRIAL_DURATION_MS - elapsedMs);
  const daysRemaining = simExpired ? 0 : Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
  const isExpired = simExpired || remainingMs <= 0;
  const isActive = !isExpired && daysRemaining > 0;

  return {
    isActivated: true,
    isActive,
    isExpired,
    daysRemaining,
    startTime,
    endTime: startTime + TRIAL_DURATION_MS,
    simExpired,
  };
}

/**
 * Core Access Control Resolver:
 * Evaluates the current user against Essential vs. Apex tiers, admin bypass,
 * preview mode, paid subscription records, and optional 15-day free trial.
 */
export function computeUserAccess(
  user: User | null | undefined,
  previewAsCustomer: boolean
): UserAccessInfo {
  const userEmail = user?.email?.trim().toLowerCase() || '';
  const isDeveloperUser = DEVELOPER_PREMIUM_EMAILS.includes(userEmail);
  const isAdmin = isDeveloperUser || isOwnerUser(user);
  const isDevProActive = getDeveloperProOverride(userEmail);
  const localSub = getLocalSubscriptionStatus();
  const trial = getTrialStatus();

  // Explicit Developer Override:
  // When Developer Pro / Apex Mode is active, automatically grant full Apex/Pro access unconditionally,
  // bypassing all paywalls, trial countdowns, upgrade prompts, and restricted tool flags.
  if ((isDevProActive || (isDeveloperUser && !previewAsCustomer)) && !previewAsCustomer) {
    return {
      tier: 'apex',
      hasApexAccess: true,
      hasFullAccess: true,
      isAdmin: true,
      isAdminBypassActive: true,
      isSubscribed: true,
      plan: 'lifetime',
      statusLabel: 'Developer Pro / Apex Mode (Unconditional Full Access)',
      isTrialActivated: true,
      isTrialActive: false, // Not in trial mode, fully unlocked
      isTrialExpired: false,
      trialDaysRemaining: 15,
    };
  }

  // 1. Simulation Override: When "Simulate Trial Expired" is triggered in Developer Settings,
  // it immediately forces the Essential tier across all permissions, overriding any admin bypass
  // so admins and developers can test feature locking and paywall restrictions in real time.
  if (trial.simExpired) {
    return {
      tier: 'essential',
      hasApexAccess: false,
      hasFullAccess: false,
      isAdmin,
      isAdminBypassActive: false,
      isSubscribed: false,
      plan: null,
      statusLabel: 'Essential Tier (Simulated Trial Expired)',
      isTrialActivated: true,
      isTrialActive: false,
      isTrialExpired: true,
      trialDaysRemaining: 0,
    };
  }

  // 2. If user is Admin and NOT previewing as customer:
  // Automatically grant full Apex access
  if (isAdmin && !previewAsCustomer) {
    return {
      tier: 'apex',
      hasApexAccess: true,
      hasFullAccess: true,
      isAdmin: true,
      isAdminBypassActive: true,
      isSubscribed: true,
      plan: 'lifetime',
      statusLabel: 'Owner Admin Bypass (Axiom Wealth Apex Full Access)',
      isTrialActivated: trial.isActivated,
      isTrialActive: false,
      isTrialExpired: false,
      trialDaysRemaining: 15,
    };
  }

  // Active paid subscription overrides trial for customers and previewing admins
  if (localSub.isSubscribed) {
    return {
      tier: 'apex',
      hasApexAccess: true,
      hasFullAccess: true,
      isAdmin,
      isAdminBypassActive: false,
      isSubscribed: true,
      plan: localSub.plan,
      statusLabel: `Axiom Wealth Apex (${localSub.plan || 'Active'})`,
      isTrialActivated: trial.isActivated,
      isTrialActive: false,
      isTrialExpired: false,
      trialDaysRemaining: 0,
    };
  }

  // Active 15-Day Free Trial
  if (trial.isActive) {
    return {
      tier: 'apex',
      hasApexAccess: true,
      hasFullAccess: true,
      isAdmin,
      isAdminBypassActive: false,
      isSubscribed: false,
      plan: null,
      statusLabel: `Axiom Wealth Apex Trial (${trial.daysRemaining}d remaining)`,
      isTrialActivated: true,
      isTrialActive: true,
      isTrialExpired: false,
      trialDaysRemaining: trial.daysRemaining,
    };
  }

  // Expired 15-Day Trial (downgraded back to Essential)
  if (trial.isExpired) {
    return {
      tier: 'essential',
      hasApexAccess: false,
      hasFullAccess: false,
      isAdmin,
      isAdminBypassActive: false,
      isSubscribed: false,
      plan: null,
      statusLabel: 'Essential Tier (15-Day Trial Expired)',
      isTrialActivated: true,
      isTrialActive: false,
      isTrialExpired: true,
      trialDaysRemaining: 0,
    };
  }

  // Default: Essential Free Tier (Trial Not Yet Activated)
  return {
    tier: 'essential',
    hasApexAccess: false,
    hasFullAccess: false,
    isAdmin,
    isAdminBypassActive: false,
    isSubscribed: false,
    plan: null,
    statusLabel: 'Essential Tier (Free)',
    isTrialActivated: false,
    isTrialActive: false,
    isTrialExpired: false,
    trialDaysRemaining: TRIAL_DURATION_DAYS,
  };
}
