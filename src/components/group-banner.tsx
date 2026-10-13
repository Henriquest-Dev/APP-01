import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { bannerColors } from '@/lib/banners';
import { Txt } from './text';

/** The group's colour banner, with its initial as a large soft watermark. */
export function GroupBanner({ banner, name, style }: { banner: string; name: string; style?: ViewStyle }) {
  const [a, b] = bannerColors(banner);
  return (
    <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.box, style]}>
      <View style={styles.mark} pointerEvents="none">
        <Txt size={96} weight="bold" color="rgba(255,255,255,0.14)">
          {name[0]?.toUpperCase() ?? ''}
        </Txt>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: { height: 92, overflow: 'hidden' },
  mark: { position: 'absolute', right: 18, top: -8 },
});
