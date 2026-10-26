import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  Wallet,
  Scale,
  TrendingUp,
  Repeat,
  Lock,
  FileSpreadsheet,
  ArrowLeft,
} from 'lucide-react';

/**
 * Public-facing pages (no login required): Landing / App Purpose, Privacy Policy, Terms of Service.
 * These exist so that visitors and reviewers (e.g. Google OAuth brand verification) can read what the
 * app is, what data it handles, and how that data is used, before signing in.
 */

const APP_NAME = 'Axiom Wealth';
const LAST_UPDATED = 'October 20, 2026';
const SUPPORT_EMAIL: string =
  ((import.meta as any).env?.VITE_SUPPORT_EMAIL as string | undefined) || '';

const ContactLine: React.FC = () =>
  SUPPORT_EMAIL ? (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-400 underline">
      {SUPPORT_EMAIL}
    </a>
  ) : (
    <span>the support contact listed on this website&rsquo;s Google OAuth consent screen</span>
  );

const PublicFooter: React.FC = () => (
  <footer className="border-t border-neutral-800 mt-12 py-6 text-center text-xs text-neutral-500 space-x-4">
    <a href="/" className="hover:text-emerald-400">Home</a>
    <a href="/privacy" className="hover:text-emerald-400">Privacy Policy</a>
    <a href="/terms" className="hover:text-emerald-400">Terms of Service</a>
    <span>&copy; {new Date().getFullYear()} {APP_NAME}</span>
  </footer>
);

interface PublicShellProps {
  children: React.ReactNode;
  onSignIn?: () => void;
  onSignUp?: () => void;
}

const PublicShell: React.FC<PublicShellProps> = ({ children, onSignIn, onSignUp }) => (
  <div className="min-h-screen bg-[#121416] text-neutral-100 font-sans antialiased flex flex-col">
    <header className="border-b border-neutral-800 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-black uppercase tracking-wider text-sm">
          <img
            src="/logo.png"
            alt="Axiom Wealth Logo"
            className="w-8 h-8 rounded-lg object-contain bg-emerald-950/40 border border-emerald-500/40 p-0.5"
          />
          {APP_NAME}
        </a>
        <nav className="flex items-center gap-3 text-xs text-neutral-400">
          <a href="/privacy" className="hover:text-emerald-400">Privacy</a>
          <a href="/terms" className="hover:text-emerald-400">Terms</a>
          {onSignIn && (
            <button
              type="button"
              onClick={() => {
                console.log('[Navbar] Sign in clicked');
                onSignIn();
              }}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold rounded-lg border border-neutral-700 transition cursor-pointer"
            >
              Sign In
            </button>
          )}
          {onSignUp && (
            <button
              type="button"
              onClick={() => {
                console.log('[Navbar] Create Account clicked');
                onSignUp();
              }}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              Create Account
            </button>
          )}
        </nav>
      </div>
    </header>
    <main className="flex-1 px-4 py-8">
      <div className="max-w-4xl mx-auto">{children}</div>
    </main>
    <PublicFooter />
  </div>
);

/* ------------------------------ LANDING PAGE ------------------------------ */

