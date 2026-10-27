import React, { useEffect } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { T } from '../src/components/T';
import { Press } from '../src/components/Press';
import { Icon, type IconName } from '../src/components/Icon';
import { Chip } from '../src/components/Chip';
import { useTheme } from '../src/theme/ThemeProvider';
import { buildMeal, useApp } from '../src/state/AppState';
import { shiftKey } from '../src/lib/dates';
import { mealForHour } from '../src/lib/format';
import type { Meal } from '../src/state/types';
import { duration } from '../src/lib/motion';

type Option = { key: string; label: string; icon: IconName; primary?: boolean; onPress: () => void };

function FanTile({ option, index, originX, originY, x, y, w }: { option: Option; index: number; originX: number; originY: number; x: number; y: number; w: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    t.value = reduce ? 1 : withDelay(40 + index * 55, withSpring(1, { damping: 13, stiffness: 190 }));
  }, [reduce, index, t]);
  // "Cloning": each tile flies out of the + button to its own place.
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 1.6),
    transform: [
      { translateX: (originX - (x + w / 2)) * (1 - t.value) },
      { translateY: (originY - (y + 52)) * (1 - t.value) },
      { scale: 0.3 + 0.7 * t.value },
    ],
  }));
  const bg = option.primary ? c.button : c.surface;
  const fg = option.primary ? c.buttonText : c.ink;
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, width: w }, style]}>
      <Press haptic onPress={option.onPress} accessibilityLabel={option.label} style={[styles.tile, { backgroundColor: bg }]}>
        <Icon name={option.icon} color={fg} size={26} />
        <T v="small" weight="bold" color={fg}>
          {option.label}
        </T>
      </Press>
    </Animated.View>
  );
}

export default function LogMenu() {
  const { c, isDark } = useTheme();
  const { s, today, dispatch } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const turn = useSharedValue(reduce ? 1 : 0);

  useEffect(() => {
    turn.value = reduce ? 1 : withTiming(1, { duration: duration.base + 150 });
  }, [reduce, turn]);
  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 135}deg` }] }));

  const close = () => router.back();
  const go = (path: string) => {
    router.back();
    setTimeout(() => router.push(path), 10);
  };

  const logAgain = (meals: Meal[]) => {
    dispatch({ type: 'logMeals', meals: meals.map((m) => ({ ...buildMeal(m.items, 'copy', mealForHour(new Date().getHours())) })) });
    router.back();
    setTimeout(() => router.push('/scan/saved'), 10);
  };

  // Recent: the last few different meals from the past week.
  const recent: Meal[] = [];
  for (let i = 0; i < 7 && recent.length < 3; i++) {
    for (const m of [...(s.days[shiftKey(today, -i)]?.meals ?? [])].reverse()) {
      if (recent.length < 3 && !recent.some((r) => r.title === m.title)) recent.push(m);
    }
  }

  const options: Option[] = [
    { key: 'photo', label: 'Snap a photo', icon: 'camera', primary: true, onPress: () => go('/scan/camera') },
    { key: 'voice', label: 'Say it', icon: 'mic', onPress: () => go('/voice') },
    { key: 'barcode', label: 'Barcode', icon: 'barcode', onPress: () => go('/barcode') },
    { key: 'type', label: 'Type it', icon: 'pencil', onPress: () => go('/type') },
    { key: 'saved', label: 'Saved meals', icon: 'bookmark', onPress: () => go('/saved-meals') },
    {
      key: 'copy',
      label: 'Same as yesterday',
      icon: 'copy',
      onPress: () => {
        const type = mealForHour(new Date().getHours());
        const y = s.days[shiftKey(today, -1)]?.meals ?? [];
        const same = y.filter((m) => m.type === type);
        const pick = same.length ? same : y;
        if (!pick.length) {
          const msg = 'Nothing was logged yesterday. Snap, say or type this meal instead.';
          if (Platform.OS === 'web') router.back();
          else Alert.alert('Nothing to copy', msg);
          return;
        }
        logAgain(pick);
      },
    },
  ];

  const gap = 10;
  const tileW = (width - 36 - gap * 2) / 3;
  const gridTop = height - insets.bottom - 120 - 2 * (104 + gap) - 70;
  const originX = width / 2;
  const originY = height - insets.bottom - 40;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(duration.base)} style={StyleSheet.absoluteFill}>
        <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? 'rgba(12,17,29,0.55)' : 'rgba(255,255,255,0.55)' }]} onPress={close} accessibilityLabel="Close log menu" />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(duration.slow).delay(60)} style={{ position: 'absolute', left: 18, right: 18, top: gridTop - 130, gap: 12 }}>
        <View style={{ gap: 2 }}>
          <T v="title">Log anything</T>
          <T muted>Pick the fastest way for this meal.</T>
        </View>
        {recent.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <T v="label" muted>
              Recent
            </T>
            {recent.map((m) => (
              <Chip key={m.id} label={m.title.split(',').slice(0, 2).join(' +')} onPress={() => logAgain([m])} />
            ))}
          </View>
        ) : null}
      </Animated.View>

      {options.map((o, i) => (
        <FanTile
          key={o.key}
          option={o}
          index={i}
          originX={originX}
          originY={originY}
          x={18 + (i % 3) * (tileW + gap)}
          y={gridTop + Math.floor(i / 3) * (104 + gap)}
          w={tileW}
        />
      ))}

      <Animated.View entering={FadeInDown.duration(duration.slow).delay(380)} style={{ position: 'absolute', left: 18, right: 18, top: gridTop + 2 * (104 + gap) + 4 }}>
        <Press onPress={() => go('/fits')} style={[styles.ask, { backgroundColor: c.mintTint }]} accessibilityLabel="Ask PlateWise what to eat">
          <Icon name="chat" color={c.mintDeep} />
          <T v="body" weight="bold" color={c.mintDeep} style={{ flex: 1 }}>
            Ask PlateWise
          </T>
          <T v="small" color={c.mintDeep}>
            “What fits {mealForHour(new Date().getHours()) === 'Dinner' ? 'tonight' : 'now'}?”
          </T>
        </Press>
      </Animated.View>

      <Press
        onPress={close}
        accessibilityLabel="Close log menu"
        scaleTo={0.9}
        style={[styles.fab, { backgroundColor: c.button, left: width / 2 - 30, bottom: insets.bottom + 10 }]}
      >
        <Animated.View style={plusStyle}>
          <Icon name="plus" color={c.buttonText} size={28} strokeWidth={2.6} />
        </Animated.View>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { height: 104, borderRadius: 22, padding: 14, justifyContent: 'space-between' },
  ask: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingHorizontal: 16, borderRadius: 27 },
  fab: { position: 'absolute', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
