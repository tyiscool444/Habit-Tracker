# 🚀 HabitThat — Modern Habit & Goal Tracker

> A sleek, privacy-first habit and goal tracking web application featuring an interactive heatmap grid, live stopwatch timers, subtask checklists, and cloud-ready JSON backup sync.

Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS**.

---

## ✨ Features

- 📊 **Interactive Heatmap Grid**: Visual, Excel-style cell matrix with Day, Week, Month, and Year zoom levels.
- 🎯 **Habits vs One-Off Tasks**:
  - **Recurring Habits**: Daily, weekly, and monthly habits with customizable quotas and units (minutes, grams, liters, steps, etc.).
  - **One-Off Goals & Tasks**: Target-dated goals with expandable subtask checklists and completion tracking.
- ⏱️ **Live Floating Stopwatch**: Time your habits (workouts, study, reading) in real-time and log elapsed duration directly to your daily score.
- 📈 **Insights & Streaks**: View consistency percentages, 30-day visual trends, longest streaks, and lifetime totals.
- 💾 **Cloud Backup & Device Sync**:
  - Export your complete data to a single JSON backup.
  - Import and restore backups across any device (desktop, phone, tablet).
  - 1-Click Starter Preset with curated habits for instant demo.
- 📱 **PWA & Mobile Ready**: Responsive dark-mode interface designed for desktop browsers and mobile homescreens.
- 🔒 **100% Privacy First**: All data is stored in your local browser storage. No accounts, tracking, or external database required.

---

## ⚡ 1-Click Vercel Deployment Guide

Deploying **HabitThat** to Vercel via Git is completely zero-config and takes under 1 minute:

### Step 1: Push Changes to GitHub
Make sure all your latest files are pushed to your GitHub repository:
```bash
git add .
git commit -m "feat: optimize for Vercel deployment with cloud data sync"
git push origin main
```

### Step 2: Import Project on Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Under **"Import Git Repository"**, choose your repository (`Habit-Tracker`).
4. Vercel will automatically detect **Next.js** framework settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build` (or `npm run build`)
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
5. Click **"Deploy"**.

Your app will be built and deployed to a global edge network with an instant `*.vercel.app` URL and automatic CI/CD on every `git push`!

---

## 💻 Local Development

To run the project locally:

```bash
# 1. Clone repository
git clone https://github.com/tyiscool444/Habit-Tracker.git
cd Habit-Tracker

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# 4. Open http://localhost:3000 in your browser
```

### Useful Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the production bundle with TypeScript and ESLint verification.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint across the codebase.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (Turbopack / App Router)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Date Handling**: [date-fns](https://date-fns.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Hosting**: [Vercel](https://vercel.com/)
