import Svg, { Path, Polyline } from 'react-native-svg';

import { colors } from '@/theme';

/** Callout mark: a speech bubble with a rising line. */
export function LogoMark({
  size = 28,
  color = colors.accent,
  ink = '#FFFFFF',
}: {
  size?: number;
  color?: string;
  ink?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="200 280 640 560">
      <Path
        d="M292 300 h440 a90 90 0 0 1 90 90 v220 a90 90 0 0 1 -90 90 h-250 l-120 104 v-104 h-70 a90 90 0 0 1 -90 -90 v-220 a90 90 0 0 1 90 -90 z"
        fill={color}
      />
      <Polyline
        points="330,600 450,480 540,550 690,410"
        fill="none"
        stroke={ink}
        strokeWidth={54}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="600,405 695,405 695,500"
        fill="none"
        stroke={ink}
        strokeWidth={54}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
