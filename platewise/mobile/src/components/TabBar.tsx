import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Press } from './Press';
import { T } from './T';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';

type TabRoute = { key: string; name: string };
type Props = {
  state: { index: number; routes: TabRoute[] };
  navigation: { navigate: (name: string) => void; emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean } };
};

const META: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Today', icon: 'today' },
  progress: { label: 'Progress', icon: 'progress' },
  coach: { label: 'Coach', icon: 'chat' },
  me: { label: 'Me', icon: 'me' },
};

/** Bottom bar: four tabs around a centre "+" that opens the Log menu. */
export function TabBar({ state, navigation }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const tab = (route: TabRoute, i: number) => {
    const meta = META[route.name];
    if (!meta) return null;
    const focused = state.index === i;
    const color = focused ? c.mintText : c.muted;
    return (
      <Press
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={meta.label}
        onPress={() => {
          const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !ev.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.tab}
      >
        <Icon name={meta.icon} color={color} size={24} />
        <T v="small" size={11} weight={focused ? 'bold' : 'semibold'} color={color}>
          {meta.label}
        </T>
      </Press>
    );
  };

  const left = state.routes.slice(0, 2);
  const right = state.routes.slice(2);

  return (
    <View style={[styles.bar, { backgroundColor: c.raised, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 10) }]}>
      {left.map((r, i) => tab(r, i))}
      <Press
        accessibilityLabel="Log a meal"
        accessibilityHint="Opens ways to log: photo, voice, barcode and more"
        scaleTo={0.92}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          router.push('/log');
        }}
        onLongPress={() => router.push('/scan/camera')}
        style={[styles.fab, { backgroundColor: c.button }]}
      >
        <Icon name="plus" color={c.buttonText} size={28} strokeWidth={2.6} />
      </Press>
      {right.map((r, i) => tab(r, i + 2))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: { minWidth: 60, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginTop: -22 },
});
