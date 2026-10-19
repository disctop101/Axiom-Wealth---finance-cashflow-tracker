import { User } from 'firebase/auth';

export type SubscriptionPlanType = 'monthly' | 'annual' | 'lifetime';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  plan: SubscriptionPlanType | null;
  expiresAt?: string;
  source: 'revenuecat' | 'admin_bypass' | 'preview_mock' | 'free';
}

const STORAGE_KEYS = {
  OWNER_EMAIL: 'axiom_wealth_owner_email',
  PREVIEW_AS_CUSTOMER: 'axiom_wealth_preview_as_customer',
  IS_SUBSCRIBED: 'axiom_wealth_is_subscribed',
  SUBSCRIPTION_PLAN: 'axiom_wealth_sub_plan',
};

export const PRIMARY_ADMIN_EMAILS = [
  'emmanuelfajutagana@gmail.com',
  'fajutaganaemmanuel@gmail.com',
];

export const DEFAULT_OWNER_EMAIL = 'emmanuelfajutagana@gmail.com';

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
 * Checks whether a given user object or email belongs to the primary app owner / admin.
 * Only authenticated users matching the primary designated admin emails are granted developer access.
 */
export function isOwnerUser(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  const userEmail = user.email.trim().toLowerCase();
  const ownerEmail = getOwnerEmail().toLowerCase();
  return (
    PRIMARY_ADMIN_EMAILS.includes(userEmail) ||
    userEmail === ownerEmail ||
    userEmail.includes('fajutagana') ||
    userEmail.endsWith('@axiomwealth.com')
  );
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
  } catch {}
}

/**
 * Core Access Control Resolver:
 * Evaluates the current user against admin bypass, preview mode, and subscription records.
 */
export function computeUserAccess(
  user: User | null | undefined,
  previewAsCustomer: boolean
): {
  hasFullAccess: boolean;
  isAdmin: boolean;
  isAdminBypassActive: boolean;
  isSubscribed: boolean;
  plan: SubscriptionPlanType | null;
  statusLabel: string;
} {
  const isAdmin = isOwnerUser(user);
  const localSub = getLocalSubscriptionStatus();

  // If user is Admin and NOT previewing as customer:
  // Automatically grant full access without checking RevenueCat!
  if (isAdmin && !previewAsCustomer) {
    return {
      hasFullAccess: true,
      isAdmin: true,
      isAdminBypassActive: true,
      isSubscribed: true,
      plan: 'lifetime',
      statusLabel: 'Owner Admin Bypass (Full Access Active)',
    };
  }

  // If user is Admin but actively previewing as customer:
  // Bypass is suspended; check local / RevenueCat subscription
  if (isAdmin && previewAsCustomer) {
    const hasAccess = localSub.isSubscribed;
    return {
      hasFullAccess: hasAccess,
      isAdmin: true,
      isAdminBypassActive: false,
      isSubscribed: localSub.isSubscribed,
      plan: localSub.plan,
      statusLabel: hasAccess
        ? 'Customer Preview (Subscribed)'
        : 'Customer Preview (Paywall Active - Bypass Suspended)',
    };
  }

  // Standard regular customer:
  const hasAccess = localSub.isSubscribed;
  return {
    hasFullAccess: hasAccess,
    isAdmin: false,
    isAdminBypassActive: false,
    isSubscribed: localSub.isSubscribed,
    plan: localSub.plan,
    statusLabel: hasAccess ? `Active Subscription (${localSub.plan || 'Pro'})` : 'Free Tier (Subscription Required)',
  };
}
