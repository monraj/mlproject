import React, { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { Easing, FadeIn, FadeInDown, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { IconButton } from '../src/components/IconButton';
import { Chip } from '../src/components/Chip';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { buildReport, reportFacts, type ReportPart } from '../src/state/report';
import { rewriteReport, rewriterName } from '../src/ai/assist';
import { duration, spring, stagger } from '../src/lib/motion';
import { longDate } from '../src/lib/format';
import { keyDate } from '../src/lib/dates';

const PARTS: { part: ReportPart; label: string }[] = [
  { part: 'now', label: 'Right now' },
  { part: 'afternoon', label: 'Afternoon' },
  { part: 'evening', label: 'Evening' },
];

/** A sun that rises for the afternoon report, or a moon for the evening; both glow softly. */
function Sky({ evening }: { evening: boolean }) {
  const reduce = useReducedMotion();
  const rise = useSharedValue(reduce ? 0 : 40);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    rise.value = 40;
    rise.value = withSpring(0, spring.sheet);
    glow.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(glow);
  }, [evening, reduce, rise, glow]);
  const body = useAnimatedStyle(() => ({ transform: [{ translateY: rise.value }] }));
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.12 * glow.value }], opacity: 0.25 + 0.2 * glow.value }));
  const color = evening ? '#D0D5DD' : '#FDB022';
  return (
    <View style={styles.sky} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.sun, { width: 84, height: 84, backgroundColor: color }, halo, body]} />
      <Animated.View style={[styles.sun, { width: 52, height: 52, backgroundColor: color }, body]}>
        {evening ? <View style={[styles.bite, { backgroundColor: '#101828' }]} /> : null}
      </Animated.View>
    </View>
  );
}

/** The afternoon or evening summary, or one made on demand. */
export default function ReportScreen() {
  const { c } = useTheme();
  const { s, today, budget } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ part?: string }>();
  const [part, setPart] = useState<ReportPart>(params.part === 'afternoon' || params.part === 'evening' ? params.part : 'now');
  const [words, setWords] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const report = useMemo(() => (s.profile ? buildReport(s.profile, s.days, s.weights, today, budget, part) : null), [s.profile, s.days, s.weights, today, budget, part]);
  const writer = rewriterName();

  useEffect(() => {
    setWords(null);
    setProblem(null);
  }, [part]);

  if (!report) return null;
  const evening = part === 'evening' || (part === 'now' && new Date().getHours() >= 18);
  const dot = { good: c.mint, info: c.water, tip: c.amber } as const;

  const write = async () => {
    setWriting(true);
    setProblem(null);
    setWords('');
    try {
      setWords(await rewriteReport(reportFacts(report), setWords));
    } catch (e) {
      setWords(null);
      setProblem(e instanceof Error ? e.message : 'Could not write the summary. Try again.');
    } finally {
      setWriting(false);
    }
  };

  const share = () => void Share.share({ message: words || reportFacts(report) });

  return (
    <Screen>
      <View style={styles.head}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <IconButton icon="share" label="Share summary" onPress={share} />
      </View>

      <View style={[styles.hero, { backgroundColor: '#101828' }]}>
        <Sky evening={evening} />
        <View style={{ flex: 1, gap: 4 }}>
          <Animated.View key={report.title} entering={FadeIn.duration(duration.base)}>
            <T v="title" size={26} color="#FFFFFF">
              {report.title}
            </T>
          </Animated.View>
          <T v="small" color="#D0D5DD">
            {longDate(keyDate(today))}
          </T>
        </View>
      </View>

      <View style={styles.chips}>
        {PARTS.map((x) => (
          <Chip key={x.part} label={x.label} selected={part === x.part} onPress={() => setPart(x.part)} />
        ))}
      </View>

      {report.urgent ? (
        <Card tone="amber">
          <T v="small" weight="semibold" color={c.amberText}>
            {report.urgent}
          </T>
        </Card>
      ) : null}

      {words != null ? (
        <Card tone="mint" style={{ gap: 6 }}>
          <T v="label" color={c.mintDeep}>
            In a few words · {writer}
          </T>
          <T v="body" color={c.mintDeep}>
            {words || '…'}
          </T>
        </Card>
      ) : null}

      <View key={part} style={{ gap: 8 }}>
        {report.lines.map((l, i) => (
          <Animated.View key={l.key} entering={FadeInDown.duration(duration.slow).delay(i * stagger)} style={[styles.line, { backgroundColor: c.surface }]}>
            <View style={[styles.dot, { backgroundColor: dot[l.tone] }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="small" size={12} weight="bold" muted>
                {l.label}
              </T>
              <T v="body">{l.text}</T>
            </View>
          </Animated.View>
        ))}
      </View>

      {report.wins.length ? (
        <Card order={report.lines.length} tone="mint" style={{ gap: 6 }}>
          <T v="label" color={c.mintDeep}>
            Wins
          </T>
          {report.wins.map((w) => (
            <T key={w} v="small" color={c.mintDeep}>
              ✓ {w}
            </T>
          ))}
        </Card>
      ) : null}

      {report.next.length ? (
        <Card order={report.lines.length + 1} style={{ gap: 8 }}>
          <T v="label" muted>
            {evening ? 'For tomorrow' : 'Next'}
          </T>
          {report.next.map((n, i) => (
            <View key={n} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.num, { backgroundColor: c.button }]}>
                <T v="small" size={12} weight="bold" color={c.buttonText}>
                  {i + 1}
                </T>
              </View>
              <T v="small" style={{ flex: 1 }}>
                {n}
              </T>
            </View>
          ))}
        </Card>
      ) : null}

      {problem ? (
        <T v="small" weight="semibold" color={c.amberText}>
          {problem}
        </T>
      ) : null}
      {writer ? (
        <Button label={writing ? 'Writing…' : words ? 'Write it again' : 'Write it in friendly words'} onPress={() => void (writing ? undefined : write())} kind="secondary" />
      ) : (
        <T v="small" muted>
          To have AI write this in friendly words, set up an AI on the Me tab. Only these facts are shared: no name, email or photos.
        </T>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 24, overflow: 'hidden' },
  sky: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  sun: { position: 'absolute', borderRadius: 50, overflow: 'hidden' },
  bite: { position: 'absolute', width: 44, height: 44, borderRadius: 22, top: -8, right: -12 },
  chips: { flexDirection: 'row', gap: 6 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 20 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  num: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
