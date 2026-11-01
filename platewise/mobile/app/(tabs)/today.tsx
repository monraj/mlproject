import React from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, LinearTransition, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Ring } from '../../src/components/Ring';
import { Odometer } from '../../src/components/Odometer';
import { Card, Rise } from '../../src/components/Card';
import { Press } from '../../src/components/Press';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { approx, greeting, kcal, longDate, mealForHour } from '../../src/lib/format';
import { todayInsight, wellbeingCheck } from '../../src/state/insights';
import { SLOTS, chooseSlot, slotOf } from '../../src/lib/mealSlots';
import { WEEKDAYS, keyDate } from '../../src/lib/dates';
import type { Meal } from '../../src/state/types';
import { duration, stagger } from '../../src/lib/motion';

export default function Today() {
  const { c } = useTheme();
  const { s, day, today, budget, eatenKcal, leftKcal, protein, proteinGoal, greens, weekLogged, activityBonus, dispatch } = useApp();
  const router = useRouter();
  const now = new Date();
  const progress = eatenKcal / budget;
  const justSaved = day.meals.some((m) => m.id === s.lastSavedId);
  const from = justSaved ? s.eatenBefore / budget : 0;
  const hide = !!s.profile?.hideNumbers;
  const insight = todayInsight(greens, protein, proteinGoal, leftKcal, day.meals.length);
  const nextMeal = mealForHour(now.getHours());
  const plan = s.plans[today];
  const change = s.budgetChange;
  const wellbeing = s.profile ? wellbeingCheck(s.profile, s.days, s.weights, today) : null;

  const habit = (key: 'water' | 'greensExtra', delta: number) => {
    const cur = day[key];
    if (key === 'greensExtra' && delta < 0 && cur === 0) return;
    dispatch({ type: 'habit', date: today, key, value: cur + delta });
  };

  const removeMeal = (m: Meal) => {
    const go = () => dispatch({ type: 'deleteMeal', date: today, id: m.id });
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this meal?', m.title, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  const habits = [
    { key: 'protein', label: 'Protein', value: protein / proteinGoal, text: hide ? `${Math.round((protein / proteinGoal) * 100)}%` : `${protein} / ${proteinGoal} g`, color: c.protein, hint: '' },
    { key: 'greens', label: 'Greens', value: greens / 3, text: `${greens} / 3 servings`, color: c.greens, onPress: () => habit('greensExtra', 1), onLong: () => habit('greensExtra', -1), hint: 'Tap to add a serving, hold to remove one' },
    { key: 'water', label: 'Water', value: day.water / 8, text: `${day.water} / 8 cups`, color: c.water, onPress: () => habit('water', 1), onLong: () => habit('water', -1), hint: 'Tap to add a cup, hold to remove one' },
    { key: 'steps', label: 'Steps', value: day.steps / 8000, text: day.steps ? `${kcal(day.steps)} / 8k` : 'Tap to add', color: c.steps, onPress: () => router.push({ pathname: '/weigh', params: { mode: 'steps' } }), hint: 'Tap to enter steps' },
  ];

  return (
    <Screen>
      <Rise style={styles.header}>
        <View style={{ gap: 2, flex: 1 }}>
          <T v="small" weight="semibold" muted>
            {longDate(now)}
          </T>
          <T v="title">{greeting(now)}{s.profile?.name ? `, ${s.profile.name}` : ''}</T>
        </View>
        <View style={[styles.streak, { backgroundColor: c.surface }]} accessibilityLabel={`Logged ${weekLogged} of the last 7 days`}>
          <Icon name="flame" color={c.amber} size={16} />
          <T v="small" weight="bold">
            {weekLogged}/7 this week
          </T>
        </View>
      </Rise>

      <Card order={1} style={styles.budget}>
        <Ring
          size={150}
          stroke={14}
          progress={progress}
          from={from}
          color={c.mint}
          track={c.line}
          delay={250}
          label={hide ? 'Today’s progress' : `${kcal(eatenKcal)} of ${kcal(budget)} kcal eaten, ${kcal(leftKcal)} left`}
        >
          {hide ? (
            <T v="h2" center>
              {eatenKcal > budget ? 'Over today' : progress > 0.85 ? 'Nearly there' : 'On track'}
            </T>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Odometer value={leftKcal} size={34} delay={300} />
              <T v="small" weight="semibold" muted>
                kcal left
              </T>
            </View>
          )}
        </Ring>
        <View style={{ flex: 1, gap: 12 }}>
          {!hide && (
            <>
              <View style={{ gap: 2 }}>
                <T v="small" weight="semibold" muted>
                  Eaten
                </T>
                <T v="h2" size={19}>
                  about {kcal(eatenKcal)}
                </T>
              </View>
              <View style={{ gap: 2 }}>
                <T v="small" weight="semibold" muted>
                  Budget
                </T>
                <T v="h2" size={19}>
                  {kcal(budget)} kcal
                </T>
                {plan ? (
                  <T v="small" size={12} muted>
                    {plan.reason}
                  </T>
                ) : null}
                {activityBonus ? (
                  <T v="small" size={12} color={c.mintText}>
                    Includes +{kcal(activityBonus)} from exercise
                  </T>
                ) : null}
              </View>
            </>
          )}
          <Press onPress={() => router.push('/checkin')} accessibilityRole="link" style={{ minHeight: 32, justifyContent: 'center' }}>
            <T v="small" weight="bold" color={c.mintText}>
              {change ? `Updated ${WEEKDAYS[keyDate(change.date).getDay()]} · why?` : 'Weekly check-in'}
            </T>
          </Press>
        </View>
      </Card>

      <Rise order={2}>
        <T v="h2" style={{ marginBottom: 10 }}>
          Daily habits
        </T>
        <View style={styles.habits}>
          {habits.map((h, i) => (
            <Press
              key={h.key}
              disabled={!h.onPress}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                h.onPress?.();
              }}
              onLongPress={h.onLong}
              accessibilityLabel={`${h.label}: ${h.text}`}
              accessibilityHint={h.hint || undefined}
              style={[styles.habit, { backgroundColor: c.surface }]}
            >
              <Ring size={50} stroke={6} progress={h.value} color={h.color} track={c.line} delay={400 + i * stagger} ms={900} />
              <T v="small" weight="bold">
                {h.label}
              </T>
              <T v="small" size={11} muted center>
                {h.text}
              </T>
            </Press>
          ))}
        </View>
      </Rise>

      <Card order={3} tone="mint" style={styles.insight}>
        <Icon name="leaf" color={c.mintDeep} />
        <T v="small" color={c.mintDeep} style={{ flex: 1 }}>
          {insight.text}
          {insight.link === 'Ideas' && !hide && leftKcal > 300 ? ` within your ${kcal(leftKcal)} kcal.` : '.'}
        </T>
        <Press onPress={() => router.push(insight.link === 'Log' ? '/log' : '/fits')} style={{ minHeight: 36, justifyContent: 'center' }} accessibilityRole="link">
          <T v="small" weight="bold" color={c.mintText}>
            {insight.link}
          </T>
        </Press>
      </Card>

      {wellbeing ? (
        <Card order={3} tone="amber">
          <T v="small" color={c.amberText}>
            {wellbeing}
          </T>
        </Card>
      ) : null}

      <Rise order={4} style={{ gap: 8 }}>
        <T v="h2">Meals</T>
        {day.meals.length === 0 ? (
          <T v="small" muted>
            Nothing logged yet today. Tap + to snap, say or type your first meal.
          </T>
        ) : null}
        {SLOTS.map((slot) => {
          const meals = day.meals.filter((m) => slotOf(m.type).type === slot.type).sort((a, b) => a.minute - b.minute);
          const passed = slot.minute == null || slot.minute <= now.getHours() * 60 + now.getMinutes() + 60;
          if (!meals.length && (slot.minute == null || !passed)) return null;
          const total = meals.reduce((t, m) => t + m.kcal, 0);
          return (
            <View key={slot.type} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <T v="small" weight="bold" muted style={{ flex: 1 }}>
                  {slot.label}
                </T>
                {meals.length && !hide ? (
                  <T v="small" muted>
                    {approx(total)} kcal
                  </T>
                ) : null}
              </View>
              {meals.map((m) => (
                <Animated.View
                  key={m.id}
                  layout={LinearTransition}
                  entering={m.id === s.lastSavedId ? ZoomIn.springify().damping(14) : FadeInDown.duration(duration.slow)}
                  style={{ borderRadius: 20 }}
                >
                  <Press onLongPress={() => removeMeal(m)} accessibilityHint="Hold to delete" style={[styles.meal, { backgroundColor: c.surface }]}>
                    <View style={[styles.thumb, { backgroundColor: m.swatch }]} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="small" size={12} weight="semibold" muted>
                        {m.time}
                      </T>
                      <T v="body" weight="bold" numberOfLines={1}>
                        {m.title}
                      </T>
                    </View>
                    {!hide && (
                      <T v="body" weight="bold">
                        {approx(m.kcal)}
                      </T>
                    )}
                  </Press>
                </Animated.View>
              ))}
              {!meals.length ? (
                <Press
                  onPress={() => {
                    chooseSlot(slot.type);
                    router.push('/log');
                  }}
                  accessibilityLabel={`Log what you ate in the ${slot.label.toLowerCase()}`}
                  style={[styles.meal, styles.plan, { borderColor: c.line, minHeight: 52 }]}
                >
                  <Icon name="plus" color={c.muted} />
                  <T v="small" weight="semibold" muted style={{ flex: 1 }}>
                    Log what you ate in the {slot.label.toLowerCase()}
                  </T>
                </Press>
              ) : null}
            </View>
          );
        })}
        <Press onPress={() => router.push('/fits')} style={[styles.meal, styles.plan, { borderColor: c.line }]} accessibilityLabel="Plan your next meal">
          <View style={[styles.thumb, { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }]}>
            <Icon name="plus" color={c.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="body" weight="bold">
              Plan {nextMeal.toLowerCase()}
            </T>
            <T v="small" size={12} muted>
              {leftKcal < 300 ? 'You’re close to today’s budget' : hide ? 'Ideas that fit your day' : `Ideas that fit your last ${kcal(leftKcal)} kcal`}
            </T>
          </View>
          <Icon name="chevron" color={c.muted} />
        </Press>
      </Rise>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  budget: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  habits: { flexDirection: 'row', gap: 8 },
  habit: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 20 },
  insight: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  meal: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, paddingRight: 14, borderRadius: 20 },
  plan: { borderWidth: 2, borderStyle: 'dashed' },
  thumb: { width: 46, height: 46, borderRadius: 14 },
});
