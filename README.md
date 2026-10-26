# HabitThat - Habit and Goal Tracker

A habit and goal tracking web application featuring an interactive matrix grid, study timer techniques, calendar streaks, and local data sync.

Built with Next.js, React, TypeScript, and Tailwind CSS.

---

## Features

- Interactive Matrix Grid: Cell matrix with Day, Week, Month, and Year views to log and visualize progress.
- Recurring Habits: Daily, weekly, and monthly habits with customizable quotas and units (minutes, hours, steps, liters, etc.).
- One-Off Goals and Tasks: Target-dated tasks with subtask checklists and progress tracking.
- Study and Focus Timers: Popular timer techniques including Pomodoro (25/5), 50/10 Rule, 90-Minute Focus Block, Flowtime, 2-Minute Rule, and Custom Timers. Focus time can be logged directly to minute- or hour-based habits.
- Floating Timer: Persistent floating widget to monitor active focus sessions while navigating the app.
- Calendar and Streaks: Monthly calendar view with streak tracking and upcoming task schedules.
- Data Backup and Sync: Export and import complete habit data via JSON files. Includes starter templates for testing.
- Privacy First: Data is stored locally in the browser via localStorage. No external database or account creation required.

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
