import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { Easing, FadeIn, FadeInDown, LinearTransition, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { IconButton } from '../src/components/IconButton';
import { Press } from '../src/components/Press';
import { Icon } from '../src/components/Icon';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp, newId } from '../src/state/AppState';
import { font } from '../src/theme/tokens';
import { shiftKey, WEEKDAYS, keyDate } from '../src/lib/dates';
import { duration } from '../src/lib/motion';
import { STRESS_TIPS, WHEN_LABEL, glucoseAdvice, heartOf, parseMmol, readingsOf, stressRead } from '../src/state/vitals';
import { connectWatch, grantedTypes } from '../src/health/watch';
import { syncNow } from '../src/health/WatchSync';
import type { GlucoseWhen, StressLevel } from '../src/state/types';

const FEEL: { level: StressLevel; label: string }[] = [
  { level: 1, label: 'Calm' },
  { level: 2, label: 'Okay' },
  { level: 3, label: 'A bit' },
  { level: 4, label: 'Stressed' },
  { level: 5, label: 'Very' },
];
const WHENS: GlucoseWhen[] = ['fasting', 'before', 'after', 'random'];

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** A soft orb that breathes in for 4 s and out for 6 s; following it is the calming exercise. */
function BreathOrb({ color, tint }: { color: string; tint: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.value = withRepeat(withSequence(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.sin) })), -1);
    return () => cancelAnimation(t);
  }, [reduce, t]);
  const outer = useAnimatedStyle(() => ({ transform: [{ scale: 0.78 + 0.22 * t.value }], opacity: 0.35 + 0.35 * t.value }));
  const inner = useAnimatedStyle(() => ({ transform: [{ scale: 0.86 + 0.14 * t.value }] }));
  return (
    <View style={styles.orbBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.orb, { width: 96, height: 96, backgroundColor: tint }, outer]} />
      <Animated.View style={[styles.orb, { width: 58, height: 58, backgroundColor: color }, inner]} />
    </View>
  );
}

/** A heart that beats at the person's resting rate. */
function Beat({ bpm, color }: { bpm: number | null; color: string }) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (reduce || !bpm) return;
    const gap = Math.max(300, 60000 / bpm - 260);
    s.value = withRepeat(withSequence(withTiming(1.22, { duration: 110 }), withTiming(0.96, { duration: 150 }), withDelay(gap, withTiming(1, { duration: 1 }))), -1);
    return () => cancelAnimation(s);
  }, [reduce, bpm, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={style}>
      <Icon name="heart" color={color} size={30} />
    </Animated.View>
  );
}

function Stat({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: c.bg }]}>
      <T v="small" size={12} muted>
        {label}
      </T>
      <T v="h2">
        {value ?? '–'}
        {value != null ? (
          <T v="small" muted>
            {' '}
            {unit}
          </T>
        ) : null}
      </T>
    </View>
  );
}

