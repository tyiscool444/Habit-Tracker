import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#07080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "HabitThat — Modern Habit & Goal Tracker",
  description: "Track your habits, build lasting streaks, and achieve daily & long-term goals with an interactive heatmap grid, live stopwatch, and cloud backup sync.",
  manifest: "/manifest.json",
  icons: {
    icon: "/app-icon.ico",
    shortcut: "/app-icon.ico",
    apple: "/app-icon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HabitThat",
  },
  openGraph: {
    title: "HabitThat — Modern Habit & Goal Tracker",
    description: "Track your habits, build lasting streaks, and achieve daily & long-term goals with an interactive heatmap grid and live stopwatch.",
    type: "website",
    siteName: "HabitThat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07080a] text-slate-100">{children}</body>
    </html>
  );
}
