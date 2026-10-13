import type { LucideIcon } from 'lucide-react-native';
import { Crosshair, Medal, Sparkles, Target, Users } from 'lucide-react-native';

import { strings } from '@/i18n';
import type { ProfileCard } from './social';

export type Badge = { key: string; label: string; icon: LucideIcon };

/**
 * Badges are earned from real numbers (never bought, never self-declared),
 * so they can be trusted: anyone can see how they were earned from the label.
 */
export function badgesFor(c: ProfileCard): Badge[] {
  const out: Badge[] = [];
  if (c.callsTotal >= 1) out.push({ key: 'first', label: strings.badgeFirst, icon: Target });
  if (c.callsResolved >= 10 && c.callsHits / c.callsResolved >= 0.6)
    out.push({ key: 'sharp', label: strings.badgeSharp, icon: Crosshair });
  if (c.callsTotal >= 50) out.push({ key: 'veteran', label: strings.badgeVeteran, icon: Medal });
  if (c.followers >= 10) out.push({ key: 'followed', label: strings.badgeFollowed, icon: Users });
  if (c.pro) out.push({ key: 'pro', label: strings.badgePro, icon: Sparkles });
  return out;
}
