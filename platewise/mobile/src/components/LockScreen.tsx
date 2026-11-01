import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { T } from './T';
import { Press } from './Press';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { duration, easeInOut, easeOut, spring, stagger } from '../lib/motion';
import { signOut, type Account } from '../state/accounts';
import { biometricKind, unlock, type BiometricKind } from '../lib/biometric';

const ACircle = Animated.createAnimatedComponent(Circle);

type Phase = 'asking' | 'idle' | 'failed' | 'opening';

// Sizes of the centre piece: the person's initial on a plate, a ring that fills when unlocked,
// and four habit dots (protein, greens, water, steps) orbiting like food around a plate.
const DISC = 104;
const RING = 148;
const RING_STROKE = 5;
const ORBIT = 216;
const DOT = 12;

const greeting = (h = new Date().getHours()) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');

/** Covers the app until the person unlocks with their fingerprint, face or phone PIN. */
export function LockScreen({ account, onUnlock }: { account: Account; onUnlock: () => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('asking');
  const [kind, setKind] = useState<BiometricKind>(null);
  const asking = useRef(false);

  // Background, orbit and the waiting pulse loop for as long as the screen shows.
  const drift = useSharedValue(0);
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);
  // 0..1 as the ring fills on success; the shake on a miss; the exit as the app is revealed.
  const fill = useSharedValue(0);
  const shake = useSharedValue(0);
  const open = useSharedValue(0);
  const mark = useSharedValue(0);

  useEffect(() => {
    void biometricKind().then(setKind);
    if (reduce) return;
    drift.value = withRepeat(withTiming(1, { duration: 9000, easing: easeInOut }), -1, true);
    spin.value = withRepeat(withTiming(1, { duration: 16000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false);
    return () => [drift, spin, pulse].forEach(cancelAnimation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  const finish = () => onUnlock();

  const opened = () => {
    setPhase('opening');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (reduce) {
      onUnlock();
      return;
    }
    // Ring fills, the initial turns into a tick, then the cover lifts away to show the app.
    fill.value = withTiming(1, { duration: duration.slow, easing: easeOut });
    mark.value = withDelay(duration.base, withSpring(1, spring.pop));
    open.value = withDelay(
      duration.slow + duration.base,
      withTiming(1, { duration: duration.slow, easing: easeOut }, (done) => {
        if (done) runOnJS(finish)();
      }),
    );
  };

  const missed = () => {
    setPhase('failed');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    if (reduce) return;
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 70 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    );
  };

  const ask = async () => {
    if (asking.current || phase === 'opening') return;
    asking.current = true;
    setPhase('asking');
    const ok = await unlock(`Unlock ${account.name}’s PlateWise`);
    asking.current = false;
    if (ok) opened();
    else missed();
  };

  useEffect(() => {
    void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Soft mint light drifting behind everything.
  const blobA = useAnimatedStyle(() => ({ transform: [{ translateX: -40 + drift.value * 80 }, { translateY: -30 + drift.value * 50 }, { scale: 1 + drift.value * 0.15 }] }));
  const blobB = useAnimatedStyle(() => ({ transform: [{ translateX: 50 - drift.value * 90 }, { translateY: 40 - drift.value * 60 }, { scale: 1.1 - drift.value * 0.15 }] }));
  const blobC = useAnimatedStyle(() => ({ transform: [{ translateX: drift.value * 40 }, { translateY: 30 - drift.value * 30 }], opacity: 0.55 + drift.value * 0.3 }));

  const orbit = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }], opacity: 1 - open.value }));
  const waveA = useAnimatedStyle(() => ({ opacity: phase === 'asking' ? 0.35 * (1 - pulse.value) : 0, transform: [{ scale: 1 + pulse.value * 0.55 }] }));
  const waveB = useAnimatedStyle(() => {
    const t = (pulse.value + 0.5) % 1;
    return { opacity: phase === 'asking' ? 0.3 * (1 - t) : 0, transform: [{ scale: 1 + t * 0.55 }] };
  });
  const centre = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }, { scale: 1 + open.value * 0.12 }] }));
  const initialStyle = useAnimatedStyle(() => ({ opacity: 1 - mark.value, transform: [{ scale: 1 - mark.value * 0.4 }] }));
  const tickStyle = useAnimatedStyle(() => ({ opacity: mark.value, transform: [{ scale: 0.4 + mark.value * 0.6 }] }));
  const cover = useAnimatedStyle(() => ({ opacity: 1 - open.value, transform: [{ scale: 1 + open.value * 0.06 }] }));
  // While waiting, a short arc runs round the ring; on success it grows into the full circle.
  const ringProps = useAnimatedProps(() => {
    const circ = 2 * Math.PI * ((RING - RING_STROKE) / 2);
    const len = phase === 'opening' ? fill.value : 0.18;
    return { strokeDasharray: [circ * len, circ], strokeDashoffset: phase === 'opening' ? 0 : -circ * spin.value * 4 };
  });

  const big = Math.max(width, height);
  const dots = [c.protein, c.greens, c.water, c.steps];
  const words =
    phase === 'failed'
      ? 'That didn’t work. Try again, or use your phone PIN.'
      : phase === 'opening'
        ? 'Welcome back'
        : kind === 'face'
          ? 'Look at your phone to unlock'
          : kind
            ? 'Touch the fingerprint sensor to unlock'
            : 'Use your phone PIN to unlock';

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: c.bg }, cover]} accessibilityViewIsModal>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Glow style={[styles.blob, { top: -big * 0.18, left: -big * 0.25, width: big * 0.8, height: big * 0.8 }, blobA]} color={c.mint} opacity={0.32} id="a" />
        <Glow style={[styles.blob, { bottom: -big * 0.2, right: -big * 0.3, width: big * 0.9, height: big * 0.9 }, blobB]} color={c.mintLight} opacity={0.4} id="b" />
        <Glow style={[styles.blob, { top: height * 0.12, right: -big * 0.1, width: big * 0.35, height: big * 0.35 }, blobC]} color={c.sun} opacity={0.22} id="c" />
      </View>

      <Animated.View entering={reduce ? undefined : FadeInDown.duration(duration.slow).easing(easeOut)} style={{ alignItems: 'center', gap: 4 }}>
        <T v="small" weight="bold" color={c.mintText}>
          PLATEWISE IS LOCKED
        </T>
        <T v="title" size={28} center>
          {greeting()}, {account.name}
        </T>
      </Animated.View>

      <Animated.View entering={reduce ? undefined : FadeIn.delay(stagger).duration(duration.slow)} style={[styles.stage, centre]}>
        <Animated.View style={[styles.wave, { borderColor: c.mint }, waveA]} />
        <Animated.View style={[styles.wave, { borderColor: c.mint }, waveB]} />
        <Animated.View style={[styles.orbit, orbit]} pointerEvents="none">
          {dots.map((col, i) => {
            const a = (i / dots.length) * Math.PI * 2;
            const r = ORBIT / 2 - DOT;
            return <View key={col} style={[styles.dot, { backgroundColor: col, left: ORBIT / 2 + Math.cos(a) * r - DOT / 2, top: ORBIT / 2 + Math.sin(a) * r - DOT / 2 }]} />;
          })}
        </Animated.View>
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill as object}>
          <Circle cx={RING / 2} cy={RING / 2} r={(RING - RING_STROKE) / 2} stroke={c.line} strokeWidth={RING_STROKE} fill="none" />
          <ACircle
            cx={RING / 2}
            cy={RING / 2}
            r={(RING - RING_STROKE) / 2}
            stroke={c.mint}
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            fill="none"
            rotation={-90}
            origin={`${RING / 2}, ${RING / 2}`}
            animatedProps={ringProps}
          />
        </Svg>
        <View style={[styles.disc, { backgroundColor: c.mintTint, borderColor: c.raised }]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.centred, initialStyle]}>
            <T v="title" size={44} weight="heavy" color={c.mintDeep}>
              {(account.name || 'M')[0].toUpperCase()}
            </T>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.centred, tickStyle]}>
            <Icon name="check" size={44} color={c.mintDeep} strokeWidth={3} />
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View entering={reduce ? undefined : FadeInDown.delay(stagger * 2).duration(duration.slow).easing(easeOut)} style={styles.bottom}>
        <T v="body" muted center accessibilityLiveRegion="polite">
          {words}
        </T>
        <Press onPress={() => void ask()} accessibilityRole="button" accessibilityLabel="Unlock" haptic style={[styles.unlock, { backgroundColor: c.button }]}>
          <Glyph kind={kind} color={c.buttonText} />
          <T v="body" weight="bold" color={c.buttonText}>
            {phase === 'asking' ? 'Waiting…' : 'Unlock'}
          </T>
        </Press>
        <Press onPress={() => void signOut()} accessibilityRole="button" style={styles.switch}>
          <T v="small" weight="bold" muted>
            Not {account.name}? Switch person
          </T>
        </Press>
      </Animated.View>
    </Animated.View>
  );
}

