import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '../../src/components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tabBar={(props: any) => <TabBar state={props.state} navigation={props.navigation} />}
    >
      <Tabs.Screen name="today" />
      <Tabs.Screen name="progress" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
