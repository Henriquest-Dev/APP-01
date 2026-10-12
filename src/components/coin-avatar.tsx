import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { Txt } from './text';

export function CoinAvatar({ uri, symbol, size = 40 }: { uri?: string; symbol: string; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  return uri ? (
    <Image source={{ uri }} style={box} contentFit="cover" transition={250} />
  ) : (
    <View style={[styles.fallback, box]}>
      <Txt size={size * 0.38} weight="semibold">
        {symbol.slice(0, 1)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});