/** A soft round light, drawn as a radial gradient so it has no hard edge. */
function Glow({ style, color, opacity, id }: { style: object; color: string; opacity: number; id: string }) {
  return (
    <Animated.View style={style}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`glow-${id}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill={`url(#glow-${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Fingerprint or face, matching what the phone unlocks with. */
function Glyph({ kind, color }: { kind: BiometricKind; color: string }) {
  const p = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, fill: 'none' };
  if (kind === 'face')
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" {...p} />
        <Path d="M9 9.5v1M15 9.5v1M12 9.5v3.5h-1M9.5 16c1.4 1 3.6 1 5 0" {...p} />
      </Svg>
    );
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path d="M6.5 5.5A8 8 0 0 1 20 11.5v1" {...p} />
      <Path d="M4 9.5a8 8 0 0 0-.2 4" {...p} />
      <Path d="M8 18.5a12 12 0 0 1-1.5-6.5 5.5 5.5 0 0 1 11 0c0 1.2 0 2.4-.3 3.5" {...p} />
      <Path d="M12 12c0 3-.8 5.6-2.2 7.8M15.2 17.5c-.4 1.3-1 2.5-1.7 3.5" {...p} />
      <Path d="M9 12a3 3 0 0 1 6 0" {...p} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'space-between', paddingTop: 96, paddingBottom: 48, paddingHorizontal: 24, zIndex: 100, overflow: 'hidden' },
  blob: { position: 'absolute' },
  stage: { width: ORBIT, height: ORBIT, alignItems: 'center', justifyContent: 'center' },
  wave: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, borderWidth: 2 },
  orbit: { position: 'absolute', width: ORBIT, height: ORBIT },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2 },
  disc: { width: DISC, height: DISC, borderRadius: DISC / 2, borderWidth: 4, overflow: 'hidden' },
  centred: { alignItems: 'center', justifyContent: 'center' },
  bottom: { alignSelf: 'stretch', alignItems: 'center', gap: 14 },
  unlock: { alignSelf: 'stretch', minHeight: 56, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
