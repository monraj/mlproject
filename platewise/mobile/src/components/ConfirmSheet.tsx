import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { T } from './T';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { duration, easeOut, spring, stagger } from '../lib/motion';
import { font } from '../theme/tokens';

// A confirm sheet in PlateWise's own look, instead of the phone's plain dialog. It rises from the
// bottom, the picture pops in with a soft ripple, and on "Remove" the picture breaks into little
// dots that drift away before the sheet slides down. Amber, never red (CLAUDE.md rule 9).

export type ConfirmAsk = {
  title: string;
  body: string;
  /** The button that goes ahead, e.g. "Remove". */
  action: string;
  /** Shown big in the middle; a person's initial takes its place when given. */
  icon?: IconName;
  initial?: string;
  go: () => void;
  /** A gentler choice shown first, e.g. keep the person's log on the phone instead of deleting it. */
  keep?: {
    label: string;
    /** Ask for a password first; `check` says what's wrong with it, or null. */
    password?: { prompt: string; check: (pw: string) => string | null };
    go: (password?: string) => void;
  };
};

const SPARKS = 10;
const BADGE = 92;

/** `ask(...)` opens the sheet; render `sheet` once in the screen. */
export function useConfirm(): [(a: ConfirmAsk) => void, React.ReactElement] {
  const [req, setReq] = useState<ConfirmAsk | null>(null);
  const ask = useCallback((a: ConfirmAsk) => setReq(a), []);
  const sheet = <ConfirmSheet req={req} onDone={() => setReq(null)} />;
  return [ask, sheet];
}

