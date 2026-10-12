import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme';

/** Night-blue backdrop with the violet glow rising from the bottom (and a hint at the top). */
export function Background() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="bottomGlow" cx="70%" cy="105%" rx="85%" ry="45%">
            <Stop offset="0" stopColor={colors.glow} stopOpacity={0.55} />
            <Stop offset="0.55" stopColor={colors.glow} stopOpacity={0.12} />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="topGlow" cx="15%" cy="-5%" rx="70%" ry="30%">
            <Stop offset="0" stopColor={colors.glow} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={colors.bg} />
        <Rect width="100%" height="100%" fill="url(#topGlow)" />
        <Rect width="100%" height="100%" fill="url(#bottomGlow)" />
      </Svg>
    </View>
  );
}
