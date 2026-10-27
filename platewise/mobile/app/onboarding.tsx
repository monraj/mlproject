import React, { useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { Button } from '../src/components/Button';
import { Press } from '../src/components/Press';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Odometer } from '../src/components/Odometer';
import { Bar } from '../src/components/Bar';
import { IconButton } from '../src/components/IconButton';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { CALORIE_FLOOR, clampPace, dailyBudget, formulaTdee, profileProblem, type ProfileInput } from '../src/state/calc';
import type { Profile, Sex } from '../src/state/types';
import { dayKey } from '../src/lib/dates';
import { kcal } from '../src/lib/format';
import { font } from '../src/theme/tokens';
import { duration, stagger } from '../src/lib/motion';

const ACTIVITY = [
  { v: 1.2, label: 'Mostly sitting' },
  { v: 1.375, label: 'Lightly active' },
  { v: 1.55, label: 'Active' },
  { v: 1.725, label: 'Very active' },
];

const PACES = [
  { id: 'gentle', title: 'Gentle', kg: 0.25, note: 'Easiest to stick with' },
  { id: 'steady', title: 'Steady', kg: 0.5, note: 'A good balance for most people', suggested: true },
  { id: 'faster', title: 'Faster', kg: 0.75, note: 'Harder; expect more hunger' },
] as const;

