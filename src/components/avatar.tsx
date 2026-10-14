import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { useAvatar } from '@/lib/avatars';
import { colors } from '@/theme';
import { Txt } from './text';

type Props = {
  userId?: string;
  name: string;
  size?: number;
  /** Use this picture instead of looking it up (profile screens already have it). */
  uri?: string | null;
  ring?: boolean;
};

/** Round profile photo, falling back to the first letter of the name. */
export function Avatar({ userId, name, size = 40, uri, ring }: Props) {
  const looked = useAvatar(uri === undefined ? userId : undefined);
  const src = uri === undefined ? looked : uri;
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size / 2 },
        ring && { borderWidth: 4, borderColor: colors.bg },
      ]}>
      {src ? (
        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Txt size={Math.round(size * 0.42)} weight="bold" color={colors.accentInk}>
          {name[0]?.toUpperCase() ?? '?'}
        </Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
