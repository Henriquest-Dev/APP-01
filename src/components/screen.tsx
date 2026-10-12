import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space, TAB_BAR_SPACE } from '@/theme';

type Props = ScrollViewProps & { children: ReactNode; withTabBar?: boolean; header?: ReactNode };

export function Screen({ children, withTabBar = true, header, contentContainerStyle, ...rest }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgGlow, colors.bg]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.6, y: 0.55 }}
        style={StyleSheet.absoluteFill}
      />
      {header ? <View style={{ paddingTop: insets.top + space.sm }}>{header}</View> : null}
      <ScrollView
        {...rest}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            paddingTop: header ? space.md : insets.top + space.md,
            paddingBottom: (withTabBar ? TAB_BAR_SPACE : space.xl) + insets.bottom,
          },
          contentContainerStyle,
        ]}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
