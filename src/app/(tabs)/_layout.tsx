import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/tab-bar';
import { strings } from '@/i18n';
import { colors } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="community" options={{ title: strings.community }} />
      <Tabs.Screen name="markets" options={{ title: strings.markets }} />
      <Tabs.Screen name="ranking" options={{ title: strings.ranking }} />
      <Tabs.Screen name="profile" options={{ title: strings.profile }} />
    </Tabs>
  );
}
