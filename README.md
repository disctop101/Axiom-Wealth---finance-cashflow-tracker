<div align="center">

# 💎 Axiom Wealth
### Executive Financial Intelligence, Cashflow Operating System & Portfolio Ledger

[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-Proprietary-emerald.svg)](LICENSE)

An institutional-grade personal wealth and cashflow management operating system built for high-conviction capital allocators, investors, and business operators.

</div>

---

## 🌟 Key Capabilities

### 1. 📊 Financial Statements & Period Visualizer
- **Executive Statements**: Automated Personal Income Statement, Cash Flow Statement, and Balance Sheet with one-click drilldowns to underlying transaction ledgers.
- **Dynamic Period Visualizer**: Compare monthly budget allocations against actual spending across four internal asset/liability classes.
- **Global Category Color Mapping**: User-defined custom color palettes set in Settings immediately synchronize across all donut rings, bar charts, and category pills.
- **High-Resolution Printing**: Publication-grade printable statements stripped of interactive controls, engineered for executive review and PDF archiving.

### 2. 🧾 Freehand Highlighter OCR Receipt Scanner
- **Direct Device Webcam & File Upload**: Real-time camera streaming with `getUserMedia` on desktop and mobile, with fallback to high-resolution image upload.
- **Freehand Highlighter Canvas**: Paint fluid marker strokes directly over receipts to selectively isolate individual line items and prices.
- **Line-Item Selection Checkboxes**: Review detected item names and prices with individual checkboxes `[✓]` to select/deselect specific items before auto-filling your transaction form.
- **Crash-Proof State Management**: Robust parsing pipeline with fallback regex heuristics that seamlessly fills transaction amounts, categories, and breakdown notes.

### 3. 📈 Stock & Dividend Simulator
- **Tab 1: Stock Trade & Custom Fee Schedule**: Simulate BUY and SELL orders with granular broker commissions, SEC transaction fees, exchange clearing charges, and sales taxes to calculate net effective price per share.
- **Tab 2: True Dividend Yield & ROI Payback**: Compute net yields after withholding taxes, projected monthly passive income, and exact years to 100% investment recovery from dividends alone.
- **Tab 3: DRIP Compounding Engine**: Multi-year wealth accumulation model incorporating automated dividend reinvestment (DRIP), price appreciation, and recurring capital contributions.
- **1-Click Pipeline**: Push simulated trades directly into `Logged Transactions` and simultaneously generate a new holding in the `Asset Inventory` ledger.

### 4. 🛡️ Buyer Checker & 10x Wealth Rule
- **Impulse Purchase Stress Test**: Evaluates discretionary expenditures against liquid cash reserves to ensure you retain at least a 10x buffer of productive capital.
- **Affordability Scoring**: Immediate viability verdicts (`Safe`, `Caution`, `High Risk`) with payback timelines and capital depletion stress-testing.

### 5. 💼 Assets & Wealth Ledger
- **Stocks & Equities Tracking**: Track Ticker Symbol, Broker Name, Total Shares, Average Cost per Share, Total Fees & Taxes Paid, Current Market Price, Unrealized Gain/Loss, and Cumulative Dividends Collected.
- **Real Estate & Business Assets**: Monitor appraised valuations, debt balances, equity ratios, and gross yields.

### 6. ⚙️ Settings, Utilities & Developer Panel
- **Tabbed Interface**: Clean 3-subtab architecture eliminating vertical scrolling:
  - **Profile & Security**: Account management, in-app password changes, and personalized ledger owner naming.
  - **App Preferences**: Currency selection, master interactive tooltip toggle, Google Sheets export, and global category color assignments.
  - **Developer Settings**: Dedicated owner panel with RevenueCat Customer Preview mode, admin bypass, 90-day mock data injection, and master password-protected data wipe.
- **Mobile Navigation Drawer**: Nested collapsible accordions for *Tools & Utilities* and *Preferences & System* for compact, ergonomic smartphone browsing.

---

## 🛠️ Tech Stack & Architecture

- **Frontend Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/) with Rolldown compiler runtime
- **Design System**: [Tailwind CSS v4](https://tailwindcss.com/) with Lucide React iconography
- **Data Persistence & Cloud Sync**: [Google Cloud Firestore](https://firebase.google.com/docs/firestore) & LocalStorage offline cache
- **Identity & Authentication**: [Firebase Authentication](https://firebase.google.com/docs/auth) (Google OAuth & Email/Password)
- **Computer Vision / OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/) with custom canvas grayscale and contrast preprocessing
- **Subscriptions & Billing**: [RevenueCat Web SDK](https://www.revenuecat.com/) with verified Owner Admin bypass

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended, tested on Node v20/v24)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/axiom-wealth.git
cd axiom-wealth
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory (refer to `.env.example`):

```bash
cp .env.example .env
```

Ensure your `firebase-applet-config.json` is configured in the root directory with your Firebase project credentials:

```json
{
  "apiKey": "YOUR_FIREBASE_API_KEY",
  "authDomain": "your-app.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-app.appspot.com",
  "messagingSenderId": "YOUR_MESSAGING_SENDER_ID",
  "appId": "YOUR_APP_ID",
  "firestoreDatabaseId": "(default)"
}
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port specified in terminal) in your browser.

---

## 📦 Building for Production

To create an optimized production build:

```bash
npm run build
```

To preview the production bundle locally:

```bash
npm run preview
```

---

## 🔐 Security & Access Control

- **Admin Owner Bypass**: The authenticated owner email configured via `VITE_OWNER_EMAIL` automatically receive an unrestricted bypass for development and testing.
- **Preview as Customer**: Admins can toggle customer preview mode in *Developer Settings* to experience the exact paywall and free-tier limitations presented to standard users.
- **Master Password Protected Data Wipe**: Zeroing out ledger data requires account credential reauthentication or the master authorization passphrase to safeguard against accidental data loss.

---

## 📄 License

This software is proprietary and confidential. All rights reserved.
Unauthorized copying, modification, distribution, or reverse engineering is strictly prohibited.