export const LandingPage: React.FC<{ onSignIn: () => void; onSignUp: () => void }> = ({
  onSignIn,
  onSignUp,
}) => {
  const features = [
    {
      icon: Wallet,
      title: 'Income & expense ledger',
      text: 'Log income and expenses, set category budgets and track recurring bills in one personal ledger.',
    },
    {
      icon: TrendingUp,
      title: 'Cashflow statements',
      text: 'Automatically generated income statement and cash flow statement for any period you choose.',
    },
    {
      icon: Scale,
      title: 'Personal balance sheet',
      text: 'Record assets and liabilities to see your net worth and how it changes over time.',
    },
    {
      icon: Repeat,
      title: 'Planning tools',
      text: 'Purchase affordability checker and a stock & dividend simulator to plan before you spend or invest.',
    },
    {
      icon: FileSpreadsheet,
      title: 'Export your data',
      text: 'Export statements to PDF or to a new Google Sheet in your own Google account when you choose to.',
    },
    {
      icon: Lock,
      title: 'You stay in control',
      text: 'Data is stored on your device by default. You can wipe all of your data at any time from Settings.',
    },
  ];

  return (
    <PublicShell onSignIn={onSignIn} onSignUp={onSignUp}>
      <section className="text-center py-8 sm:py-12 space-y-4">
        <span className="inline-block text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400">
          Personal Financial Ledger &amp; Cashflow Tracker
        </span>
        <h1 className="text-3xl sm:text-4xl font-black leading-tight text-white">
          {APP_NAME}: your personal ledger for income, expenses, assets and liabilities
        </h1>
        <p className="text-sm sm:text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          {APP_NAME} is a personal finance web app for individuals who want to understand where their
          money goes. It helps you record your income and expenses, track what you own and owe, and
          view clear cashflow statements and a balance sheet so you can build better financial
          habits and learn how your cashflow really works.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              console.log('[LandingPage] Create free account button clicked');
              onSignUp();
            }}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm rounded-xl shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Create free account
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('[LandingPage] Sign in button clicked');
              onSignIn();
            }}
            className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm rounded-xl border border-neutral-700 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in
          </button>
        </div>
        <p className="text-[11px] text-neutral-500">
          An account is required to access your private ledger. Nothing is shared publicly.
        </p>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Icon className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">{title}</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          How {APP_NAME} uses your Google account
        </div>
        <p className="text-xs text-neutral-300 leading-relaxed">
          You can sign in with Google or with an email and password. If you sign in with Google we
          receive your name, email address and profile picture solely to create and identify your
          account. If you choose to export a statement to Google Sheets, we ask for permission to
          create a spreadsheet in your Google account; we only create the file you request and never
          read or modify your other Google files. Read our{' '}
          <a href="/privacy" className="text-emerald-400 underline">Privacy Policy</a> and{' '}
          <a href="/terms" className="text-emerald-400 underline">Terms of Service</a> for full details.
        </p>
      </section>

      {/* Bottom Conversion CTA Card */}
      <section className="mt-8 text-center py-8 bg-gradient-to-b from-neutral-900 to-[#121416] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Ready to master your cashflow?</h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
          Start recording transactions, tracking assets and liabilities, and building real net worth today.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              console.log('[LandingPage Bottom] Create free account clicked');
              onSignUp();
            }}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm rounded-xl shadow-md transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Create free account
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('[LandingPage Bottom] Sign in clicked');
              onSignIn();
            }}
            className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-sm rounded-xl border border-neutral-700 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in
          </button>
        </div>
      </section>
    </PublicShell>
  );
};

/* ------------------------------ PRIVACY POLICY ------------------------------ */

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-base font-bold text-white">{title}</h2>
    <div className="text-sm text-neutral-300 leading-relaxed space-y-2">{children}</div>
  </section>
);

const BackLink: React.FC = () => (
  <a href="/" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline mb-4">
    <ArrowLeft className="w-3.5 h-3.5" /> Back to {APP_NAME}
  </a>
);

