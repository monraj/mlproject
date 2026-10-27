import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { T } from '../src/components/T';
import { Odometer } from '../src/components/Odometer';
import { IconButton } from '../src/components/IconButton';
import { Button } from '../src/components/Button';
import { useApp } from '../src/state/AppState';
import { useTheme } from '../src/theme/ThemeProvider';
import { weekDays } from '../src/data/sample';
import { kcal } from '../src/lib/format';
import { duration, easeOut, stagger } from '../src/lib/motion';

const BG = '#101828';
const CARD = '#1D2939';
const SOFT = '#D0D5DD';
const CHART_H = 130;

function DayBar({ index, value, max, color }: { index: number; value: number; max: number; color: string }) {
  const reduce = useReducedMotion();
  const h = (value / max) * CHART_H;
  const t = useSharedValue(reduce ? h : 0);
  useEffect(() => {
    if (!reduce) t.value = withDelay(500 + index * 70, withTiming(h, { duration: 700, easing: easeOut }));
  }, [reduce, h, index, t]);
  const style = useAnimatedStyle(() => ({ height: t.value }));
  return <Animated.View style={[{ flex: 1, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, backgroundColor: color }, style]} />;
}

/** Weekly recap, story-style: tap to pause, the progress bar fills over 6 s. */
export default function Week() {
  const { c } = useTheme();
  const { s } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const seg = useSharedValue(0);
  const paused = useSharedValue(false);

  useEffect(() => {
    seg.value = reduce ? 1 : withTiming(1, { duration: 6000, easing: Easing.linear });
  }, [reduce, seg]);
  const segStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: seg.value }] }));

  const togglePause = () => {
    if (paused.value) {
      paused.value = false;
      seg.value = withTiming(1, { duration: 6000 * (1 - seg.value), easing: Easing.linear });
    } else {
      paused.value = true;
      cancelAnimation(seg);
    }
  };

  const budget = s.budget;
  const max = Math.max(...weekDays.map((d) => d.kcal), budget) * 1.05;
  const budgetY = (budget / max) * CHART_H;
  const colorFor = (k: number) => (Math.abs(k - budget) <= 60 ? '#FFFFFF' : k > budget ? c.sun : c.mintLight);
  const label = weekDays.map((d) => `${d.d} ${kcal(d.kcal)}`).join(', ');

  return (
    <Pressable style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]} onPress={togglePause} accessibilityHint="Tap to pause or resume the story">
      <StatusBar style="light" />
      <View style={styles.segs} accessibilityLabel="Story 2 of 5">
        <View style={[styles.seg, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.seg, { overflow: 'hidden' }]}>
          <Animated.View style={[{ height: 3, backgroundColor: '#FFFFFF', transformOrigin: 'left' }, segStyle]} />
        </View>
        <View style={styles.seg} />
        <View style={styles.seg} />
        <View style={styles.seg} />
      </View>

      <View style={styles.top}>
        <T v="small" weight="bold" color={SOFT}>
          Your week · 19–25 Oct
        </T>
        <IconButton icon="close" label="Close" tone="dark" onPress={() => router.back()} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
        <Odometer value={19} size={76} color="#FFFFFF" delay={200} />
        <Animated.View entering={FadeInDown.duration(duration.slow).delay(900)} style={{ paddingBottom: 14, gap: 2 }}>
          <T v="h2" size={20} color="#FFFFFF">
            meals logged
          </T>
          <T v="small" color={SOFT}>
            on 6 of 7 days
          </T>
        </Animated.View>
      </View>

      <View style={[styles.card, { gap: 10 }]}>
        <View style={styles.between}>
          <T v="body" weight="bold" color="#FFFFFF">
            Calories by day
          </T>
          <T v="small" size={12} color={SOFT}>
            - - Budget {kcal(budget)}
          </T>
        </View>
        <View style={{ height: CHART_H }} accessible accessibilityRole="image" accessibilityLabel={`Daily calories: ${label}`}>
          <View style={[styles.bars, { height: CHART_H }]}>
            {weekDays.map((d, i) => (
              <DayBar key={i} index={i} value={d.kcal} max={max} color={colorFor(d.kcal)} />
            ))}
          </View>
          <View style={[styles.budgetLine, { bottom: budgetY }]} />
        </View>
        <View style={styles.bars}>
          {weekDays.map((d, i) => (
            <T key={i} v="small" size={12} weight="bold" color={SOFT} center style={{ flex: 1 }}>
              {d.d}
            </T>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {[
            { k: 'Under', col: c.mintLight },
            { k: 'Right on', col: '#FFFFFF' },
            { k: 'Over', col: c.sun },
          ].map((x) => (
            <View key={x.k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: x.col }} />
              <T v="small" size={12} color={SOFT}>
                {x.k}
              </T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { t: 'Top dish', v: 'Waakye', n: '4 times' },
          { t: 'Best day', v: 'Thursday', n: 'Right on budget' },
          { t: 'Trend', v: '−0.4 kg', n: 'This week' },
        ].map((x, i) => (
          <Animated.View key={x.t} entering={FadeInDown.duration(duration.slow).delay(1100 + i * stagger)} style={[styles.card, { flex: 1, gap: 4, padding: 12 }]}>
            <T v="small" size={12} color={SOFT}>
              {x.t}
            </T>
            <T v="body" weight="bold" color="#FFFFFF">
              {x.v}
            </T>
            <T v="small" size={12} color={SOFT}>
              {x.n}
            </T>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.duration(duration.slow).delay(1400)} style={[styles.nudge, { backgroundColor: '#FFFFFF' }]}>
        <T v="label" color="#027A48">
          Try next week
        </T>
        <T v="body" weight="semibold" color="#101828">
          Your over-budget days were weekends. Plan Saturday dinner on Friday.
        </T>
      </Animated.View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Share" icon="share" kind="ghost" fgColor="#FFFFFF" onPress={() => undefined} style={{ borderWidth: 1, borderColor: '#667085' }} />
        <Button label="Next" grow bgColor="#FFFFFF" fgColor="#101828" onPress={() => router.back()} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, paddingHorizontal: 20, gap: 18 },
  segs: { flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#344054' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: CARD, borderRadius: 20, padding: 16 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bars: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  budgetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: '#667085' },
  nudge: { borderRadius: 18, padding: 16, gap: 4 },
});
