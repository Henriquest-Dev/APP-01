import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';
import { Txt } from './text';

export function CoinAvatar({ uri, symbol, size = 40 }: { uri?: string; symbol: string; size?: number }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.wrap, box]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size * 0.62, height: size * 0.62 }} contentFit="contain" />
      ) : (
        <Txt size={size * 0.34} weight="bold">
          {symbol.slice(0, 1)}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});
