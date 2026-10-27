import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Button } from '../../src/components/Button';
import { Bar } from '../../src/components/Bar';
import { Card } from '../../src/components/Card';
import { Icon, type IconName } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { mealTips } from '../../src/state/insights';
import { approx, kcal, mealForHour } from '../../src/lib/format';
import { duration, easeOut, spring } from '../../src/lib/motion';

const APath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 60;

function Burst({ angle, color }: { angle: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withDelay(320, withTiming(1, { duration: 800, easing: easeOut }));
  }, [reduce, t]);
  const dx = Math.cos(angle) * 74;
  const dy = Math.sin(angle) * 74;
  const style = useAnimatedStyle(() => ({
    opacity: t.value === 0 ? 0 : 1 - t.value,
    transform: [{ translateX: dx * t.value }, { translateY: dy * t.value }, { scale: 0.4 + 0.6 * t.value }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.burst, { backgroundColor: color }, style]} />;
}

export default function Saved() {
  const { c } = useTheme();
  const { s, day, budget, eatenKcal, leftKcal, protein, proteinGoal, greens } = useApp();
  const router = useRouter();
  const reduce = useReducedMotion();
  const meal = day.meals.find((m) => m.id === s.lastSavedId) ?? day.meals[day.meals.length - 1];
  const tips = meal ? mealTips(meal, protein, proteinGoal, greens, eatenKcal, budget) : [];
  const hide = !!s.profile?.hideNumbers;
  const next = mealForHour(new Date().getHours() + 3);

  const pop = useSharedValue(reduce ? 1 : 0);
  const draw = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (reduce) return;
    pop.value = withSpring(1, spring.pop);
    draw.value = withDelay(280, withTiming(1, { duration: 420, easing: easeOut }));
  }, [reduce, pop, draw]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));
  const colors = [c.mint, c.sun, c.amber, c.mint, c.sun, c.amber, c.mint, c.sun];
  const tipIcon: Record<string, IconName> = { good: 'check', tip: 'drop', info: 'leaf' };

  return (
    <Screen
      footer={
        <>
          {leftKcal >= 300 ? <Button label={`See what fits for ${next.toLowerCase()}`} onPress={() => router.replace('/fits')} /> : null}
          <Button label="Back to today" kind="ghost" onPress={() => router.replace('/today')} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.checkWrap}>
          {colors.map((col, i) => (
            <Burst key={i} angle={(i / colors.length) * Math.PI * 2 - Math.PI / 2} color={col} />
          ))}
          <Animated.View style={popStyle}>
            <Svg width={96} height={96} viewBox="0 0 96 96" accessibilityElementsHidden>
              <Circle cx={48} cy={48} r={44} fill={c.mint} />
              <APath
                d="M30 49l12 12 24-26"
                stroke="#FFFFFF"
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={[CHECK_LEN, CHECK_LEN]}
                animatedProps={checkProps}
              />
            </Svg>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.duration(duration.slow).delay(400)} style={{ alignItems: 'center', gap: 4 }}>
          <T v="title" accessibilityRole="header">
            {meal ? `${meal.type} saved` : 'Saved'}
          </T>
          {meal ? (
            <T muted center numberOfLines={2}>
              {hide ? meal.title : `About ${approx(meal.kcal).slice(1)} kcal · ${meal.title}`}
            </T>
          ) : null}
        </Animated.View>
      </View>

      {!hide && (
        <Card order={1} baseDelay={500} style={{ gap: 10 }}>
          <View style={styles.between}>
            <T v="body" weight="bold">
              Today so far
            </T>
            <T v="small" muted>
              <T v="small" weight="bold">
                {kcal(eatenKcal)}
              </T>{' '}
              of {kcal(budget)} kcal
            </T>
          </View>
          <Bar value={eatenKcal / budget} from={s.eatenBefore / budget} color={c.mint} track={c.line} height={12} delay={800} />
          <T v="small" muted>
            {leftKcal > 0 ? `${kcal(leftKcal)} left for the rest of the day` : 'You’ve used today’s budget — that’s okay, the week evens out.'}
          </T>
        </Card>
      )}

      <View style={{ gap: 8 }}>
        <Animated.View entering={FadeInDown.duration(duration.slow).delay(850)}>
          <T v="label" muted>
            Meal check
          </T>
        </Animated.View>
        {tips.map((tip, i) => {
          const tone = tip.kind === 'good' ? 'mint' : tip.kind === 'tip' ? 'amber' : 'surface';
          const fg = tip.kind === 'good' ? c.mintDeep : tip.kind === 'tip' ? c.amberText : c.ink;
          return (
            <Card key={tip.title} tone={tone} order={i} baseDelay={950} style={styles.tip}>
              <Icon name={tipIcon[tip.kind]} color={fg} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="body" weight="bold" color={fg}>
                  {tip.title}
                </T>
                <T v="small" color={tip.kind === 'info' ? c.muted : fg}>
                  {tip.body}
                </T>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 14, paddingTop: 24 },
  checkWrap: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', left: 44, top: 44, width: 9, height: 9, borderRadius: 5 },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  tip: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
});
