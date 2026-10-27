import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { T } from '../src/components/T';
import { Ring } from '../src/components/Ring';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { easeOut, spring } from '../src/lib/motion';

const SIZE = 210;
const R = SIZE / 2;

/**
 * Launch: a mint blob springs in and wobbles into a circle, a plate settles inside,
 * the ring draws to today's progress, three foods drop on, a sun spark orbits once,
 * then the wordmark slides up out of a slot. Tap anywhere to skip.
 */
export default function Launch() {
  const { c, isDark } = useTheme();
  const { s, eatenKcal, budget, dispatch } = useApp();
  const router = useRouter();
  const reduce = useReducedMotion();
  const done = useRef(false);
  const wantGo = useRef(false);

  const blob = useSharedValue(reduce ? 1 : 0);
  const tl = useSharedValue(R);
  const tr = useSharedValue(R);
  const br = useSharedValue(R);
  const bl = useSharedValue(R);
  const plate = useSharedValue(reduce ? 1 : 0);
  const d1 = useSharedValue(reduce ? 1 : 0);
  const d2 = useSharedValue(reduce ? 1 : 0);
  const d3 = useSharedValue(reduce ? 1 : 0);
  const orbit = useSharedValue(0);
  const spark = useSharedValue(0);
  const word = useSharedValue(reduce ? 0 : 1);
  const tag = useSharedValue(reduce ? 1 : 0);

  // Timers below hold an old copy of `go`, so read the latest state through a ref.
  const latest = useRef(s);
  latest.current = s;
  const go = () => {
    wantGo.current = true;
    const cur = latest.current;
    if (done.current || !cur.hydrated) return; // wait until the saved log has loaded
    done.current = true;
    dispatch({ type: 'launched' });
    router.replace(cur.profile ? '/today' : '/onboarding');
  };

  useEffect(() => {
    if (s.hydrated && wantGo.current) go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.hydrated]);

  useEffect(() => {
    if (reduce) {
      const t = setTimeout(go, 700);
      return () => clearTimeout(t);
    }
    blob.value = withSpring(1, { damping: 9, stiffness: 140 });
    const wobble = (a: number, b: number) =>
      withSequence(
        withTiming(a, { duration: 220, easing: Easing.out(Easing.quad) }),
        withTiming(b, { duration: 220, easing: Easing.inOut(Easing.quad) }),
        withTiming(R, { duration: 300, easing: easeOut }),
      );
    tl.value = wobble(R * 0.84, R * 1.1);
    tr.value = wobble(R * 1.16, R * 0.9);
    br.value = wobble(R * 0.9, R * 1.12);
    bl.value = wobble(R * 1.1, R * 0.86);
    plate.value = withDelay(500, withSpring(1, spring.pop));
    d1.value = withDelay(900, withSpring(1, spring.drop));
    d2.value = withDelay(1010, withSpring(1, spring.drop));
    d3.value = withDelay(1120, withSpring(1, spring.drop));
    spark.value = withDelay(1000, withSequence(withTiming(1, { duration: 200 }), withDelay(1100, withTiming(0, { duration: 300 }))));
    orbit.value = withDelay(1000, withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }));
    word.value = withDelay(1300, withTiming(0, { duration: 600, easing: easeOut }));
    tag.value = withDelay(1650, withTiming(1, { duration: 400 }));
    const t = setTimeout(go, s.launchedOnce ? 900 : 2700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const blobStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blob.value }],
    borderTopLeftRadius: tl.value,
    borderTopRightRadius: tr.value,
    borderBottomRightRadius: br.value,
    borderBottomLeftRadius: bl.value,
  }));
  const plateStyle = useAnimatedStyle(() => ({ transform: [{ scale: plate.value }], opacity: Math.min(1, plate.value * 2) }));
  const drop = (v: { value: number }) =>
    useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 2), transform: [{ translateY: (1 - v.value) * -70 }, { scale: 0.6 + 0.4 * v.value }] }));
  const s1 = drop(d1);
  const s2 = drop(d2);
  const s3 = drop(d3);
  const orbitStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${orbit.value * 360}deg` }], opacity: spark.value }));
  const wordStyle = useAnimatedStyle(() => ({ transform: [{ translateY: word.value * 60 }] }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tag.value, transform: [{ translateY: (1 - tag.value) * 8 }] }));

  return (
    <Pressable style={[styles.root, { backgroundColor: c.bg }]} onPress={go} accessibilityLabel="PlateWise. Tap to continue">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ width: SIZE, height: SIZE }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.mint }, blobStyle]} />
        <Animated.View style={[styles.orbit, orbitStyle]} pointerEvents="none">
          <View style={[styles.spark, { backgroundColor: c.sun }]} />
        </Animated.View>
        <Animated.View style={[styles.center, plateStyle]}>
          <Ring size={186} stroke={8} progress={Math.min(1, eatenKcal / budget)} color="#FFFFFF" track="rgba(255,255,255,0.25)" delay={reduce ? 0 : 700} ms={900}>
            <View style={[styles.plate, { backgroundColor: c.raised }]}>
              <View style={[styles.rim, { borderColor: c.line }]} />
            </View>
          </Ring>
        </Animated.View>
        <Animated.View style={[styles.dot, { left: 72, top: 82, width: 40, height: 40, borderRadius: 20, backgroundColor: c.ink }, s1]} />
        <Animated.View style={[styles.dot, { left: 118, top: 76, width: 26, height: 26, borderRadius: 13, backgroundColor: c.sun }, s2]} />
        <Animated.View style={[styles.dot, { left: 100, top: 124, width: 48, height: 20, borderRadius: 10, backgroundColor: c.mint }, s3]} />
      </View>

      <View style={{ alignItems: 'center', gap: 8, marginTop: 36 }}>
        <View style={{ height: 56, overflow: 'hidden' }}>
          <Animated.View style={[{ flexDirection: 'row' }, wordStyle]}>
            <T v="display" size={44} style={{ lineHeight: 56 }}>
              plate
            </T>
            <T v="display" size={44} color={c.mintBorder} style={{ lineHeight: 56 }}>
              wise
            </T>
          </Animated.View>
        </View>
        <Animated.View style={tagStyle}>
          <T v="body" weight="semibold" muted>
            Snap your food. Know your day.
          </T>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', left: 12, top: 12, width: 186, height: 186 },
  plate: { width: 144, height: 144, borderRadius: 72, alignItems: 'center', justifyContent: 'center' },
  rim: { width: 112, height: 112, borderRadius: 56, borderWidth: 3 },
  dot: { position: 'absolute' },
  orbit: { position: 'absolute', left: -26, top: -26, width: SIZE + 52, height: SIZE + 52 },
  spark: { position: 'absolute', left: (SIZE + 52) / 2 - 8, top: 0, width: 16, height: 16, borderRadius: 8 },
});