/** Seven small bars that grow in one after another. */
function MiniBars({ values, color, max }: { values: (number | null)[]; color: string; max: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  return (
    <View style={styles.bars}>
      {values.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <View style={[styles.barTrack, { backgroundColor: c.bg }]}>
            {v ? <Animated.View entering={reduce ? undefined : FadeInDown.duration(duration.slow).delay(i * 60)} style={{ height: `${Math.min(100, (v / max) * 100)}%`, borderRadius: 6, backgroundColor: i === values.length - 1 ? color : `${color}99` }} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Stress, blood sugar and heart: what the watch shared plus what the person tells us. */
export default function Vitals() {
  const { c } = useTheme();
  const { s, day, today, dispatch } = useApp();
  const router = useRouter();
  const connected = !!s.profile?.watch?.connected;
  const [needsAccess, setNeedsAccess] = useState(false);
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<'mmol' | 'mgdl'>('mmol');
  const [when, setWhen] = useState<GlucoseWhen>('fasting');
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android' || !connected) return;
    grantedTypes().then((g) => setNeedsAccess(!g.includes('BloodGlucose') || !g.includes('HeartRateVariabilityRmssd')));
  }, [connected]);

  const stress = stressRead(s.days, today);
  const readings = readingsOf(day);
  const heart = heartOf(day.watch);
  const week = Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6));
  const hrvWeek = week.map((k) => s.days[k]?.watch?.hrvMs ?? null);
  const latestCheck = stress?.checkIn?.level ?? null;

  const check = (level: StressLevel) => {
    Haptics.selectionAsync().catch(() => undefined);
    dispatch({ type: 'stressCheck', date: today, check: { at: new Date().toISOString(), level, from: 'phone' } });
  };

  const save = () => {
    const mmol = parseMmol(value, unit);
    if (mmol == null) return setProblem(unit === 'mmol' ? 'Enter a reading between 1 and 35 mmol/L.' : 'Enter a reading between 18 and 630 mg/dL.');
    dispatch({ type: 'addGlucose', date: today, reading: { id: newId('g'), at: new Date().toISOString(), mmol, when, source: 'manual' } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setValue('');
    setProblem(null);
  };

  const allow = async () => {
    const g = await connectWatch();
    setNeedsAccess(!g.includes('BloodGlucose') || !g.includes('HeartRateVariabilityRmssd'));
    await syncNow(dispatch);
  };

  const stressWord = stress ? { calm: 'Calm', usual: 'About usual', raised: 'Under some strain' }[stress.level] : 'No read yet';
  const orbColor = stress?.level === 'raised' ? c.amber : c.mint;
  const orbTint = stress?.level === 'raised' ? c.amberTint : c.mintTint;
  const urgent = readings.map((g) => glucoseAdvice(g)).find((a) => a.urgent);

  return (
    <Screen>
      <View style={styles.head}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }}>
          <T v="title" size={26}>
            Body signals
          </T>
          <T v="small" muted>
            Stays on this phone. Not a diagnosis.
          </T>
        </View>
      </View>

      {needsAccess ? (
        <Card order={0} tone="mint" style={{ gap: 8 }}>
          <T v="small" color={c.mintDeep}>
            Let PlateWise read blood sugar and heart rate variability from Health Connect too.
          </T>
          <Press onPress={allow} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
            <T v="small" weight="bold" color={c.mintText}>
              Allow in Health Connect
            </T>
          </Press>
        </Card>
      ) : null}

      <Card order={1} style={{ gap: 12 }}>
        <T v="label" muted>
          Stress
        </T>
        <View style={styles.row}>
          <BreathOrb color={orbColor} tint={orbTint} />
          <View style={{ flex: 1, gap: 4 }}>
            <Animated.View key={stressWord} entering={FadeIn.duration(duration.base)}>
              <T v="h2">{stressWord}</T>
            </Animated.View>
            <T v="small" muted>
              {stress ? (stress.reasons.length ? `Because ${stress.reasons.join(', ')}.` : 'Your watch signals look like your usual.') : connected ? 'Wear your watch to sleep for a few nights, or tell us how you feel.' : 'Tell us how you feel, or connect a watch on the Me tab.'}
            </T>
          </View>
        </View>
        {stress ? (
          <T v="small" color={stress.level === 'raised' ? c.amberText : c.mintDeep}>
            {STRESS_TIPS[stress.level]} Follow the circle: breathe in as it grows, out as it shrinks.
          </T>
        ) : null}
        <T v="small" weight="semibold">
          How stressed do you feel right now?
        </T>
        <View style={styles.feel}>
          {FEEL.map((f) => (
            <Press
              key={f.level}
              onPress={() => check(f.level)}
              haptic={false}
              accessibilityRole="button"
              accessibilityState={{ selected: latestCheck === f.level }}
              accessibilityLabel={`${f.level} of 5, ${f.label}`}
              style={[styles.feelBtn, { backgroundColor: latestCheck === f.level ? c.button : c.bg }]}
            >
              <T v="h2" color={latestCheck === f.level ? c.buttonText : c.ink}>
                {f.level}
              </T>
              <T v="small" size={11} color={latestCheck === f.level ? c.buttonText : c.muted}>
                {f.label}
              </T>
            </Press>
          ))}
        </View>
      </Card>

      <Card order={2} style={{ gap: 12 }}>
        <T v="label" muted>
          Blood sugar
        </T>
        {urgent ? (
          <View style={[styles.alert, { backgroundColor: c.amberTint, borderColor: c.amber }]}>
            <T v="small" weight="semibold" color={c.amberText}>
              {urgent.text}
            </T>
          </View>
        ) : null}
        {readings.length === 0 ? (
          <T v="small" muted>
            No readings today. Type one from your meter, or your meter app can share them through Health Connect.
          </T>
        ) : (
          readings.map((g) => {
            const a = glucoseAdvice(g);
            const usual = a.band === 'usual';
            return (
              <Animated.View key={g.id} layout={LinearTransition} entering={FadeInDown.duration(duration.base)} style={[styles.reading, { backgroundColor: c.bg }]}>
                <View style={[styles.dot, { backgroundColor: usual ? c.mint : c.amber }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="body" weight="bold">
                    {g.mmol} mmol/L{' '}
                    <T v="small" muted>
                      · {WHEN_LABEL[g.when].toLowerCase()} · {clock(g.at)}
                    </T>
                  </T>
                  {!usual && !a.urgent ? (
                    <T v="small" muted>
                      {a.text}
                    </T>
                  ) : null}
                </View>
                {g.source === 'manual' ? (
                  <IconButton icon="close" label="Remove reading" size={36} tone="clear" onPress={() => dispatch({ type: 'deleteGlucose', date: today, id: g.id })} />
                ) : (
                  <T v="small" size={11} muted>
                    meter
                  </T>
                )}
              </Animated.View>
            );
          })
        )}
        <View style={[styles.input, { backgroundColor: c.bg }]}>
          <TextInput
            value={value}
            onChangeText={(v) => {
              setValue(v);
              setProblem(null);
            }}
            placeholder={unit === 'mmol' ? '5.4' : '97'}
            placeholderTextColor={c.faint}
            keyboardType="decimal-pad"
            accessibilityLabel={`Blood sugar in ${unit === 'mmol' ? 'millimoles per litre' : 'milligrams per decilitre'}`}
            style={{ flex: 1, fontFamily: font.heavy, fontSize: 28, color: c.ink }}
          />
          <Chip label="mmol/L" selected={unit === 'mmol'} onPress={() => setUnit('mmol')} />
          <Chip label="mg/dL" selected={unit === 'mgdl'} onPress={() => setUnit('mgdl')} />
        </View>
        <View style={styles.chips}>
          {WHENS.map((w) => (
            <Chip key={w} label={WHEN_LABEL[w]} selected={when === w} onPress={() => setWhen(w)} />
          ))}
        </View>
        {problem ? (
          <T v="small" weight="semibold" color={c.amberText}>
            {problem}
          </T>
        ) : null}
        <Button label="Save reading" onPress={save} />
      </Card>

      <Card order={3} style={{ gap: 12 }}>
        <T v="label" muted>
          Heart
        </T>
        {heart ? (
          <>
            <View style={styles.row}>
              <Beat bpm={heart.resting ?? heart.avg} color={c.steps} />
              <T v="small" muted style={{ flex: 1 }}>
                {heart.resting ? `Resting ${heart.resting} bpm. ` : ''}A lower resting rate over weeks usually means fitter and more rested.
              </T>
            </View>
            <View style={styles.stats}>
              <Stat label="Resting" value={heart.resting} unit="bpm" />
              <Stat label="Average" value={heart.avg} unit="bpm" />
              <Stat label="Lowest" value={heart.min} unit="bpm" />
              <Stat label="Highest" value={heart.max} unit="bpm" />
            </View>
            {hrvWeek.some(Boolean) ? (
              <View style={{ gap: 6 }}>
                <T v="small" weight="semibold">
                  Heart rate variability{heart.hrv ? ` · ${heart.hrv} ms today` : ''}
                </T>
                <MiniBars values={hrvWeek} color={c.mint} max={Math.max(...hrvWeek.map((v) => v ?? 0), 1) * 1.1} />
                <View style={styles.bars}>
                  {week.map((k) => (
                    <T key={k} v="small" size={11} muted center style={{ flex: 1 }}>
                      {WEEKDAYS[keyDate(k).getDay()].slice(0, 1)}
                    </T>
                  ))}
                </View>
                <T v="small" muted>
                  Higher than your usual means rested; lower can mean stress, a short night or getting ill.
                </T>
              </View>
            ) : null}
          </>
        ) : (
          <T v="small" muted>
            {connected ? 'No heart data from your watch today yet.' : 'Connect a smartwatch on the Me tab to see your heart rate here.'}
          </T>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  orbBox: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  orb: { position: 'absolute', borderRadius: 60 },
  feel: { flexDirection: 'row', gap: 6 },
  feelBtn: { flex: 1, minHeight: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  alert: { borderWidth: 1.5, borderRadius: 16, padding: 12 },
  reading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 12, paddingRight: 4, borderRadius: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 64, paddingLeft: 16, paddingRight: 8, borderRadius: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stats: { flexDirection: 'row', gap: 6 },
  stat: { flex: 1, padding: 10, borderRadius: 14, gap: 2 },
  bars: { flexDirection: 'row', gap: 6 },
  barTrack: { width: '100%', height: 56, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
});