function ConfirmSheet({ req, onDone }: { req: ConfirmAsk | null; onDone: () => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState<ConfirmAsk | null>(null);
  const [height, setHeight] = useState(420);
  const [askingPw, setAskingPw] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const busy = useRef(false);
  const kept = useSharedValue(0); // picture tucked safely away

  const enter = useSharedValue(0); // scrim and sheet
  const pop = useSharedValue(0); // the picture
  const ripple = useSharedValue(0);
  const burst = useSharedValue(0); // picture breaking into dots
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (!req) return;
    busy.current = false;
    setShown(req);
    setAskingPw(false);
    setKeeping(false);
    setPw('');
    setPwError(null);
    burst.value = 0;
    kept.value = 0;
    if (reduce) {
      enter.value = 1;
      pop.value = 1;
      return;
    }
    enter.value = 0;
    pop.value = 0;
    ripple.value = 0;
    enter.value = withSpring(1, spring.sheet);
    pop.value = withDelay(stagger * 2, withSpring(1, spring.pop));
    ripple.value = withDelay(stagger * 3, withTiming(1, { duration: duration.data, easing: easeOut }));
    wobble.value = withDelay(duration.slow + stagger, withSequence(withTiming(-12, { duration: 90 }), withTiming(10, { duration: 110 }), withTiming(-5, { duration: 90 }), withTiming(0, { duration: 90 })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req, reduce]);

  const closed = (run?: () => void) => {
    setShown(null);
    onDone();
    run?.();
  };

  const close = (run?: () => void) => {
    if (reduce) return closed(run);
    enter.value = withTiming(0, { duration: duration.base, easing: easeOut }, (done) => {
      if (done) runOnJS(closed)(run);
    });
  };

  const cancel = () => {
    if (busy.current) return;
    busy.current = true;
    close();
  };

  const confirm = () => {
    if (busy.current || !shown) return;
    busy.current = true;
    const go = shown.go;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    if (reduce) return closed(go);
    // The picture breaks into dots, then the sheet slides away and the removal happens.
    burst.value = withTiming(1, { duration: duration.slow + duration.fast, easing: easeOut }, (done) => {
      if (done) runOnJS(close)(go);
    });
  };

  const keep = () => {
    const k = shown?.keep;
    if (busy.current || !k) return;
    if (k.password && !askingPw) {
      setAskingPw(true);
      return;
    }
    const problem = k.password ? k.password.check(pw) : null;
    if (problem) {
      setPwError(problem);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      return;
    }
    busy.current = true;
    setKeeping(true);
    const password = k.password ? pw : undefined;
    const go = () => k.go(password);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (reduce) return closed(go);
    // The picture gets a mint tick and tucks down into the sheet, safe for next time.
    ripple.value = 0;
    ripple.value = withTiming(1, { duration: duration.slow, easing: easeOut });
    kept.value = withSequence(
      withSpring(1, spring.pop),
      withDelay(duration.base, withTiming(2, { duration: duration.base + duration.fast, easing: easeOut }, (done) => {
        if (done) runOnJS(close)(go);
      })),
    );
  };

  const scrim = useAnimatedStyle(() => ({ opacity: Math.min(1, enter.value) }));
  const card = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - enter.value) * (height + 40) }] }));
  const picture = useAnimatedStyle(() => {
    const tuck = Math.max(0, kept.value - 1);
    return {
      opacity: (1 - burst.value) * (1 - tuck),
      transform: [{ translateY: tuck * 40 }, { scale: pop.value * (1 - burst.value * 0.7) * (1 - tuck * 0.5) }, { rotate: `${burst.value * -25}deg` }],
    };
  });
  const ring = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - ripple.value), transform: [{ scale: 1 + ripple.value * 0.8 }] }));
  const chip = useAnimatedStyle(() => ({ opacity: (1 - burst.value) * (1 - Math.min(1, kept.value)), transform: [{ scale: pop.value }, { rotate: `${wobble.value}deg` }] }));
  const tick = useAnimatedStyle(() => ({ opacity: Math.min(1, kept.value), transform: [{ scale: 0.4 + Math.min(1, kept.value) * 0.6 }] }));
  const glyph = useAnimatedStyle(() => ({ opacity: 1 - Math.min(1, kept.value) }));

  const sparkColours = [c.amber, c.sun, c.mint, c.water, c.protein];

  return (
    <Modal visible={!!shown} transparent statusBarTranslucent animationType="none" onRequestClose={cancel}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrim]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={cancel} accessibilityRole="button" accessibilityLabel="Cancel" />
      </Animated.View>
      {shown ? (
        <KeyboardAvoidingView behavior="padding" style={styles.dock} pointerEvents="box-none">
        <Animated.View
          onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
          style={[styles.sheet, { backgroundColor: c.raised, paddingBottom: 20 + insets.bottom }, card]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: c.line }]} />
          <View style={styles.stage}>
            <Animated.View style={[styles.ring, { borderColor: keeping ? c.mint : c.amber }, ring]} />
            {Array.from({ length: SPARKS }, (_, i) => (
              <Spark key={i} i={i} burst={burst} color={sparkColours[i % sparkColours.length]} />
            ))}
            <Animated.View style={[styles.badge, { backgroundColor: keeping ? c.mintTint : c.amberTint, borderColor: c.raised }, picture]}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centred, glyph]}>
                {shown.initial ? (
                  <T v="title" size={40} weight="heavy" color={c.amberText}>
                    {shown.initial}
                  </T>
                ) : (
                  <Icon name={shown.icon ?? 'trash'} size={38} color={c.amberText} strokeWidth={2.2} />
                )}
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.centred, tick]}>
                <Icon name="check" size={40} color={c.mintDeep} strokeWidth={3} />
              </Animated.View>
            </Animated.View>
            {shown.initial ? (
              <Animated.View style={[styles.chip, { backgroundColor: c.amber, borderColor: c.raised }, chip]}>
                <Icon name="trash" size={16} color="#101828" strokeWidth={2.4} />
              </Animated.View>
            ) : null}
          </View>
          <Rise delay={stagger * 3} reduce={reduce} on={!!shown}>
            <T v="title" size={24} center>
              {shown.title}
            </T>
            <T v="body" muted center>
              {shown.body}
            </T>
          </Rise>
          {askingPw && shown.keep?.password ? (
            <Rise delay={0} reduce={reduce} on={askingPw} style={{ alignSelf: 'stretch', alignItems: 'stretch', gap: 8 }}>
              <T v="small" weight="semibold" muted center>
                {shown.keep.password.prompt}
              </T>
              <TextInput
                value={pw}
                onChangeText={(t) => {
                  setPw(t);
                  setPwError(null);
                }}
                placeholder="Password"
                placeholderTextColor={c.faint}
                secureTextEntry
                autoFocus
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={keep}
                accessibilityLabel="Password"
                style={[styles.input, { backgroundColor: c.surface, color: c.ink, borderColor: pwError ? c.amber : 'transparent' }]}
              />
              {pwError ? (
                <T v="small" weight="semibold" color={c.amberText} center>
                  {pwError}
                </T>
              ) : null}
            </Rise>
          ) : null}
          <Rise delay={stagger * 4} reduce={reduce} on={!!shown} style={{ alignSelf: 'stretch', alignItems: 'stretch', gap: 10, marginTop: 8 }}>
            {shown.keep ? (
              <>
                <Button label={askingPw ? 'Save password and sign out' : shown.keep.label} icon="check" onPress={keep} />
                {askingPw ? null : <Button label={shown.action} icon="trash" onPress={confirm} bgColor={c.amberTint} fgColor={c.amberText} />}
                <Button label="Cancel" kind="ghost" onPress={cancel} />
              </>
            ) : (
              <>
                <Button label={shown.action} icon="trash" onPress={confirm} bgColor={c.amber} fgColor="#101828" />
                <Button label="Keep" kind="secondary" onPress={cancel} />
              </>
            )}
          </Rise>
        </Animated.View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

