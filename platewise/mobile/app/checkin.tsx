import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { Odometer } from '../src/components/Odometer';
import { Bar } from '../src/components/Bar';
import { Card } from '../src/components/Card';
import { Press } from '../src/components/Press';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { CALORIE_FLOOR } from '../src/state/calc';
import { kcal } from '../src/lib/format';
import { duration, easeOut, stagger } from '../src/lib/motion';

// Prototype numbers. Phase 5 computes these from weigh-ins and logged intake,
// and never moves the budget more than ±150 kcal in a week.
const AVG_INTAKE = 1830;
const LEARNED_BURN = 2280;

export default function CheckIn() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const reduce = useReducedMotion();
  const old = s.previousBudget ?? s.budget + 60;
  const proposed = Math.max(CALORIE_FLOOR[s.sex], s.budget);
  const options = [
    { id: 'new', title: `Use ${kcal(proposed)} kcal`, note: 'Suggested · stays on pace', value: proposed },
    { id: 'keep', title: `Keep ${kcal(old)} kcal`, note: 'Slower pace, a bit more food', value: old },
    { id: 'maint', title: 'Take a maintenance week', note: `Eat at about ${kcal(LEARNED_BURN)} for a break`, value: LEARNED_BURN },
  ];
  const [pick, setPick] = useState('new');

  // Old number gets struck through, then fades — the change is shown, not hidden.
  const strike = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) strike.value = withDelay(600, withTiming(1, { duration: 400, easing: easeOut }));
  }, [reduce, strike]);
  const strikeStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: strike.value }] }));
  const oldStyle = useAnimatedStyle(() => ({ opacity: 1 - 0.45 * strike.value }));

  return (
    <Screen
      footer={
        <Button
          label="Confirm"
          onPress={() => {
            const chosen = options.find((o) => o.id === pick);
            if (chosen) dispatch({ type: 'setBudget', budget: chosen.value });
            router.back();
          }}
        />
      }
    >
      <View style={styles.top}>
        <T v="small" weight="bold" muted>
          Weekly check-in
        </T>
        <IconButton icon="close" label="Close" onPress={() => router.back()} />
      </View>

      <View style={{ gap: 6 }}>
        <T v="title">Your new daily budget</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <Animated.View style={oldStyle}>
            <T v="title" size={26} muted>
              {kcal(old)}
            </T>
            <Animated.View style={[styles.strike, { backgroundColor: c.faint }, strikeStyle]} />
          </Animated.View>
          <Odometer value={proposed} size={58} color={c.mintDeep} delay={900} />
        </View>
        <T muted>kcal a day, starting today</T>
      </View>

      <Card order={1} style={{ gap: 12 }}>
        <T v="body" weight="bold">
          Why it changed
        </T>
        <View style={{ gap: 4 }}>
          <View style={styles.between}>
            <T v="small" muted>
              You ate (avg / day)
            </T>
            <T v="small" weight="bold">
              about {kcal(AVG_INTAKE)}
            </T>
          </View>
          <Bar value={AVG_INTAKE / LEARNED_BURN} color={c.sun} track={c.line} delay={400} />
        </View>
        <View style={{ gap: 4 }}>
          <View style={styles.between}>
            <T v="small" muted>
              You burn (learned)
            </T>
            <T v="small" weight="bold">
              about {kcal(LEARNED_BURN)}
            </T>
          </View>
          <Bar value={1} color={c.mint} track={c.line} delay={520} />
        </View>
        <T v="small" muted>
          Your weigh-ins show you burn a little less than our first guess of 2,350. A small trim keeps you on your 0.5 kg-a-week pace.
        </T>
      </Card>

      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        {options.map((o, i) => {
          const on = pick === o.id;
          return (
            <Animated.View key={o.id} entering={FadeInDown.duration(duration.slow).delay(1000 + i * stagger)}>
              <Press
                haptic
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPick(o.id)}
                style={[styles.option, { backgroundColor: c.surface, borderColor: on ? c.mintBorder : 'transparent' }]}
              >
                <View style={[styles.radio, { borderColor: on ? c.mintBorder : c.faint, borderWidth: on ? 7 : 2 }]} />
                <View style={{ gap: 2, flex: 1 }}>
                  <T v="body" weight="bold">
                    {o.title}
                  </T>
                  <T v="small" muted>
                    {o.note}
                  </T>
                </View>
              </Press>
            </Animated.View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  strike: { position: 'absolute', left: -2, right: -2, top: '52%', height: 3, transformOrigin: 'left' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, borderWidth: 2 },
  radio: { width: 22, height: 22, borderRadius: 11 },
});