function Field({ label, value, onChange, suffix, numeric = true, placeholder }: { label: string; value: string; onChange: (v: string) => void; suffix?: string; numeric?: boolean; placeholder?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <T v="small" weight="semibold" muted>
        {label}
      </T>
      <View style={[styles.input, { backgroundColor: c.surface }]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={numeric ? 'decimal-pad' : 'default'}
          placeholder={placeholder}
          placeholderTextColor={c.faint}
          accessibilityLabel={label}
          style={{ flex: 1, fontFamily: font.bold, fontSize: 18, color: c.ink }}
        />
        {suffix ? (
          <T v="small" weight="semibold" muted>
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

export default function Onboarding() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const p = s.profile;
  const editing = !!p;
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(p?.name ?? '');
  const [sex, setSex] = useState<Sex>(p?.sex ?? 'female');
  const [age, setAge] = useState(p ? String(p.age) : '');
  const [height, setHeight] = useState(p ? String(p.heightCm) : '');
  const [weight, setWeight] = useState(p ? String(p.weightKg) : '');
  const [goal, setGoal] = useState(p ? String(p.goalKg) : '');
  const [activity, setActivity] = useState(p?.activity ?? 1.375);
  const [pick, setPick] = useState<(typeof PACES)[number]['id']>(PACES.find((x) => x.kg === p?.paceKgWeek)?.id ?? 'steady');
  const [problem, setProblem] = useState<string | null>(null);

  const input: ProfileInput = {
    sex,
    age: Number(age),
    heightCm: Number(height),
    weightKg: Number(weight.replace(',', '.')),
    goalKg: Number(goal.replace(',', '.')),
    activity,
    paceKgWeek: PACES.find((x) => x.id === pick)?.kg ?? 0.5,
  };
  const keepLearned = !!p?.learnedTdee && p.weightKg === input.weightKg && p.activity === activity;
  const tdee = keepLearned && p?.learnedTdee ? p.learnedTdee : formulaTdee(input);
  const maintain = Math.abs(input.goalKg - input.weightKg) <= 0.1;
  const budget = dailyBudget(input, tdee);
  const toGo = Math.abs(input.weightKg - input.goalKg);
  const paces = useMemo(() => PACES.map((x) => ({ ...x, budget: dailyBudget({ ...input, paceKgWeek: x.kg }, tdee), capped: clampPace(x.kg, input.weightKg) < x.kg })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input.weightKg, input.goalKg, input.sex, tdee]);

  const next = () => {
    const err = profileProblem(input);
    setProblem(err);
    if (!err) setStep(2);
  };

  const finish = () => {
    const profile: Profile = {
      name: name.trim(),
      ...input,
      paceKgWeek: maintain ? 0 : input.paceKgWeek,
      startDate: p?.startDate ?? dayKey(),
      startWeightKg: p?.startWeightKg ?? input.weightKg,
      learnedTdee: keepLearned ? p?.learnedTdee ?? null : null,
      hideNumbers: p?.hideNumbers ?? false,
      reminders: p?.reminders ?? { on: false, breakfast: '07:30', lunch: '12:45', dinner: '19:00', weighDay: 1 },
    };
    dispatch({ type: 'setProfile', profile });
    if (!s.weights.some((w) => w.date === dayKey())) dispatch({ type: 'addWeight', weight: { date: dayKey(), kg: input.weightKg } });
    router.replace('/today');
  };

  if (step === 1) {
    return (
      <Screen footer={<Button label="Continue" onPress={next} />}>
        <View style={styles.topRow}>
          {editing ? <IconButton icon="back" label="Back" onPress={() => router.back()} /> : null}
          <View style={{ flex: 1, gap: 6 }}>
            <T v="small" weight="semibold" muted>
              Step 1 of 2
            </T>
            <Bar value={1 / 2} color={c.mint} track={c.line} height={6} />
          </View>
        </View>
        <Animated.View entering={FadeInDown.duration(duration.slow)} style={{ gap: 6 }}>
          <T v="title">{editing ? 'Your details' : 'Tell us about you'}</T>
          <T muted>We use this to estimate how much you burn each day.</T>
        </Animated.View>

        <Field label="Your first name (optional)" value={name} onChange={setName} numeric={false} placeholder="Ama" />
        <View style={{ gap: 6 }}>
          <T v="small" weight="semibold" muted>
            Sex
          </T>
          <View style={[styles.seg, { backgroundColor: c.surface }]} accessibilityRole="radiogroup">
            {(['female', 'male'] as const).map((x) => (
              <Press key={x} accessibilityRole="radio" accessibilityState={{ checked: sex === x }} onPress={() => setSex(x)} style={[styles.segItem, sex === x && { backgroundColor: c.button }]}>
                <T v="small" weight="bold" color={sex === x ? c.buttonText : c.muted}>
                  {x === 'female' ? 'Female' : 'Male'}
                </T>
              </Press>
            ))}
          </View>
        </View>
        <View style={styles.row}>
          <Field label="Age" value={age} onChange={setAge} suffix="years" placeholder="29" />
          <Field label="Height" value={height} onChange={setHeight} suffix="cm" placeholder="165" />
        </View>
        <View style={styles.row}>
          <Field label="Weight now" value={weight} onChange={setWeight} suffix="kg" placeholder="84" />
          <Field label="Goal weight" value={goal} onChange={setGoal} suffix="kg" placeholder="76" />
        </View>
        <View style={{ gap: 8 }}>
          <T v="small" weight="semibold" muted>
            How active are you?
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup">
            {ACTIVITY.map((a) => (
              <Press
                key={a.v}
                accessibilityRole="radio"
                accessibilityState={{ checked: activity === a.v }}
                onPress={() => setActivity(a.v)}
                style={[styles.pillBtn, { backgroundColor: activity === a.v ? c.button : c.surface }]}
              >
                <T v="small" weight="bold" color={activity === a.v ? c.buttonText : c.ink}>
                  {a.label}
                </T>
              </Press>
            ))}
          </View>
        </View>
        {problem ? (
          <Card tone="amber">
            <T v="small" weight="semibold" color={c.amberText}>
              {problem}
            </T>
          </Card>
        ) : null}
        <T v="small" muted>
          PlateWise is for adults 18 and over. It gives estimates for general wellness, not medical advice.
        </T>
      </Screen>
    );
  }

  return (
    <Screen footer={<Button label={editing ? 'Save changes' : 'Start tracking'} onPress={finish} />}>
      <View style={styles.topRow}>
        <IconButton icon="back" label="Back" onPress={() => setStep(1)} />
        <View style={{ flex: 1, gap: 6 }}>
          <T v="small" weight="semibold" muted>
            Step 2 of 2
          </T>
          <Bar value={1} from={1 / 2} color={c.mint} track={c.line} height={6} />
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(duration.slow)} style={{ gap: 6 }}>
        <T v="title">{maintain ? 'Keep your weight steady' : 'How fast do you want to go?'}</T>
        <T muted>You can change this any time.</T>
      </Animated.View>

      <Card order={1} style={styles.goal}>
        <View style={{ gap: 2 }}>
          <T v="small" weight="semibold" muted>
            Now
          </T>
          <T v="h2" size={22} weight="heavy">
            {input.weightKg} kg
          </T>
        </View>
        <Icon name="arrow" color={c.muted} />
        <View style={{ gap: 2, flex: 1 }}>
          <T v="small" weight="semibold" muted>
            Goal
          </T>
          <T v="h2" size={22} weight="heavy">
            {input.goalKg} kg
          </T>
        </View>
        {!maintain ? (
          <View style={[styles.pill, { backgroundColor: c.mintTint }]}>
            <T v="small" weight="bold" color={c.mintDeep}>
              {Math.round(toGo * 10) / 10} kg to go
            </T>
          </View>
        ) : null}
      </Card>

      {!maintain ? (
        <View style={{ gap: 10 }} accessibilityRole="radiogroup">
          {paces.map((x, i) => {
            const on = x.id === pick;
            return (
              <Animated.View key={x.id} entering={FadeInDown.duration(duration.slow).delay(160 + i * stagger)} layout={LinearTransition}>
                <Press
                  haptic
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${x.title}, ${x.kg} kg a week. ${x.note}`}
                  onPress={() => setPick(x.id)}
                  style={[styles.option, { backgroundColor: c.surface, borderColor: on ? c.mintBorder : 'transparent' }]}
                >
                  <View style={[styles.radio, { borderColor: on ? c.mintBorder : c.faint, borderWidth: on ? 7 : 2 }]} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="h2">
                      {x.title} · {x.kg} kg a week
                    </T>
                    <T v="small" muted>
                      {x.capped ? 'Capped at 1% of your weight a week' : x.note}
                      {!s.profile?.hideNumbers ? ` · ${kcal(x.budget)} kcal` : ''}
                    </T>
                  </View>
                  {'suggested' in x && x.suggested ? (
                    <View style={[styles.pill, { backgroundColor: c.mintTint }]}>
                      <T v="small" size={12} weight="bold" color={c.mintDeep}>
                        Suggested
                      </T>
                    </View>
                  ) : null}
                </Press>
              </Animated.View>
            );
          })}
        </View>
      ) : null}

      <Card tone="mint" order={5} style={{ gap: 4 }}>
        <T v="small" weight="semibold" color={c.mintDeep}>
          Your starting daily budget
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <T v="title" size={30} color={c.mintDeep} style={{ marginBottom: 4 }}>
            about
          </T>
          <Odometer value={budget} size={40} color={c.mintDeep} />
          <T v="h2" color={c.mintDeep} style={{ marginBottom: 8 }}>
            kcal
          </T>
        </View>
        <T v="small" color={c.mintDeep}>
          You burn about {kcal(tdee)} kcal a day. We fine-tune this from your weigh-ins after two weeks.
        </T>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Icon name="info" color={c.muted} size={18} />
        <T v="small" muted style={{ flex: 1 }}>
          We never set a budget below {kcal(CALORIE_FLOOR[sex])} kcal, or a pace faster than 1% of your weight a week.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', gap: 10 },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 54, paddingHorizontal: 16, borderRadius: 16 },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 4 },
  segItem: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillBtn: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: 'center' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderWidth: 2 },
  radio: { width: 22, height: 22, borderRadius: 11 },
});
