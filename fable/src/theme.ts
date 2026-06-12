import { ThemeId } from './engine/fable';

// アプリ全体の墨色
export const INK = {
  bg: '#0a0c16',
  bgSoft: '#111422',
  paper: '#e8e2d4',
  paperDim: 'rgba(232, 226, 212, 0.62)',
  paperFaint: 'rgba(232, 226, 212, 0.34)',
  gold: '#c9a86a',
  goldDim: 'rgba(201, 168, 106, 0.5)',
  hairline: 'rgba(232, 226, 212, 0.14)',
};

export const FONTS = {
  regular: 'ShipporiMincho_400Regular',
  medium: 'ShipporiMincho_500Medium',
  bold: 'ShipporiMincho_700Bold',
};

// 寓話の絵の配色 — 空の三段グラデーション・山・月・精霊の色
export interface ArtPalette {
  sky: [string, string, string];
  mountain: string; // 最奥の山色(手前ほど暗くする)
  moon: string;
  spirit: string;
  star: string;
}

export const PALETTES: Record<ThemeId, ArtPalette> = {
  hikari: {
    sky: ['#070b1d', '#1b2347', '#8a5a36'],
    mountain: '#2a2c4e',
    moon: '#f2e3b7',
    spirit: '#ffd98a',
    star: '#fff3d6',
  },
  toki: {
    sky: ['#100a1e', '#33204a', '#9c5a6b'],
    mountain: '#2e1f43',
    moon: '#e8d5e0',
    spirit: '#d9a7e0',
    star: '#f3e3f5',
  },
  koe: {
    sky: ['#04121b', '#0e3340', '#3e7d6d'],
    mountain: '#123240',
    moon: '#dcefe6',
    spirit: '#8fe3c8',
    star: '#dffff2',
  },
  yume: {
    sky: ['#060818', '#14224d', '#3e6d9c'],
    mountain: '#1a2a55',
    moon: '#e3ecf7',
    spirit: '#9ec4ff',
    star: '#eaf3ff',
  },
  kokoro: {
    sky: ['#140710', '#3c1830', '#a04a44'],
    mountain: '#371a33',
    moon: '#f6dccd',
    spirit: '#ff9f8a',
    star: '#ffe9dd',
  },
  kaze: {
    sky: ['#0a1116', '#1d3438', '#5e8a6a'],
    mountain: '#1c333a',
    moon: '#e9f2e4',
    spirit: '#b6e8a8',
    star: '#edfae6',
  },
};
