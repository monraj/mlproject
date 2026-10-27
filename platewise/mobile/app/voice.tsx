import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { Press } from '../src/components/Press';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { duration } from '../src/lib/motion';
import { api } from '../src/api/client';
import { mealForHour } from '../src/lib/format';
import { font } from '../src/theme/tokens';
import type { DraftItem } from '../src/state/types';

const LANGS = ['English', 'Twi', 'Pidgin'] as const;
const CODES = { English: 'en', Twi: 'tw', Pidgin: 'pcm' } as const;
const PLACEHOLDER = {
  English: 'I had two balls of kenkey with fried fish and some pepper',
  Twi: 'Medidii kenkey mmienu ne nam a wɔakye…',
  Pidgin: 'I chop two balls kenkey with fried fish…',
};

function PulseRing({ delay }: { delay: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [reduce, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: reduce ? 0 : 0.5 * (1 - t.value), transform: [{ scale: 1 + 0.9 * t.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { backgroundColor: c.mintLight }, style]} />;
}

function WaveBar({ i, listening }: { i: number; listening: boolean }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0.4);
  useEffect(() => {
    if (listening && !reduce) {
      t.value = withDelay(i * 110, withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0.3, { duration: 420 })), -1));
    } else {
      t.value = withTiming(0.3, { duration: 200 });
    }
  }, [listening, reduce, i, t]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: t.value }] }));
  return <Animated.View style={[styles.wave, { backgroundColor: c.buttonText }, style]} />;
}

export default function Voice() {
  const { c } = useTheme();
  const { dispatch } = useApp();
  const router = useRouter();
  const [lang, setLang] = useState<(typeof LANGS)[number]>('English');
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [heard, setHeard] = useState<DraftItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<TextInput>(null);
  const listening = focused && !busy;

  useEffect(() => {
    const t = setTimeout(() => input.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  const check = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    input.current?.blur();
    try {
      const r = await api.parseText(text.trim(), CODES[lang], mealForHour(new Date().getHours()));
      if (!r.isFood) {
        setError(r.note ? `No food heard: ${r.note}` : 'We couldn’t find a food in that. Try naming the dish and how much.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setHeard(r.items);
      dispatch({ type: 'startDraft', items: r.items, source: 'voice', note: r.note });
      setTimeout(() => router.replace('/scan/review'), 1100);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      scroll={false}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Cancel" kind="secondary" onPress={() => router.back()} />
          <Button label={busy ? 'Working it out…' : 'Check portions'} grow onPress={check} />
        </View>
      }
    >
      <View style={styles.top}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={[styles.seg, { backgroundColor: c.surface }]} accessibilityRole="radiogroup" accessibilityLabel="Language">
          {LANGS.map((l) => (
            <Press key={l} accessibilityRole="radio" accessibilityState={{ checked: lang === l }} onPress={() => setLang(l)} style={[styles.segItem, lang === l && { backgroundColor: c.raised }]}>
              <T v="small" weight={lang === l ? 'bold' : 'semibold'} color={lang === l ? c.ink : c.muted}>
                {l}
              </T>
            </Press>
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <T v="title">Tell me what you ate</T>
        <T muted>Say how much, too — “two balls”, “one ladle”, “a small bowl”.</T>
      </View>

      <View style={{ minHeight: 100 }}>
        <TextInput
          ref={input}
          value={text}
          onChangeText={(v) => {
            setText(v);
            setHeard(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          placeholder={PLACEHOLDER[lang]}
          placeholderTextColor={c.faint}
          accessibilityLabel="What you ate"
          style={{ fontFamily: font.semibold, fontSize: 24, lineHeight: 33, color: c.ink, minHeight: 100, textAlignVertical: 'top' }}
        />
        <T v="small" muted>
          Tap the microphone on your keyboard and speak, or type it.
        </T>
      </View>

      {error ? (
        <T v="small" weight="semibold" color={c.amberText}>
          {error}
        </T>
      ) : null}

      {heard ? (
        <Animated.View entering={FadeIn.duration(duration.base)} style={{ gap: 8 }}>
          <T v="label" muted>
            We heard
          </T>
          <View style={styles.chips}>
            {heard.map((it) => ({ label: it.name, detail: it.kind === 'count' ? `${it.count ?? 1}` : `${it.grams} g`, ask: it.confidence === 'low' })).map((ch, i) => (
              <Animated.View
                key={`${ch.label}${i}`}
                entering={ZoomIn.springify().damping(12).delay(i * 120)}
                style={[styles.chip, ch.ask ? { backgroundColor: c.amberTint, borderColor: c.amber } : { backgroundColor: c.surface, borderColor: 'transparent' }]}
              >
                <T v="small" weight="bold" color={ch.ask ? c.amberText : c.ink}>
                  {ch.label}{' '}
                  <T v="small" weight="medium" color={ch.ask ? c.amberText : c.muted}>
                    · {ch.detail}
                  </T>
                </T>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.micWrap}>
        <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
          {listening ? (
            <>
              <PulseRing delay={0} />
              <PulseRing delay={900} />
            </>
          ) : null}
          <Press
            onPress={() => (focused ? input.current?.blur() : input.current?.focus())}
            accessibilityLabel={focused ? 'Done speaking' : 'Start speaking'}
            style={[styles.mic, { backgroundColor: c.button }]}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <WaveBar key={i} i={i} listening={listening} />
            ))}
          </Press>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 2 },
  segItem: { height: 36, paddingHorizontal: 12, borderRadius: 18, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', borderWidth: 1.5 },
  micWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 120, height: 120, borderRadius: 60 },
  mic: { width: 100, height: 100, borderRadius: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  wave: { width: 5, height: 36, borderRadius: 3 },
});
