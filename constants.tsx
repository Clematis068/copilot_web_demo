
import React from 'react';
import { Role } from './types';

export const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';

export const ROLE_LABELS: Record<Role, string> = {
  TOP: '上路',
  JUNGLE: '打野',
  MID: '中路',
  ADC: '下路',
  SUPPORT: '辅助'
};

export const ROLE_ICONS: Record<Role, React.ReactNode> = {
  TOP: (
    <svg viewBox="0 0 100 100" className="w-6 h-6" fill="currentColor">
      <path d="M50 10L15 45l35 35 35-35-35-35zm0 14.1l20.9 20.9-20.9 20.9-20.9-20.9L50 24.1z" />
    </svg>
  ),
  JUNGLE: (
    <svg viewBox="0 0 100 100" className="w-6 h-6" fill="currentColor">
      <path d="M50 15c-5 0-10 10-10 15 0 15 10 30 10 30s10-15 10-30c0-5-5-15-10-15zM25 40c0 15 15 25 15 25s-5-15-5-25c0-10-10-10-10 0zm50 0c0 10-10 10-10 0 0-10-5-25-5-25s15 10 15 25z" />
    </svg>
  ),
  MID: (
    <svg viewBox="0 0 100 100" className="w-6 h-6" fill="currentColor">
      <path d="M50 20L20 50l30 30 30-30-30-30zm0 12l18 18-18 18-18-18 18-18z" />
      <rect x="42" y="42" width="16" height="16" transform="rotate(45 50 50)" />
    </svg>
  ),
  ADC: (
    <svg viewBox="0 0 100 100" className="w-6 h-6" fill="currentColor">
      <path d="M20 20h30v30H20V20zm30 30h30v30H50V50z" fillOpacity="0.3" />
      <path d="M35 35l30 30M65 35L35 65" stroke="currentColor" strokeWidth="8" />
    </svg>
  ),
  SUPPORT: (
    <svg viewBox="0 0 100 100" className="w-6 h-6" fill="currentColor">
      <circle cx="50" cy="40" r="15" />
      <path d="M50 60c-15 0-25 10-25 20h50c0-10-10-20-25-20z" />
    </svg>
  ),
};

// 官方顺序：上、野、中、下、补
export const ROLE_ORDER: Role[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
