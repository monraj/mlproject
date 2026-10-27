import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { T } from '../../src/components/T';
import { Button } from '../../src/components/Button';
import { api, type ScanResult } from '../../src/api/client';
import { mealForHour } from '../../src/lib/format';
import { IconButton } from '../../src/components/IconButton';
import { PlateArt } from '../../src/components/PlateArt';
import { useApp } from '../../src/state/AppState';
import { useTheme } from '../../src/theme/ThemeProvider';
import { easeOut, spring } from '../../src/lib/motion';

const DARK = '#0C111D';
const STATUS = ['Finding the foods…', 'Estimating portions…', 'Matching Ghanaian dishes…'];
const MIN_MS = 2200;

type TagT = { label: string; x: number; y: number; tone: 'sun' | 'light' | 'mint' };
// Fallback spots for labels when the model gives no bounding box.
const SPOTS = [
  [0.12, 0.4],
  [0.6, 0.3],
  [0.52, 0.62],
  [0.18, 0.74],
  [0.35, 0.18],
  [0.6, 0.8],
];

function tagsFor(r: ScanResult): TagT[] {
  return r.items.slice(0, 6).map((it, i) => {
    const b = it.bbox;
    const x = b ? Math.min(0.7, Math.max(0.03, b[0])) : SPOTS[i][0];
    const y = b ? Math.min(0.88, Math.max(0.05, (b[1] + b[3]) / 2)) : SPOTS[i][1];
    return { label: it.name, x, y, tone: it.confidence === 'low' ? 'sun' : i % 2 ? 'light' : 'mint' };
  });
}

function Ripple({ delay, color }: { delay: number; color: string }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1));
  }, [reduce, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: reduce ? 0 : 0.9 * (1 - t.value), transform: [{ scale: 0.4 + 1.2 * t.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: color }, style]} />;
}

function Tag({ tag, index, w, h }: { tag: TagT; index: number; w: number; h: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    const d = 150 + index * 300;
    t.value = withDelay(d, withSpring(1, spring.drop));
    const id = setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined), d);
    return () => clearTimeout(id);
  }, [reduce, index, t]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 2),
    transform: [{ translateY: (1 - t.value) * -36 }, { scale: 0.7 + 0.3 * t.value }],
  }));
  const bg = tag.tone === 'sun' ? c.sun : tag.tone === 'mint' ? c.mintLight : '#FFFFFF';
  return (
    <Animated.View style={[styles.tag, { left: tag.x * w, top: tag.y * h, backgroundColor: bg }, style]}>
      <View style={[styles.tagDot, { backgroundColor: DARK }]} />
      <T v="small" weight="bold" color={DARK}>
        {tag.label}
      </T>
    </Animated.View>
  );
}

/** Scanning: sends the photo, ripples pulse while waiting, food labels drop in as results arrive. */
export default function Scanning() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState<TagT[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const settle = useSharedValue(reduce ? 1 : 1.08);
  const bar = useSharedValue(0.05);
  const orbit = useSharedValue(0);

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const started = Date.now();
    setError(null);
    setTags([]);
    settle.value = withTiming(1, { duration: 600, easing: easeOut });
    bar.value = 0.05;
    bar.value = withTiming(0.92, { duration: 9000, easing: easeOut });
    if (!reduce) orbit.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.linear }), -1);
    const cycle = setInterval(() => setStep((n) => (n + 1) % STATUS.length), 1200);
    const uri = s.photoUri;
    if (!uri) {
      setError('No photo to read. Take one again.');
      return () => clearInterval(cycle);
    }
    api
      .scanPhoto(uri, mealForHour(new Date().getHours()))
      .then((r) => {
        if (!alive) return;
        if (!r.isFood) {
          setError(r.note ? `No food found: ${r.note}` : 'No food found. Try again with the whole plate in view.');
          return;
        }
        dispatch({ type: 'startDraft', items: r.items, source: 'photo', photoUri: uri, note: r.note });
        const t = tagsFor(r);
        const wait = Math.max(0, MIN_MS - (Date.now() - started));
        timers.push(setTimeout(() => alive && setTags(t), wait));
        timers.push(
          setTimeout(() => {
            if (!alive) return;
            bar.value = withTiming(1, { duration: 200 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
            router.replace('/scan/review');
          }, wait + (reduce ? 300 : 500 + t.length * 300)),
        );
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
      clearInterval(cycle);
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const photoStyle = useAnimatedStyle(() => ({ transform: [{ scale: settle.value }] }));
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: bar.value }] }));
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value * 360}deg` }] }));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <IconButton icon="close" label="Cancel scan" tone="dark" onPress={() => router.replace('/scan/camera')} />
        <T v="h2" color="#FFFFFF">
          Reading your plate
        </T>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.frame} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, photoStyle]}>
          {s.photoUri ? <Image source={{ uri: s.photoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <PlateArt size={300} />}
        </Animated.View>
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <Ripple delay={0} color={c.mintLight} />
          <Ripple delay={700} color="#FFFFFF" />
          <Ripple delay={1400} color={c.sun} />
          <Animated.View style={[styles.orbit, orbitStyle]}>
            <View style={[styles.spark, { backgroundColor: c.sun }]} />
          </Animated.View>
        </View>
        {box.w > 0 && tags.map((t, i) => <Tag key={`${t.label}${i}`} tag={t} index={i} w={box.w} h={box.h} />)}
      </View>

      {error ? (
        <View style={{ gap: 12 }} accessibilityLiveRegion="polite">
          <T v="title" size={22} color="#FFFFFF">
            Couldn’t read the plate
          </T>
          <T v="small" color="#CECFD2">
            {error}
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Type it instead" kind="ghost" fgColor="#FFFFFF" onPress={() => router.replace('/type')} style={{ borderWidth: 1, borderColor: '#667085' }} />
            <Button label="Try again" grow bgColor="#FFFFFF" fgColor="#101828" onPress={() => setAttempt((n) => n + 1)} />
          </View>
        </View>
      ) : (
      <View style={{ gap: 12 }}>
        <View style={{ height: 30 }} accessibilityLiveRegion="polite">
          <Animated.View key={step} entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
            <T v="title" size={22} color="#FFFFFF">
              {STATUS[step]}
            </T>
          </Animated.View>
        </View>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { backgroundColor: c.mintLight }, barStyle]} />
        </View>
        <T v="small" color="#94969C">
          Usually a few seconds. Your photo is used for this scan only and isn’t stored.
        </T>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DARK, paddingHorizontal: 18, gap: 20 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  frame: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: '#1F242F' },
  center: { alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 3 },
  orbit: { position: 'absolute', width: 270, height: 270 },
  spark: { position: 'absolute', top: 0, left: 127, width: 16, height: 16, borderRadius: 8 },
  tag: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  tagDot: { width: 7, height: 7, borderRadius: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#1F242F', overflow: 'hidden' },
  fill: { height: 6, width: '100%', borderRadius: 3, transformOrigin: 'left' },
});
