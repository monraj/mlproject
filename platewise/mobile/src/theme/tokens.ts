// Fresh mint design tokens. Source of truth: the "Fresh mint" page of the design canvas.
// Rule: never put white or small text on `mint` (#12B76A) — it fails contrast.
// Use `button` for primary actions and `mintText` for mint-coloured words.

export type Palette = {
  bg: string;
  surface: string;
  raised: string;
  line: string;
  ink: string;
  muted: string;
  faint: string;
  mint: string;
  mintBorder: string;
  mintText: string;
  mintDeep: string;
  mintTint: string;
  mintLight: string;
  sun: string;
  amber: string;
  amberText: string;
  amberTint: string;
  button: string;
  buttonText: string;
  hero: string;
  heroText: string;
  heroMuted: string;
  scrim: string;
  protein: string;
  greens: string;
  water: string;
  steps: string;
  food: {
    plate: string;
    plateRim: string;
    rice: string;
    bean: string;
    stew: string;
    egg: string;
    yolk: string;
    plantain: string;
  };
};

export const light: Palette = {
  bg: '#FFFFFF',
  surface: '#F4F6F5',
  raised: '#FFFFFF',
  line: '#EAECF0',
  ink: '#101828',
  muted: '#475467',
  faint: '#98A2B3',
  mint: '#12B76A',
  mintBorder: '#039855',
  mintText: '#027A48',
  mintDeep: '#05603A',
  mintTint: '#ECFDF3',
  mintLight: '#6CE9A6',
  sun: '#FDB022',
  amber: '#F79009',
  amberText: '#B54708',
  amberTint: '#FFFAEB',
  button: '#101828',
  buttonText: '#FFFFFF',
  hero: '#101828',
  heroText: '#FFFFFF',
  heroMuted: '#CECFD2',
  scrim: 'rgba(16,24,40,0.45)',
  protein: '#12B76A',
  greens: '#7E9A2E',
  water: '#2E90FA',
  steps: '#F79009',
  food: {
    plate: '#EAECF0',
    plateRim: '#FFFFFF',
    rice: '#6E3A2A',
    bean: '#4A241A',
    stew: '#B23A1E',
    egg: '#FFFFFF',
    yolk: '#F2B632',
    plantain: '#E08A2E',
  },
};

export const dark: Palette = {
  bg: '#0C111D',
  surface: '#161B26',
  raised: '#1F242F',
  line: '#333741',
  ink: '#F5F5F6',
  muted: '#94969C',
  faint: '#667085',
  mint: '#32D583',
  mintBorder: '#32D583',
  mintText: '#6CE9A6',
  mintDeep: '#D1FADF',
  mintTint: '#053321',
  mintLight: '#6CE9A6',
  sun: '#FDB022',
  amber: '#FDB022',
  amberText: '#FEC84B',
  amberTint: '#4E1D09',
  button: '#F5F5F6',
  buttonText: '#0C111D',
  hero: '#1F242F',
  heroText: '#F5F5F6',
  heroMuted: '#94969C',
  scrim: 'rgba(0,0,0,0.6)',
  protein: '#32D583',
  greens: '#B8D86B',
  water: '#53B1FD',
  steps: '#FDB022',
  food: {
    plate: '#333741',
    plateRim: '#1F242F',
    rice: '#6E3A2A',
    bean: '#4A241A',
    stew: '#B23A1E',
    egg: '#F5F5F6',
    yolk: '#F2B632',
    plantain: '#E08A2E',
  },
};

export const radius = {
  card: 20,
  sheet: 28,
  chip: 999,
  small: 12,
} as const;

export const space = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 28,
} as const;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  heavy: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = keyof typeof font;