/** One of the dots the picture breaks into: flies out from the centre and fades. */
function Spark({ i, burst, color }: { i: number; burst: SharedValue<number>; color: string }) {
  const angle = (i / SPARKS) * Math.PI * 2 + (i % 2 ? 0.3 : -0.1);
  const reach = 70 + (i % 3) * 18;
  const style = useAnimatedStyle(() => {
    const t = burst.value;
    return {
      opacity: t === 0 ? 0 : 1 - t,
      transform: [{ translateX: Math.cos(angle) * reach * t }, { translateY: Math.sin(angle) * reach * t - t * 14 }, { scale: 1.2 - t * 0.6 }],
    };
  });
  return <Animated.View style={[styles.spark, { backgroundColor: color }, style]} />;
}

/** Fades and lifts its children in, a beat after the sheet. */
function Rise({ delay, reduce, on, style, children }: { delay: number; reduce: boolean; on: boolean; style?: object; children: React.ReactNode }) {
  const v = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!on) return;
    v.value = reduce ? 1 : 0;
    if (!reduce) v.value = withDelay(delay, withTiming(1, { duration: duration.slow, easing: easeOut }));
  }, [on, reduce, delay, v]);
  const a = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 14 }] }));
  return <Animated.View style={[{ alignItems: 'center', gap: 8 }, style, a]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  dock: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 10, alignItems: 'center', gap: 10 },
  handle: { width: 40, height: 5, borderRadius: 3, marginBottom: 6 },
  stage: { width: 180, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 2 },
  badge: { width: BADGE, height: BADGE, borderRadius: BADGE / 2, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  chip: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 3, alignItems: 'center', justifyContent: 'center', left: 90 + BADGE / 2 - 30, top: 75 + BADGE / 2 - 30 },
  spark: { position: 'absolute', width: 9, height: 9, borderRadius: 5 },
  centred: { alignItems: 'center', justifyContent: 'center' },
  input: { height: 52, borderRadius: 16, paddingHorizontal: 16, fontFamily: font.bold, fontSize: 16, borderWidth: 2 },
});
