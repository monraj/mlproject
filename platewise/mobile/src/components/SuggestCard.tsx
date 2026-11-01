import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Press } from './Press';
import { T } from './T';
import { Icon } from './Icon';
import { Rise } from './Card';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../state/AppState';
import { nextSlot, suggestMeals } from '../state/suggest';
import { draftFromFood, food } from '../data/foods';
import { approx } from '../lib/format';
import { chooseSlot } from '../lib/mealSlots';
import { duration } from '../lib/motion';

const SLOT_WORD = { Breakfast: 'breakfast', Lunch: 'lunch', Dinner: 'supper' } as const;

/** Today's suggestion for the next meal: a plate that fits what's left, from anywhere in Ghana. */
export function SuggestCard({ order }: { order: number }) {
  const { c } = useTheme();
  const { s, day, today, budget, proteinGoal, dispatch } = useApp();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [shuffle, setShuffle] = useState(0);
  const [pick, setPick] = useState(0);
  const slot = nextSlot(day);
  const list = useMemo(
    () => (s.profile ? suggestMeals({ profile: s.profile, days: s.days, weights: s.weights, date: today, budget, proteinGoal, slot, shuffle }) : []),
    [s.profile, s.days, s.weights, today, budget, proteinGoal, slot, shuffle],
  );
  if (!list.length) return null;
  const sug = list[pick % list.length];
  const hide = !!s.profile?.hideNumbers;

  const others = () => {
    Haptics.selectionAsync().catch(() => undefined);
    if (pick + 1 < list.length) setPick(pick + 1);
    else {
      setPick(0);
      setShuffle(shuffle + 1);
    }
  };
  const log = () => {
    const items = sug.parts.flatMap((p) => {
      const f = food(p.foodId);
      return f ? [draftFromFood(f, p.grams)] : [];
    });
    chooseSlot(slot);
    dispatch({ type: 'startDraft', items, source: 'idea' });
    router.push('/scan/review');
  };

  return (
    <Rise order={order} style={[styles.card, { backgroundColor: c.surface }]}>
      <View style={styles.head}>
        <T v="label" muted style={{ flex: 1 }}>
          For {SLOT_WORD[slot]}, try
        </T>
        <Press onPress={others} accessibilityRole="button" accessibilityLabel="Show other suggestions" style={styles.link}>
          <T v="small" weight="bold" color={c.mintText}>
            Show others
          </T>
        </Press>
      </View>
      <Animated.View
        key={`${shuffle}:${sug.plate.id}`}
        entering={reduce ? undefined : FadeInRight.duration(duration.base)}
        exiting={reduce ? undefined : FadeOutLeft.duration(duration.fast)}
        layout={reduce ? undefined : LinearTransition}
        style={styles.body}
      >
        <View style={styles.plate} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {sug.parts.slice(0, 3).map((p, i) => (
            <View key={p.foodId} style={[styles.blob, { backgroundColor: [c.mint, c.steps, c.greens][i], transform: [{ rotate: `${i * 120}deg` }, { translateY: -9 }] }]} />
          ))}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="body" weight="bold" numberOfLines={2}>
            {sug.plate.name}
          </T>
          <T v="small" muted numberOfLines={2}>
            {hide ? sug.why : `About ${approx(sug.kcal)} kcal · ${sug.protein} g protein · ${sug.why.toLowerCase()}`}
          </T>
          <T v="small" size={11} color={c.faint} numberOfLines={1}>
            {sug.plate.people.filter((p) => p !== 'All').join(' · ') || 'Eaten across Ghana'}
          </T>
        </View>
      </Animated.View>
      <View style={styles.actions}>
        <Press onPress={log} haptic accessibilityRole="button" accessibilityLabel={`Log ${sug.plate.name}`} style={[styles.btn, { backgroundColor: c.button }]}>
          <Icon name="plus" color={c.buttonText} size={18} />
          <T v="small" weight="bold" color={c.buttonText}>
            Log this
          </T>
        </Press>
        <Press onPress={() => router.push('/fits')} accessibilityRole="button" style={[styles.btn, { backgroundColor: c.bg }]}>
          <Icon name="bulb" color={c.ink} size={18} />
          <T v="small" weight="bold">
            More ideas
          </T>
        </Press>
      </View>
    </Rise>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, gap: 10, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center' },
  link: { minHeight: 36, justifyContent: 'center' },
  body: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  plate: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  blob: { position: 'absolute', width: 24, height: 24, borderRadius: 12, opacity: 0.85 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, minHeight: 44, borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
