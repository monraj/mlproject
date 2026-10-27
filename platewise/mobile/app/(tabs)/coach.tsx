import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { T } from '../../src/components/T';
import { Chip } from '../../src/components/Chip';
import { Press } from '../../src/components/Press';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { coachOpening, coachReplies, type ChatMsg } from '../../src/data/sample';
import { font } from '../../src/theme/tokens';
import { duration, easeOut } from '../../src/lib/motion';
import { kcal } from '../../src/lib/format';

function TypingDot({ delay }: { delay: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 300 }), withTiming(0, { duration: 300 })), -1));
  }, [reduce, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * t.value, transform: [{ translateY: -4 * t.value }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.muted }, style]} />;
}

function FlexPlan() {
  const { c } = useTheme();
  const { s } = useApp();
  const reduce = useReducedMotion();
  // Same weekly total, every day stays above the safety floor (ROADMAP Phase 5b).
  const days = [
    { d: 'Thu', v: s.budget - 90 },
    { d: 'Fri', v: s.budget - 90 },
    { d: 'Sat', v: s.budget + 180 },
  ];
  const max = Math.max(...days.map((x) => x.v));
  return (
    <View style={[styles.plan, { backgroundColor: c.surface }]}>
      <T v="small" weight="bold">
        Flex plan for this week
      </T>
      <View style={styles.planBars} accessible accessibilityLabel={days.map((x) => `${x.d} ${kcal(x.v)} kcal`).join(', ') + '. Same weekly total.'}>
        {days.map((x, i) => (
          <View key={x.d} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <T v="small" size={12} weight="bold">
              {kcal(x.v)}
            </T>
            <Animated.View
              entering={reduce ? undefined : FadeIn.duration(duration.base).delay(500 + i * 80)}
              style={{ width: '100%', height: 30 + 46 * (x.v / max - 0.85) * 6, borderRadius: 8, backgroundColor: x.d === 'Sat' ? c.mint : c.mintLight }}
            />
            <T v="small" size={12} muted>
              {x.d}
            </T>
          </View>
        ))}
      </View>
      <T v="small" size={12} muted>
        Same weekly total. Never below your {s.sex === 'female' ? '1,200' : '1,500'} kcal floor.
      </T>
    </View>
  );
}

export default function Coach() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatMsg[]>(coachOpening);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const replyIndex = useRef(0);
  const scroll = useRef<ScrollView>(null);

  const send = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setMsgs((m) => [...m, { id: `u${Date.now()}`, from: 'me', text: v }]);
    setText('');
    setTyping(true);
    setTimeout(() => {
      const reply = coachReplies[replyIndex.current % coachReplies.length];
      replyIndex.current += 1;
      setTyping(false);
      setMsgs((m) => [...m, { id: `c${Date.now()}`, from: 'coach', text: reply }]);
    }, 1400);
  };

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [msgs, typing]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.head, { paddingTop: insets.top + 12, borderBottomColor: c.line }]}>
        <View style={[styles.avatar, { backgroundColor: c.mintTint }]}>
          <Icon name="chat" color={c.mintDeep} size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h2" size={20} weight="heavy">
            Ask PlateWise
          </T>
          <T v="small" size={12} muted>
            Uses your logs and goals · not medical advice
          </T>
        </View>
      </View>

      <ScrollView ref={scroll} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {msgs.map((m, i) => {
          const mine = m.from === 'me';
          const Enter = mine ? FadeInRight : FadeInLeft;
          return (
            <Animated.View
              key={m.id}
              entering={Enter.duration(duration.slow).delay(i < 2 ? 150 + i * 350 : 0).easing(easeOut)}
              style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '86%', gap: 10 }}
            >
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: c.button, borderBottomRightRadius: 6 }
                    : { backgroundColor: c.surface, borderBottomLeftRadius: 6 },
                ]}
              >
                <T v="body" color={mine ? c.buttonText : c.ink}>
                  {m.text}
                </T>
              </View>
              {m.plan ? <FlexPlan /> : null}
            </Animated.View>
          );
        })}
        {typing ? (
          <Animated.View entering={FadeIn.duration(duration.base)} style={[styles.bubble, styles.typing, { backgroundColor: c.surface }]} accessibilityLabel="PlateWise is typing">
            <TypingDot delay={0} />
            <TypingDot delay={150} />
            <TypingDot delay={300} />
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.composer, { paddingBottom: 12 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['What should I pick at the buffet?', 'Why was my week slow?', 'Log: two balls of kenkey'].map((q) => (
            <Chip key={q} label={q} onPress={() => send(q)} />
          ))}
        </ScrollView>
        <View style={[styles.input, { backgroundColor: c.surface }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            placeholder="Ask about food, portions, your plan…"
            placeholderTextColor={c.faint}
            accessibilityLabel="Message"
            returnKeyType="send"
            style={{ flex: 1, fontFamily: font.medium, fontSize: 15, color: c.ink }}
          />
          <Press onPress={() => send(text)} accessibilityLabel="Send" style={[styles.send, { backgroundColor: c.button }]}>
            <Icon name="send" color={c.buttonText} size={18} />
          </Press>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  bubble: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20 },
  typing: { alignSelf: 'flex-start', flexDirection: 'row', gap: 5, paddingVertical: 16 },
  plan: { borderRadius: 18, padding: 14, gap: 10 },
  planBars: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', height: 110 },
  composer: { paddingHorizontal: 16, gap: 10 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 26 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
