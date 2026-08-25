export type ThemeId = 'midnight' | 'cyberpunk' | 'sunset' | 'oled' | 'forest' | 'amethyst';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  dotColor: string;
  bg: string;
  cardBg: string;
  accent: string;
}

export const THEMES: ThemeConfig[] = [
  { id: 'midnight', name: 'Midnight', dotColor: '#3b82f6', bg: '#090a0d', cardBg: '#0e1015', accent: '#3b82f6' },
  { id: 'cyberpunk', name: 'Emerald', dotColor: '#10b981', bg: '#060d09', cardBg: '#09150e', accent: '#10b981' },
  { id: 'sunset', name: 'Sunset Amber', dotColor: '#f59e0b', bg: '#0d0a06', cardBg: '#171109', accent: '#f59e0b' },
  { id: 'amethyst', name: 'Amethyst', dotColor: '#a855f7', bg: '#0a0612', cardBg: '#120b20', accent: '#a855f7' },
  { id: 'forest', name: 'Deep Sage', dotColor: '#14b8a6', bg: '#060b0c', cardBg: '#0a1416', accent: '#14b8a6' },
  { id: 'oled', name: 'OLED Black', dotColor: '#64748b', bg: '#000000', cardBg: '#080808', accent: '#3b82f6' },
];
