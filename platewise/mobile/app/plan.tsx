import React, { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { Easing, FadeIn, FadeInDown, cancelAnimation, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { IconButton } from '../src/components/IconButton';
import { Press } from '../src/components/Press';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { duration } from '../src/lib/motion';
import { askPermission } from '../src/lib/reminders';
import { FASTING_BLOCK_TEXT, fastingBlock, fastingPlanAllowed, mustBreakFast } from '../src/state/calc';
import { AVOID, DEFAULT_FASTING, FAST_TIPS, HERBS, PLANS, TRADITIONAL, eatUntil, fastWindow } from '../src/state/fasting';
import { readingsOf } from '../src/state/vitals';
import { food } from '../src/data/foods';
import type { DiabetesMeds, Fasting } from '../src/state/types';

const ACircle = Animated.createAnimatedComponent(Circle);
const SIZE = 220;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const LEN = 2 * Math.PI * R;

const START_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
const MEDS: { id: DiabetesMeds; label: string }[] = [
  { id: 'none', label: 'No diabetes medicine' },
  { id: 'metformin', label: 'Metformin only' },
  { id: 'other', label: 'Insulin or other tablets' },
];

const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const span = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`);

/** The day as a ring: the eating window fills in mint, the fast in a calm night colour, with a slow pulse. */
function FastRing({ progress, eating, label, sub }: { progress: number; eating: boolean; label: string; sub: string }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? progress : 0);
  const glow = useSharedValue(0);
  useEffect(() => {
    p.value = reduce ? progress : withTiming(progress, { duration: duration.slow * 2, easing: Easing.out(Easing.cubic) });
  }, [progress, reduce, p]);
  useEffect(() => {
    if (reduce) return;
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })), -1);
    return () => cancelAnimation(glow);
  }, [reduce, glow]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: LEN * (1 - p.value) }));
  const halo = useAnimatedStyle(() => ({ opacity: 0.25 + 0.35 * glow.value, transform: [{ scale: 0.96 + 0.04 * glow.value }] }));
  const color = eating ? c.mint : c.water;
  return (
    <View style={styles.ringBox} accessible accessibilityRole="progressbar" accessibilityLabel={`${label}. ${sub}`}>
      <Animated.View style={[styles.halo, { backgroundColor: eating ? c.mintTint : c.surface }, halo]} />
      <Svg width={SIZE} height={SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={c.line} strokeWidth={STROKE} fill="none" />
        <ACircle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round" strokeDasharray={LEN} animatedProps={arc} />
      </Svg>
      <View style={styles.ringText}>
        <Animated.View key={label} entering={FadeIn.duration(duration.base)} style={{ alignItems: 'center' }}>
          <T v="label" muted>
            {eating ? 'Eating window' : 'Fasting'}
          </T>
          <T v="title" size={28}>
            {label}
          </T>
          <T v="small" muted>
            {sub}
          </T>
        </Animated.View>
      </View>
    </View>
  );
}

export default function Plan() {
  const { c } = useTheme();
  const router = useRouter();
  const { s, day, dispatch } = useApp();
  const p = s.profile;
  const f: Fasting = { ...DEFAULT_FASTING, ...p?.fasting };
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!p) return null;

  const diabetes = !!p.health?.diabetes;
  const block = fastingBlock(p, f);
  const patch = (x: Partial<Fasting>) => {
    const next = { ...f, ...x };
    // A plan that's no longer allowed falls back to the gentlest one.
    if (!fastingPlanAllowed(next.plan, diabetes, next.doctorOk)) next.plan = '12:12';
    if (fastingBlock(p, next)) next.on = false;
    dispatch({ type: 'patchProfile', patch: { fasting: next } });
  };
  const toggle = async (on: boolean) => {
    if (on && f.remind) await askPermission();
    Haptics.selectionAsync().catch(() => undefined);
    patch({ on });
  };

  const w = fastWindow(f, now);
  const low = readingsOf(day).find((g) => mustBreakFast(g.mmol) && now.getTime() - new Date(g.at).getTime() < 3 * 3600000);

  return (
    <Screen>
      <View style={styles.head}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <T v="title" size={26}>
            Fasting and food plan
          </T>
          <T v="small" muted>
            Guidance from Ghana’s own kitchen. Not medical advice.
          </T>
        </View>
      </View>

      {low ? (
        <Card order={0} tone="amber" style={{ gap: 4 }}>
          <T v="body" weight="bold" color={c.amberText}>
            Your sugar was {low.mmol} mmol/L. End the fast now.
          </T>
          <T v="small" color={c.amberText}>
            Have 15 g of fast sugar (half a glass of juice or 3 sugar cubes), recheck in 15 minutes, then eat a meal.
          </T>
        </Card>
      ) : null}

      <Card order={1} style={{ gap: 14 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="body" weight="semibold">
              Time-restricted eating
            </T>
            <T v="small" muted>
              Eat within a window each day. It can help with weight and blood sugar, but it’s optional.
            </T>
          </View>
          <Switch value={f.on && !block} disabled={!!block} onValueChange={toggle} trackColor={{ true: c.mintBorder, false: c.line }} thumbColor="#FFFFFF" accessibilityLabel="Time-restricted eating" />
        </View>

        {block ? (
          <Animated.View entering={FadeInDown.duration(duration.base)} style={[styles.note, { backgroundColor: c.amberTint, borderColor: c.amber }]}>
            <T v="small" weight="semibold" color={c.amberText}>
              {FASTING_BLOCK_TEXT[block]}
            </T>
          </Animated.View>
        ) : null}

        <T v="small" weight="semibold">
          A few questions first
        </T>
        <View style={styles.chips}>
          {MEDS.map((m) => (
            <Chip key={m.id} label={m.label} selected={f.meds === m.id} onPress={() => patch({ meds: m.id })} />
          ))}
        </View>
        <View style={styles.chips}>
          <Chip label="I’ve had an eating disorder" selected={f.eatingDisorder} onPress={() => patch({ eatingDisorder: !f.eatingDisorder })} />
          {f.meds !== 'none' || diabetes ? <Chip label="My doctor agreed to fasting" selected={f.doctorOk} onPress={() => patch({ doctorOk: !f.doctorOk })} /> : null}
        </View>
      </Card>

      {f.on && !block ? (
        <>
          <Card order={2} style={{ gap: 14, alignItems: 'center' }}>
            <FastRing progress={w.progress} eating={w.eating} label={span(w.minutesLeft)} sub={w.eating ? `left · closes ${clock(w.end)}` : `to go · eat from ${clock(w.end)}`} />
            <T v="small" muted style={{ textAlign: 'center' }}>
              Eat from {f.eatFrom} to {eatUntil(f)}.{' '}
              {w.eating ? 'Water, protein and greens first.' : 'Water, plain tea and unsweetened sobolo are fine.'}
            </T>
          </Card>

          <Card order={3} style={{ gap: 10 }}>
            <T v="label" muted>
              Your window
            </T>
            <View style={styles.chips}>
              {PLANS.map((x) => {
                const ok = fastingPlanAllowed(x.plan, diabetes, f.doctorOk);
                return <Chip key={x.plan} label={x.label} selected={f.plan === x.plan} onPress={() => (ok ? patch({ plan: x.plan }) : undefined)} />;
              })}
            </View>
            <T v="small" muted>
              {PLANS.find((x) => x.plan === f.plan)?.detail}
              {diabetes && !f.doctorOk ? ' With diabetes, PlateWise keeps to 12 hours until your doctor agrees to longer.' : ''}
            </T>
            <T v="small" weight="semibold">
              First meal at
            </T>
            <View style={styles.chips}>
              {START_TIMES.map((t) => (
                <Chip key={t} label={t} selected={f.eatFrom === t} onPress={() => patch({ eatFrom: t })} />
              ))}
            </View>
            <View style={styles.switchRow}>
              <T v="small" weight="semibold" style={{ flex: 1 }}>
                Remind me when the window opens and closes
              </T>
              <Switch value={f.remind} onValueChange={(v) => patch({ remind: v })} trackColor={{ true: c.mintBorder, false: c.line }} thumbColor="#FFFFFF" accessibilityLabel="Fasting reminders" />
            </View>
          </Card>

          <Card order={4} style={{ gap: 8 }}>
            <T v="label" muted>
              Fasting safely
            </T>
            {FAST_TIPS.map((t) => (
              <View key={t} style={styles.bullet}>
                <View style={[styles.dot, { backgroundColor: c.mint }]} />
                <T v="small" style={{ flex: 1 }}>
                  {t}
                </T>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <Card order={5} style={{ gap: 10 }}>
        <T v="label" muted>
          Traditional foods that help
        </T>
        {TRADITIONAL.map((t, i) => {
          const fd = food(t.foodId);
          if (!fd) return null;
          return (
            <Animated.View key={t.foodId} entering={FadeInDown.delay(i * 40).duration(duration.base)} style={[styles.row, { backgroundColor: c.bg }]}>
              <View style={[styles.swatch, { backgroundColor: [c.mint, c.greens, c.steps, c.water][i % 4] }]} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="body" weight="bold">
                  {fd.name}
                </T>
                <T v="small" muted>
                  {t.why}
                </T>
              </View>
            </Animated.View>
          );
        })}
      </Card>

      <Card order={6} style={{ gap: 10 }}>
        <T v="label" muted>
          Herbs and drinks
        </T>
        <T v="small" muted>
          These can sit alongside good meals and your medicine. None of them cures diabetes or melts fat.
        </T>
        {HERBS.map((h) => {
          const isOpen = open === h.id;
          return (
            <Press key={h.id} onPress={() => setOpen(isOpen ? null : h.id)} haptic={false} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={[styles.herb, { backgroundColor: c.bg }]}>
              <View style={styles.switchRow}>
                <T v="body" weight="bold" style={{ flex: 1 }}>
                  {h.name}
                </T>
                <View style={[styles.badge, { backgroundColor: h.evidence === 'some' ? c.mintTint : c.surface }]}>
                  <T v="small" size={11} weight="bold" color={h.evidence === 'some' ? c.mintDeep : c.muted}>
                    {h.evidence === 'some' ? 'Some evidence' : 'Limited evidence'}
                  </T>
                </View>
              </View>
              <T v="small" muted>
                {h.use}
              </T>
              {isOpen ? (
                <Animated.View entering={FadeInDown.duration(duration.fast)}>
                  <T v="small" weight="semibold" color={c.amberText}>
                    Careful: {h.careful}
                  </T>
                </Animated.View>
              ) : (
                <T v="small" weight="bold" color={c.mintText}>
                  When to be careful
                </T>
              )}
            </Press>
          );
        })}
      </Card>

      <Card order={7} tone="amber" style={{ gap: 8 }}>
        <T v="label" color={c.amberText}>
          Best avoided
        </T>
        {AVOID.map((t) => (
          <T key={t} v="small" color={c.amberText}>
            {t}
          </T>
        ))}
      </Card>

      <Button label="See today’s meal ideas" kind="secondary" onPress={() => router.push('/fits')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { borderWidth: 1.5, borderRadius: 16, padding: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ringBox: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: SIZE - 40, height: SIZE - 40, borderRadius: SIZE },
  ringText: { position: 'absolute', alignItems: 'center' },
  bullet: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16 },
  swatch: { width: 10, height: 36, borderRadius: 5 },
  herb: { padding: 12, borderRadius: 16, gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
});
