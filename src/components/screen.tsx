import type { ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, space, TAB_BAR_SPACE } from '@/theme';
import { Background } from './background';

type Props = ScrollViewProps & {
  children: ReactNode;
  withTabBar?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
};

export function Screen({
  children,
  withTabBar = true,
  header,
  footer,
  contentContainerStyle,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <Background />
      {header ? (
        <View style={{ paddingTop: insets.top + space.sm, paddingBottom: space.sm }}>{header}</View>
      ) : null}
      <Animated.ScrollView
        {...rest}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            paddingTop: header ? space.sm : insets.top + space.md,
            paddingBottom: (withTabBar ? TAB_BAR_SPACE : space.xl) + insets.bottom,
          },
          contentContainerStyle,
        ]}>
        {children}
      </Animated.ScrollView>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
