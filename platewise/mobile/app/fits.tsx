import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { IconButton } from '../src/components/IconButton';
import { Chip } from '../src/components/Chip';
import { Bar } from '../src/components/Bar';
import { Card } from '../src/components/Card';
import { Icon } from '../src/components/Icon';
import { Press } from '../src/components/Press';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { dinnerIdeas, type Idea } from '../src/data/sample';
import { kcal } from '../src/lib/format';
import { duration, stagger } from '../src/lib/motion';

function Steam({ delay }: { delay: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [reduce, delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: reduce ? 0 : Math.sin(t.value * Math.PI) * 0.9, transform: [{ translateY: 4 - t.value * 14 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -6, width: 3, height: 10, borderRadius: 2, backgroundColor: c.faint }, style]} />;
}

function Dish({ kind }: { kind: number }) {
  const { c } = useTheme();
  return (
    <Svg width={56} height={56} viewBox="0 0 56 56" accessibilityElementsHidden>
      <Circle cx={28} cy={30} r={24} fill={c.food.plate} />
      {kind === 0 ? (
        <>
          <Circle cx={28} cy={30} r={18} fill="#C9502C" />
          <Circle cx={34} cy={28} r={7} fill="#F5F1E9" />
          <Path d="M16 32c3-3 8-3 10 0" stroke="#F5D7A8" strokeWidth={4} strokeLinecap="round" fill="none" />
        </>
      ) : kind === 1 ? (
        <>
          <Circle cx={28} cy={30} r={18} fill="#3E6B2E" />
          <Rect x={14} y={24} width={12} height={9} rx={3} fill="#F2E3C2" />
          <Rect x={28} y={28} width={12} height={9} rx={3} fill="#F2E3C2" />
        </>
      ) : (
        <>
          <Path d="M14 28c2-8 14-10 18-2 2 5-4 9-10 8-6 0-9-2-8-6z" fill="#8A4B22" />
          <Rect x={31} y={30} width={5} height={5} rx={1} fill="#E08A2E" />
          <Rect x={37} y={27} width={5} height={5} rx={1} fill="#D9792A" />
          <Rect x={34} y={35} width={5} height={5} rx={1} fill="#E08A2E" />
        </>
      )}
    </Svg>
  );
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'home', label: 'Home-cooked' },
  { id: 'chop', label: 'Chop bar' },
  { id: 'quick', label: 'Quick' },
] as const;

export default function Fits() {
  const { c } = useTheme();
  const { s, leftKcal, protein } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const hide = s.hideNumbers;
  const proteinLeft = Math.max(0, s.proteinGoal - protein);

  // Never suggest when little is left (ROADMAP Phase 5: "What fits" rules).
  const ideas: Idea[] = leftKcal < 300 ? [] : dinnerIdeas.filter((i) => (filter === 'all' || i.category === filter) && i.kcal <= leftKcal + 50);

  return (
    <Screen>
      <View style={styles.head}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <View style={{ gap: 2, flex: 1 }}>
          <T v="title" size={26}>
            What fits tonight
          </T>
          {!hide && (
            <T v="small" muted>
              <T v="small" weight="bold">
                {kcal(leftKcal)} kcal
              </T>{' '}
              left ·{' '}
              <T v="small" weight="bold">
                {proteinLeft} g
              </T>{' '}
              protein to go
            </T>
          )}
        </View>
      </View>

      <View style={styles.filters} accessibilityRole="tablist">
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </View>

      <View style={{ gap: 10 }}>
        {ideas.map((idea, i) => {
          const best = idea.badge === 'Best fit';
          return (
            <Animated.View key={idea.id} entering={FadeInDown.duration(duration.slow).delay(100 + i * stagger)} layout={LinearTransition}>
              <Press
                onPress={() => router.push('/scan/camera')}
                accessibilityLabel={`${idea.name}, ${idea.detail}. ${hide ? '' : `About ${idea.kcal} kcal, ${idea.protein} grams protein.`} ${idea.badge}`}
                style={[styles.idea, { backgroundColor: c.surface, borderColor: best ? c.mintBorder : 'transparent' }]}
              >
                <View style={styles.ideaTop}>
                  <View style={{ alignItems: 'center' }}>
                    {best ? (
                      <>
                        <View style={{ position: 'absolute', left: 20 }}>
                          <Steam delay={0} />
                        </View>
                        <View style={{ position: 'absolute', left: 31 }}>
                          <Steam delay={600} />
                        </View>
                      </>
                    ) : null}
                    <Dish kind={i % 3} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="h2">{idea.name}</T>
                    <T v="small" muted>
                      {idea.detail}
                    </T>
                  </View>
                  <View style={[styles.badge, { backgroundColor: best ? c.button : c.mintTint }]}>
                    <T v="small" size={12} weight="bold" color={best ? c.buttonText : c.mintDeep}>
                      {idea.badge}
                    </T>
                  </View>
                </View>
                {!hide && (
                  <View style={styles.fitRow}>
                    <Bar value={idea.kcal / leftKcal} color={c.mint} track={c.line} delay={350 + i * stagger} style={{ flex: 1 }} />
                    <T v="small" weight="bold">
                      ~{kcal(idea.kcal)} kcal · {idea.protein} g protein
                    </T>
                  </View>
                )}
              </Press>
            </Animated.View>
          );
        })}
        {ideas.length === 0 ? (
          <Card>
            <T muted>
              {leftKcal < 300 ? 'You’re close to today’s budget. A light snack or a warm drink is plenty — no need to skip anything.' : 'No ideas in this group yet. Try “All”.'}
            </T>
          </Card>
        ) : null}
      </View>

      <Card tone="amber" order={4} style={styles.tip}>
        <Icon name="bulb" color={c.amberText} />
        <T v="small" color={c.amberText} style={{ flex: 1 }}>
          <T v="small" weight="bold" color={c.amberText}>
            At a chop bar?
          </T>{' '}
          Ask for the soup with less oil on top, and the smaller ball.
        </T>
      </Card>

      {!hide && (
        <T v="small" muted center>
          The bar shows how much of your {kcal(leftKcal)} kcal each meal uses. Estimates only.
        </T>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idea: { borderRadius: 22, padding: 14, gap: 12, borderWidth: 2 },
  ideaTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tip: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
});
