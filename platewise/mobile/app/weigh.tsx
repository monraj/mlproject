import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { T } from '../src/components/T';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { font } from '../src/theme/tokens';
import { duration, spring } from '../src/lib/motion';

/** Bottom sheet for today's weight (or steps). */
export default function Weigh() {
  const { c } = useTheme();
  const { s, day, today, dispatch } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const steps = mode === 'steps';
  const last = s.weights[s.weights.length - 1]?.kg ?? s.profile?.weightKg;
  const [value, setValue] = useState(steps ? (day.steps ? String(day.steps) : '') : last ? String(last) : '');
  const [problem, setProblem] = useState<string | null>(null);

  const y = useSharedValue(reduce ? 0 : height);
  const fade = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    y.value = reduce ? 0 : withSpring(0, spring.sheet);
    fade.value = withTiming(1, { duration: duration.base });
  }, [reduce, y, fade]);
  const goBack = () => router.back();
  const close = () => {
    if (reduce) return goBack();
    fade.value = withTiming(0, { duration: duration.base });
    y.value = withTiming(height, { duration: duration.base }, (f) => {
      if (f) runOnJS(goBack)();
    });
  };
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const save = () => {
    const n = Number(value.replace(',', '.'));
    if (steps) {
      if (!(n >= 0 && n < 200000)) return setProblem('Enter your steps for today.');
      dispatch({ type: 'habit', date: today, key: 'steps', value: Math.round(n) });
    } else {
      if (!(n >= 30 && n <= 300)) return setProblem('Enter your weight in kilograms.');
      dispatch({ type: 'addWeight', weight: { date: today, kg: Math.round(n * 10) / 10 } });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    close();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: c.raised, paddingBottom: insets.bottom + 20 }, sheetStyle]}>
          <View style={[styles.handle, { backgroundColor: c.line }]} />
          <View style={styles.head}>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="title" size={24}>
                {steps ? 'Steps today' : 'Today’s weight'}
              </T>
              <T v="small" muted>
                {steps ? 'Copy the number from your phone’s health app.' : 'Same time each day is best, ideally in the morning.'}
              </T>
            </View>
            <IconButton icon="close" label="Close" onPress={close} />
          </View>
          <View style={[styles.input, { backgroundColor: c.surface }]}>
            <TextInput
              value={value}
              onChangeText={(v) => {
                setValue(v);
                setProblem(null);
              }}
              autoFocus
              keyboardType="decimal-pad"
              accessibilityLabel={steps ? 'Steps' : 'Weight in kilograms'}
              style={{ flex: 1, fontFamily: font.heavy, fontSize: 34, color: c.ink }}
            />
            <T v="h2" muted>
              {steps ? 'steps' : 'kg'}
            </T>
          </View>
          {problem ? (
            <T v="small" weight="semibold" color={c.amberText}>
              {problem}
            </T>
          ) : null}
          <Button label="Save" onPress={save} />
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 72, paddingHorizontal: 18, borderRadius: 18 },
});
