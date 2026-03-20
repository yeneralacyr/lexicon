import { Tabs } from 'expo-router';
import React from 'react';

import { MainTabBar } from '@/components/navigation/main-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <MainTabBar {...props} />}>
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