export const PrivacyPolicyPage: React.FC = () => (
  <PublicShell>
    <BackLink />
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Privacy Policy</h1>
        <p className="text-xs text-neutral-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="1. About this app">
        <p>
          {APP_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is a personal financial ledger and cashflow
          tracking web application. It lets individuals record income and expenses, track assets and
          liabilities, and view personal cashflow statements and a balance sheet. This policy explains
          what information we collect, how we use it, and the choices you have.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>Account information:</b> your name, email address and profile picture when you sign up
            with email/password or &ldquo;Sign in with Google&rdquo; (provided through Firebase
            Authentication).
          </li>
          <li>
            <b>Financial entries you create:</b> transactions, categories, budgets, recurring bills,
            assets, liabilities, payments, and the display currency you select. We do not connect to
            your bank and we never ask for bank credentials.
          </li>
          <li>
            <b>Receipt images (optional):</b> if you scan a receipt, text recognition runs on your device
            in your browser; the image is not uploaded to our servers.
          </li>
          <li>
            <b>Subscription status:</b> if you upgrade to a paid plan, payment is handled by our payment
            processor (Stripe). We do not store your full card number.
          </li>
          <li>
            <b>Basic technical data:</b> browser type and error logs needed to keep the service working.
          </li>
        </ul>
      </Section>

      <Section title="3. How we use your information">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and secure your account and show you your own ledger and reports.</li>
          <li>To store your ledger on your device and, on the premium tier, to sync it to your private cloud storage.</li>
          <li>To generate statements and exports (PDF or Google Sheets) at your request.</li>
          <li>To process subscriptions and provide customer support.</li>
          <li>To maintain, secure and improve the app.</li>
        </ul>
        <p>We do not sell your personal data and we do not use it for advertising.</p>
      </Section>

      <Section title="4. Google user data &amp; Limited Use">
        <p>
          When you sign in with Google we access only your basic profile (name, email, profile
          picture). If you choose &ldquo;Export to Google Sheets&rdquo;, we request the{' '}
          <code className="text-emerald-300">https://www.googleapis.com/auth/spreadsheets</code> scope
          solely to create a new spreadsheet containing the statement you asked to export, in your own
          Google account. We do not read, modify or delete any other spreadsheets or Google files.
        </p>
        <p>
          {APP_NAME}&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-emerald-400 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Google user data is used only to provide the
          user-facing features described above, is not transferred to others except as needed to
          provide those features or comply with law, is not used for advertising, and is not read by
          humans except with your consent, for security purposes, or where required by law.
        </p>
      </Section>

      <Section title="5. Where your data is stored">
        <p>
          On the free Essential tier your ledger is stored locally in your browser on your device. On
          the premium Apex tier you may enable cloud synchronisation, in which case your ledger is
          stored in Google Firebase (Cloud Firestore) and protected by access rules so only you can
          read or write your own records.
        </p>
      </Section>

      <Section title="6. Sharing">
        <p>
          We share data only with service providers needed to operate the app, including Google
          (Firebase Authentication, Firestore, Google Sheets when you request an export) and Stripe
          (payments), and when required by law. We never sell your information.
        </p>
      </Section>

      <Section title="7. Retention &amp; deletion">
        <p>
          You can delete all of your ledger data at any time from <b>Settings &rarr; Data Management
          &rarr; Wipe All Data</b>, which removes it from your device and from cloud storage. To delete
          your account entirely, contact us at <ContactLine /> and we will remove it. Backups are
          purged within a reasonable period.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use industry-standard protections including encrypted connections (HTTPS), authenticated
          access and per-user database rules. No method of transmission or storage is 100% secure, so
          we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="9. Children">
        <p>The app is not directed to children under 13 and we do not knowingly collect their data.</p>
      </Section>

      <Section title="10. Your rights">
        <p>
          Depending on where you live you may have the right to access, correct, export or delete your
          data. You can do most of this directly in the app, or contact us at <ContactLine />.
        </p>
      </Section>

      <Section title="11. Changes to this policy">
        <p>
          We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above shows
          the latest revision.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about this policy? Contact us at <ContactLine />.
        </p>
      </Section>
    </article>
  </PublicShell>
);

/* ------------------------------ TERMS OF SERVICE ------------------------------ */

export const TermsPage: React.FC = () => (
  <PublicShell>
    <BackLink />
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-white">Terms of Service</h1>
        <p className="text-xs text-neutral-500">Last updated: {LAST_UPDATED}</p>
      </header>

      <Section title="1. Acceptance">
        <p>
          By creating an account or using {APP_NAME} you agree to these terms and to our{' '}
          <a href="/privacy" className="text-emerald-400 underline">Privacy Policy</a>.
        </p>
      </Section>

      <Section title="2. The service">
        <p>
          {APP_NAME} is a personal financial ledger and cashflow tracker. It is a record-keeping and
          educational tool. It does not provide financial, investment, tax or legal advice, and
          calculators (such as the purchase checker and stock &amp; dividend simulator) show
          illustrative estimates only.
        </p>
      </Section>

      <Section title="3. Your account">
        <p>
          You are responsible for the accuracy of the information you enter and for keeping your login
          credentials secure.
        </p>
      </Section>

      <Section title="4. Tiers &amp; payments">
        <p>
          The Essential tier is free. The Apex tier unlocks premium features and may be offered as a
          free trial or paid plan. Paid plans are processed by our payment provider; prices and terms
          are shown before you confirm a purchase.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>
          Do not misuse the service, attempt to access other users&rsquo; data, or interfere with its
          operation.
        </p>
      </Section>

      <Section title="6. Disclaimer &amp; liability">
        <p>
          The service is provided &ldquo;as is&rdquo; without warranties. To the maximum extent
          permitted by law we are not liable for losses arising from use of the service or decisions
          made based on its output.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          Questions about these terms? Contact <ContactLine />.
        </p>
      </Section>
    </article>
  </PublicShell>
);
