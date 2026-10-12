/**
 * Callout design tokens.
 * Dark, calm base with a single electric-lime accent; "down" uses a warm coral
 * so up/down never relies on green vs red alone.
 */
export const colors = {
  bg: '#0A0D0B',
  bgGlow: '#1A2614',
  surface: '#131815',
  surfaceRaised: '#1B211D',
  border: '#232A25',
  text: '#F2F5F0',
  textMuted: '#8D978F',
  textFaint: '#5B645D',
  accent: '#C8F560',
  accentInk: '#0A0D0B',
  accentSoft: 'rgba(200, 245, 96, 0.14)',
  up: '#C8F560',
  down: '#FF6B5B',
  downSoft: 'rgba(255, 107, 91, 0.14)',
  warn: '#FFC857',
} as const;

export const fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;

/** Height reserved at the bottom of tab screens for the floating tab bar. */
export const TAB_BAR_SPACE = 110;
