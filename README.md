# HabitThat - Habit and Goal Tracker

A habit and goal tracking web application featuring an hourly daily planner, an interactive matrix grid, study timer techniques, calendar streaks, and local data sync.

Built with Next.js, React, TypeScript, and Tailwind CSS.

---

## Features

- Sidebar Navigation: Separate pages for Today, Calendar, Timers, and Data & Backup.
- Daily Planner: Hour-by-hour timeline for the day with a live current-time indicator. Click or drag to plan a block, drag blocks to move them, drag their bottom edge to resize, and link blocks to habits or tasks.
- Interactive Matrix Grid: Cell matrix with Day, Week, Month, and Year views to log and visualize progress.
- Recurring Habits: Daily, weekly, and monthly habits with customizable quotas and units (minutes, hours, steps, liters, etc.).
- One-Off Goals and Tasks: Target-dated tasks with subtask checklists and progress tracking.
- Study and Focus Timers: Popular timer techniques including Pomodoro (25/5), 50/10 Rule, 90-Minute Focus Block, Flowtime, 2-Minute Rule, and Custom Timers. Focus time can be logged directly to minute- or hour-based habits.
- Floating Timer: Persistent floating widget (and a sidebar countdown) to monitor active focus sessions while navigating the app.
- Calendar and Streaks: Monthly calendar view with streak tracking and upcoming task schedules.
- Data Backup and Sync: Export and import habits, logs, and daily plans via JSON files. Includes starter templates for testing.
- Cloud Sync (optional): Unlock the site with your password on your PC and phone and your habits, tasks and plans stay in sync. Without it, everything simply stays in the browser.

---

## Getting Started

### Prerequisites

Node.js 18 or higher and npm.

### Installation

1. Clone the repository:
```bash
git clone https://github.com/tyiscool444/Habit-Tracker.git
cd Habit-Tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open `http://localhost:3000` in your browser.

### Available Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Creates an optimized production build.
- `npm run start`: Runs the built production server.
- `npm run lint`: Runs ESLint checks.

---

## Cloud sync (optional)

Keeps the same data on your PC and phone, behind a single password. Sync uses a free [Supabase](https://supabase.com) project; until it's set up, the app keeps data only in the browser and has no password.

1. **Create a project** at supabase.com (the free plan is plenty).
2. **Create the table:** in the project, open *SQL Editor → New query*, paste the contents of [`supabase/schema.sql`](supabase/schema.sql), and click *Run*.
3. **Create your login:** under *Authentication → Users*, click *Add user → Create new user*, enter any email address and the password you want to use, and tick *Auto Confirm User*.
4. **Block other sign-ups:** under *Authentication → Sign In / Providers*, turn off *Allow new users to sign up*.
5. **Add the settings** (the URL and *anon public* key are under *Project Settings → API*):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_SUPABASE_LOGIN_EMAIL=the email from step 3
   ```
   - Locally: copy `.env.example` to `.env.local`, fill it in, and restart `npm run dev`.
   - On Vercel: add the same three under *Settings → Environment Variables*, then redeploy.
6. **Open the site** on each device and enter your password. Each device stays unlocked until you press *Lock* on the Data & Backup page.

How it behaves:
- Changes upload a second or two after you make them, and other open devices update straight away.
- A device always downloads the latest data before uploading, so an out-of-date phone can't overwrite newer work.
- The first time a device unlocks, if it already has different data from the cloud, you choose which copy to keep.
- If two devices edit while both are offline, the most recent edit wins once they reconnect.

---

## Deployment

### Deploy to Vercel

1. Push your code to a GitHub repository.
2. Sign in to Vercel and import your repository.
3. Framework settings will be detected automatically:
   - Framework Preset: Next.js
   - Build Command: `next build`
   - Output Directory: `.next`
   - Install Command: `npm install`
4. Click Deploy.

---

## Tech Stack

- Framework: Next.js (App Router)
- UI: React
- Language: TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React
- Date Utilities: date-fns
