export const BANNERS = {
  violet: ['#6D4BFF', '#2A1B7A'],
  ocean: ['#2E7BFF', '#0B2A6B'],
  mint: ['#2FD5A0', '#0B5A47'],
  sunset: ['#FF8A4C', '#8A2B4F'],
  rose: ['#FF5C9A', '#6B1B47'],
  slate: ['#5B6478', '#1C2030'],
} as const;

export type BannerKey = keyof typeof BANNERS;
export const BANNER_KEYS = Object.keys(BANNERS) as BannerKey[];

export function bannerColors(key: string | undefined): readonly [string, string] {
  return BANNERS[(key as BannerKey) in BANNERS ? (key as BannerKey) : 'violet'];
}
