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
import { newId } from '../../src/state/AppState';
import type { ChatMsg, FlexPlan as Plan } from '../../src/state/types';
import { api } from '../../src/api/client';
import { coachContext } from '../../src/state/insights';
import { shortDate, weekdayShort } from '../../src/lib/dates';
import { mealForHour } from '../../src/lib/format';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/Button';
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

function FlexPlan({ msg }: { msg: ChatMsg & { plan: Plan } }) {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const reduce = useReducedMotion();
  const days = msg.plan.days;
  const max = Math.max(...days.map((x) => x.kcal));
  const min = Math.min(...days.map((x) => x.kcal));
  const hide = !!s.profile?.hideNumbers;
  const floor = s.profile?.sex === 'male' ? '1,500' : '1,200';
  return (
    <View style={[styles.plan, { backgroundColor: c.surface }]}>
      <T v="small" weight="bold">
        {msg.plan.reason}
      </T>
      <View style={styles.planBars} accessible accessibilityLabel={days.map((x) => `${weekdayShort(x.date)} ${kcal(x.kcal)} kcal`).join(', ')}>
        {days.map((x, i) => (
          <View key={x.date} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            {!hide ? (
              <T v="small" size={12} weight="bold">
                {kcal(x.kcal)}
              </T>
            ) : null}
            <Animated.View
              entering={reduce ? undefined : FadeIn.duration(duration.base).delay(300 + i * 80)}
              style={{ width: '100%', height: 30 + (max === min ? 30 : (46 * (x.kcal - min)) / (max - min)), borderRadius: 8, backgroundColor: x.kcal === max ? c.mint : c.mintLight }}
            />
            <T v="small" size={12} muted>
              {weekdayShort(x.date)} {shortDate(x.date).split(' ')[0]}
            </T>
          </View>
        ))}
      </View>
      <T v="small" size={12} muted>
        Never below your {floor} kcal floor.
      </T>
      {msg.planSaved ? (
        <T v="small" weight="bold" color={c.mintText}>
          Saved. Today shows the planned budget on those days.
        </T>
      ) : (
        <Button
          label="Save the flex plan"
          kind="secondary"
          onPress={() => {
            dispatch({ type: 'setPlans', plan: msg.plan });
            dispatch({ type: 'chatPatch', id: msg.id, patch: { planSaved: true } });
          }}
        />
      )}
    </View>
  );
}

export default function Coach() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { s, dispatch, budgetFor } = useApp();
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const scroll = useRef<ScrollView>(null);
  const opening: ChatMsg = { id: 'hello', from: 'coach', text: `Hi${s.profile?.name ? ` ${s.profile.name}` : ''}! Ask me about food, portions or your plan. I can see what you've logged. To log by chat, start with “Log:”.` };
  const msgs = [opening, ...s.chat];

  const send = async (value: string) => {
    const v = value.trim();
    if (!v || typing || !s.profile) return;
    setText('');
    const mine: ChatMsg = { id: newId('u'), from: 'me', text: v };
    dispatch({ type: 'chat', msg: mine });
    setTyping(true);
    try {
      if (/^log[:\s]/i.test(v)) {
        const r = await api.parseText(v.replace(/^log[:\s]*/i, ''), 'en', mealForHour(new Date().getHours()));
        if (r.isFood) {
          dispatch({ type: 'chat', msg: { id: newId('c'), from: 'coach', text: `Got it: ${r.items.map((i) => i.name).join(', ')}. Check the portions and save.` } });
          dispatch({ type: 'startDraft', items: r.items, source: 'text', note: r.note });
          router.push('/scan/review');
          return;
        }
      }
      const history = [...s.chat, mine].slice(-14);
      while (history.length && history[0].from !== 'me') history.shift();
      const plans = Object.entries(s.plans).map(([d, p]) => `${d}: ${p.kcal} (${p.reason})`).join('; ');
      const r = await api.coach(
        history.map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text })),
        coachContext(s.profile, s.days, s.weights, budgetFor, plans ? `Saved plans: ${plans}` : ''),
        s.profile.sex,
        s.profile.hideNumbers,
      );
      dispatch({ type: 'chat', msg: { id: newId('c'), from: 'coach', text: r.reply, plan: r.flex_plan } });
    } catch (e) {
      dispatch({ type: 'chat', msg: { id: newId('c'), from: 'coach', text: `I couldn't answer just now. ${(e as Error).message}` } });
    } finally {
      setTyping(false);
    }
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
        {s.chat.length ? (
          <Press onPress={() => dispatch({ type: 'chatClear' })} accessibilityLabel="Clear the conversation" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 }}>
            <T v="small" weight="bold" color={c.mintText}>
              Clear
            </T>
          </Press>
        ) : null}
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
              {m.plan && m.plan.days.length ? <FlexPlan msg={m as ChatMsg & { plan: Plan }} /> : null}
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
          {['What should I eat tonight?', 'I have a wedding on Saturday. How do I stay on track?', 'Why was my week slow?', 'Log: two balls of kenkey'].map((q) => (
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
