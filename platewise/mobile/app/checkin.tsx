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
import { clampBudget, dailyBudget, formulaTdee, learnBurn, profileBudget, profileTdee } from '../src/state/calc';
import { kcal } from '../src/lib/format';
import { duration, easeOut, stagger } from '../src/lib/motion';

// Never move the budget more than ±150 kcal in one check-in (ROADMAP Phase 5).
const MAX_STEP = 150;

export default function CheckIn() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const reduce = useReducedMotion();
  const p = s.profile!;
  const learned = learnBurn(s.days, s.weights);
  const ready = !!learned && 'tdee' in learned;
  const current = profileBudget(p);
  const guess = formulaTdee(p);
  // Limit the step so the budget changes gently.
  const target = ready ? dailyBudget(p, learned.tdee) : current;
  const proposed = clampBudget(Math.min(current + MAX_STEP, Math.max(current - MAX_STEP, target)), p.sex);
  const tdeeForProposed = ready ? profileTdee(p) + (proposed - current) : null;
  const burn = ready ? learned.tdee : profileTdee(p);
  const changed = ready && proposed !== current;
  const options = ready
    ? [
        ...(changed ? [{ id: 'new', title: `Use ${kcal(proposed)} kcal`, note: 'Suggested · stays on pace' }] : []),
        { id: 'keep', title: `Keep ${kcal(current)} kcal`, note: changed ? (proposed < current ? 'Slower pace, a bit more food' : 'Faster pace, a bit less food') : 'Still right for your pace' },
        ...(p.goalKg < p.weightKg ? [{ id: 'maint', title: 'Take a maintenance week', note: `Eat at about ${kcal(clampBudget(burn, p.sex))} for a break` }] : []),
      ]
    : [{ id: 'keep', title: `Keep ${kcal(current)} kcal`, note: 'Your current budget' }];
  const [pick, setPick] = useState(options[0].id);
  const old = changed ? current : s.budgetChange?.from ?? current;
  const shown = changed ? proposed : current;

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
            if (pick === 'new' && tdeeForProposed) dispatch({ type: 'setLearnedTdee', tdee: Math.round(tdeeForProposed), reason: 'Weekly check-in from your weigh-ins' });
            if (pick === 'maint') dispatch({ type: 'maintenanceWeek', kcal: clampBudget(burn, p.sex) });
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
        <T v="title">{changed ? 'Your new daily budget' : 'Your daily budget'}</T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          {old !== shown ? (
            <Animated.View style={oldStyle}>
              <T v="title" size={26} muted>
                {kcal(old)}
              </T>
              <Animated.View style={[styles.strike, { backgroundColor: c.faint }, strikeStyle]} />
            </Animated.View>
          ) : null}
          <Odometer value={shown} size={58} color={c.mintDeep} delay={900} />
        </View>
        <T muted>kcal a day{changed ? ', starting today' : ''}</T>
      </View>

      <Card order={1} style={{ gap: 12 }}>
        <T v="body" weight="bold">
          Why it changed
        </T>
        {ready ? (
          <>
            <View style={{ gap: 4 }}>
              <View style={styles.between}>
                <T v="small" muted>
                  You ate (avg / day)
                </T>
                <T v="small" weight="bold">
                  about {kcal(learned.avgIntake)}
                </T>
              </View>
              <Bar value={learned.avgIntake / Math.max(burn, learned.avgIntake)} color={c.sun} track={c.line} delay={400} />
            </View>
            <View style={{ gap: 4 }}>
              <View style={styles.between}>
                <T v="small" muted>
                  You burn (learned)
                </T>
                <T v="small" weight="bold">
                  about {kcal(burn)}
                </T>
              </View>
              <Bar value={burn / Math.max(burn, learned.avgIntake)} color={c.mint} track={c.line} delay={520} />
            </View>
            <T v="small" muted>
              Over {learned.span} days your trend moved {learned.change > 0 ? '+' : ''}
              {learned.change.toFixed(1)} kg. That means you burn {burn < guess ? 'a little less' : 'a little more'} than our first guess of {kcal(guess)}.
              {changed ? ` We change the budget by at most ${MAX_STEP} kcal at a time.` : ''}
            </T>
          </>
        ) : (
          <T v="small" muted>
            {s.budgetChange ? `Last change: ${s.budgetChange.reason.toLowerCase()}. ` : ''}
            Your budget comes from your details for now. After two weeks of weigh-ins and at least seven logged days we learn how much you really burn.
            {learned && 'need' in learned ? ` Still needed: ${learned.need}.` : ' Log your weight a few times a week to start.'}
          </T>
        )}
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
