import { Image } from 'expo-image';
import { View } from 'react-native';

import { colors, fonts } from '@/theme';
import { Txt } from './text';

const LOGO = require('@/assets/animations/logo.webp');

/** The animated Callout mark (looping, transparent). */
export function AnimatedLogo({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={LOGO}
      style={{ width: size, height: size }}
      contentFit="contain"
      autoplay
      accessibilityLabel="Callout"
    />
  );
}

/** Animated mark with "PRO" set underneath, for Callout Pro surfaces. */
export function ProLogo({ size = 64 }: { size?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <AnimatedLogo size={size} />
      <View
        style={{
          marginTop: -size * 0.06,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 6,
          backgroundColor: colors.accent,
        }}>
        <Txt
          size={Math.max(10, size * 0.17)}
          weight="display"
          color="#FFFFFF"
          style={{ fontFamily: fonts.display, letterSpacing: 1.5 }}>
          PRO
        </Txt>
      </View>
    </View>
  );
}
