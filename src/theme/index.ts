/**
 * Callout design tokens.
 * Deep night-blue base, violet glow and accent, glass surfaces.
 * Up/down use mint and rose and always come with an arrow, never color alone.
 */
export const colors = {
  bg: '#0B0C14',
  bgTop: '#0E1020',
  glow: '#5B3FD9',
  surface: 'rgba(255, 255, 255, 0.045)',
  surfaceSolid: '#15172A',
  surfaceRaised: 'rgba(255, 255, 255, 0.08)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.14)',
  text: '#F4F4FB',
  textMuted: '#9497B0',
  textFaint: '#5E6180',
  accent: '#8B6CFF',
  accentBright: '#A891FF',
  accentInk: '#FFFFFF',
  accentSoft: 'rgba(139, 108, 255, 0.16)',
  up: '#3DDC97',
  upSoft: 'rgba(61, 220, 151, 0.14)',
  down: '#FF5C7A',
  downSoft: 'rgba(255, 92, 122, 0.14)',
  warn: '#FFB547',
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

/** Height reserved at the bottom of tab screens for the floating tab bar. */
export const TAB_BAR_SPACE = 104;

/** Shared motion timings so every animation feels like the same app. */
export const motion = {
  fast: 180,
  base: 320,
  slow: 900,
  stagger: 45,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
} as const;
