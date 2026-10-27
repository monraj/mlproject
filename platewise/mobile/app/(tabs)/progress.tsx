import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Card, Rise } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Press } from '../../src/components/Press';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { trendLine, weeklyRate, type TrendPoint } from '../../src/state/calc';
import { daysBetween, dayKey, shiftKey, shortDate } from '../../src/lib/dates';
import { easeOut, spring } from '../../src/lib/motion';
import { font } from '../../src/theme/tokens';

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);
const AG = Animated.createAnimatedComponent(View);

const H = 210;
const PAD_L = 30;
const AHEAD_WEEKS = 12;

function polyLength(pts: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

type ChartProps = { width: number; points: TrendPoint[]; goal: number; rate: number; spanDays: number };

/** Weigh-ins (dots), the smoothed trend (line, draws on) and a forecast band ahead. */
function Chart({ width, points, goal, rate, spanDays }: ChartProps) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const end = points[points.length - 1];
  const start = shiftKey(end.date, -spanDays);
  const past = points.filter((p) => p.date >= start);
  const plotW = width - PAD_L - 6;
  const pastW = plotW * 0.45;
  // Forecast: current trend continues, with a widening ±40% band on the rate.
  const fut = [0, 4, 8, AHEAD_WEEKS].map((w) => ({ w, mid: end.trend + rate * w, lo: end.trend + rate * w * 1.4, hi: end.trend + rate * w * 0.6 }));
  const all = [...past.flatMap((p) => [p.kg, p.trend]), ...fut.flatMap((f) => [f.lo, f.hi]), goal];
  const kgMin = Math.floor(Math.min(...all) - 0.5);
  const kgMax = Math.ceil(Math.max(...all) + 0.5);
  const y = (kg: number) => 14 + ((kgMax - kg) / (kgMax - kgMin || 1)) * (H - 44);
  const span = Math.max(1, daysBetween(past[0].date, end.date));
  const xPast = (d: string) => PAD_L + (daysBetween(past[0].date, d) / span) * pastW;
  const xFut = (w: number) => PAD_L + pastW + (w / AHEAD_WEEKS) * (plotW - pastW);

  const trendPts: [number, number][] = past.map((p) => [xPast(p.date), y(p.trend)]);
  const trendD = trendPts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const len = Math.max(1, polyLength(trendPts));
  const bandD = fut.map((f, i) => `${i ? 'L' : 'M'}${xFut(f.w).toFixed(1)} ${y(f.hi).toFixed(1)}`).join(' ') + ' ' + [...fut].reverse().map((f) => `L${xFut(f.w).toFixed(1)} ${y(f.lo).toFixed(1)}`).join(' ') + ' Z';
  const midD = fut.map((f, i) => `${i ? 'L' : 'M'}${xFut(f.w).toFixed(1)} ${y(f.mid).toFixed(1)}`).join(' ');
  const last = trendPts[trendPts.length - 1];
  const step = Math.max(1, Math.round((kgMax - kgMin) / 3));
  const ticks = Array.from({ length: 4 }, (_, i) => kgMax - i * step).filter((k) => k >= kgMin);

  const draw = useSharedValue(reduce ? 1 : 0);
  const band = useSharedValue(reduce ? 1 : 0);
  const dot = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    draw.value = 0;
    dot.value = 0;
    band.value = 0;
    draw.value = withDelay(200, withTiming(1, { duration: 1200, easing: easeOut }));
    dot.value = withDelay(1350, withSpring(1, spring.pop));
    band.value = withDelay(1450, withTiming(1, { duration: 700 }));
  }, [reduce, draw, dot, band, spanDays, points.length]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }));
  const dotProps = useAnimatedProps(() => ({ r: 6 * dot.value }));
  const bandStyle = useAnimatedStyle(() => ({ opacity: band.value }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, draw.value * 3) }));
  const label = { fontFamily: font.semibold, fontSize: 11 };
  const goalVisible = goal >= kgMin && goal <= kgMax;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Weight trend ${end.trend.toFixed(1)} kilograms now. ${rate ? `Likely about ${fut[3].mid.toFixed(1)} kilograms in ${AHEAD_WEEKS} weeks.` : ''} Goal ${goal} kilograms.`}
    >
      <Svg width={width} height={H}>
        {ticks.map((kg) => (
          <React.Fragment key={kg}>
            <Line x1={PAD_L} x2={width} y1={y(kg)} y2={y(kg)} stroke={c.line} />
            <SvgText x={0} y={y(kg) + 4} fill={c.muted} {...label}>
              {kg}
            </SvgText>
          </React.Fragment>
        ))}
        {goalVisible ? (
          <>
            <Line x1={PAD_L} x2={width} y1={y(goal)} y2={y(goal)} stroke={c.amber} strokeWidth={1.5} strokeDasharray="5 4" />
            <SvgText x={width - 2} y={y(goal) - 6} fill={c.amberText} fontFamily={font.bold} fontSize={11} textAnchor="end">
              Goal {goal} kg
            </SvgText>
          </>
        ) : null}
        <Line x1={last[0]} x2={last[0]} y1={10} y2={H - 30} stroke={c.line} strokeDasharray="2 3" />
        <SvgText x={last[0]} y={H - 8} fill={c.ink} fontFamily={font.bold} fontSize={11} textAnchor="middle">
          Now
        </SvgText>
        <SvgText x={PAD_L} y={H - 8} fill={c.muted} {...label}>
          {shortDate(past[0].date)}
        </SvgText>
        <SvgText x={width - 2} y={H - 8} fill={c.muted} textAnchor="end" {...label}>
          +{AHEAD_WEEKS} wks
        </SvgText>
        <APath d={trendD} stroke={c.mint} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[len, len]} animatedProps={lineProps} />
        <ACircle cx={last[0]} cy={last[1]} fill={c.raised} stroke={c.mint} strokeWidth={3} animatedProps={dotProps} />
      </Svg>
      <AG pointerEvents="none" style={[StyleSheet.absoluteFill, dotsStyle]}>
        <Svg width={width} height={H}>
          {past.map((p) => (
            <Circle key={p.date} cx={xPast(p.date)} cy={y(p.kg)} r={3} fill={c.faint} />
          ))}
        </Svg>
      </AG>
      {rate ? (
        <AG pointerEvents="none" style={[StyleSheet.absoluteFill, bandStyle]}>
          <Svg width={width} height={H}>
            <Path d={bandD} fill={c.mint} fillOpacity={0.16} />
            <Path d={midD} stroke={c.mint} strokeWidth={2} strokeDasharray="4 4" fill="none" />
          </Svg>
        </AG>
      ) : null}
    </View>
  );
}

const SPANS = { '1M': 30, '3M': 90, All: 3650 } as const;

export default function Progress() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const [w, setW] = useState(0);
  const [span, setSpan] = useState<keyof typeof SPANS>('3M');
  const p = s.profile!;
  const points = useMemo(() => trendLine(s.weights), [s.weights]);
  const measured = weeklyRate(s.weights);
  const losing = p.goalKg < p.weightKg;
  const planned = losing ? -p.paceKgWeek : p.goalKg > p.weightKg ? p.paceKgWeek : 0;
  const rate = measured ?? planned;
  const now = points[points.length - 1];
  const startKg = p.startWeightKg;
  const moved = now ? now.trend - startKg : 0;
  const toGo = now ? Math.abs(now.trend - p.goalKg) : Math.abs(p.weightKg - p.goalKg);
  const weeksToGoal = now && rate && Math.sign(p.goalKg - now.trend) === Math.sign(rate) ? Math.ceil(toGo / Math.abs(rate)) : null;
  const today = dayKey();

  const removeWeight = (date: string) => {
    const go = () => dispatch({ type: 'deleteWeight', date });
    if (Platform.OS === 'web') return go();
    Alert.alert('Delete this weigh-in?', shortDate(date), [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  };

  let note: string;
  if (measured == null) note = 'Weigh in a few times a week. After about a week your trend and forecast appear here.';
  else if (losing && measured < 0 && Math.abs(measured) < p.paceKgWeek * 0.8) note = 'A little slower than planned. That’s normal: weight loss eases as your body adapts. Keep logging and your weekly check-in adjusts the budget.';
  else if (losing && measured >= 0) note = 'Your trend is flat or rising. Water and salt move the scale day to day, so look at the line, and check portions of oily dishes.';
  else note = 'Right on pace. Keep the same rhythm.';

  return (
    <Screen>
      <Rise style={styles.head}>
        <View style={{ gap: 2, flex: 1 }}>
          <T v="small" weight="semibold" muted>
            Your trend and what’s ahead
          </T>
          <T v="title">Progress</T>
        </View>
        <View style={[styles.seg, { backgroundColor: c.surface }]} accessibilityRole="tablist">
          {(Object.keys(SPANS) as (keyof typeof SPANS)[]).map((k) => (
            <Press key={k} onPress={() => setSpan(k)} accessibilityRole="tab" accessibilityState={{ selected: span === k }} style={[styles.segItem, span === k && { backgroundColor: c.raised }]}>
              <T v="small" weight={span === k ? 'bold' : 'semibold'} color={span === k ? c.ink : c.muted}>
                {k}
              </T>
            </Press>
          ))}
        </View>
      </Rise>

      <View style={styles.stats}>
        <Card order={1} style={{ flex: 1, gap: 2 }}>
          <T v="small" weight="semibold" muted>
            Trend weight
          </T>
          <T v="title" size={26}>
            {now ? `${now.trend.toFixed(1)} kg` : `${p.weightKg} kg`}
          </T>
          <T v="small" weight="bold" color={c.mintText}>
            {Math.abs(moved) < 0.05 ? 'Since you started' : `${moved < 0 ? 'Down' : 'Up'} ${Math.abs(moved).toFixed(1)} kg`}
          </T>
        </Card>
        <Card order={2} style={{ flex: 1, gap: 2 }}>
          <T v="small" weight="semibold" muted>
            Goal
          </T>
          <T v="title" size={26}>
            {p.goalKg} kg
          </T>
          <T v="small" muted>
            {toGo < 0.1 ? 'You’re there' : `${toGo.toFixed(1)} kg to go${weeksToGoal ? ` · ~${weeksToGoal} wks` : ''}`}
          </T>
        </Card>
      </View>

      <Card order={3} style={{ paddingHorizontal: 12, gap: 10 }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w > 0 && points.length >= 2 ? (
            <Chart width={w} points={points} goal={p.goalKg} rate={rate} spanDays={SPANS[span]} />
          ) : (
            <View style={{ height: H, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <T muted center>
                Log your weight on at least two days to see your trend line.
              </T>
            </View>
          )}
        </View>
        <View style={styles.legend}>
          <View style={styles.key}>
            <View style={{ width: 16, height: 4, borderRadius: 2, backgroundColor: c.mint }} />
            <T v="small" size={12} muted>
              Trend
            </T>
          </View>
          <View style={styles.key}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.faint }} />
            <T v="small" size={12} muted>
              Weigh-ins
            </T>
          </View>
          <View style={styles.key}>
            <View style={{ width: 16, height: 10, borderRadius: 3, backgroundColor: c.mintTint }} />
            <T v="small" size={12} muted>
              Likely range
            </T>
          </View>
        </View>
      </Card>

      <Card order={4} tone="mint" style={{ gap: 6 }}>
        <T v="body" weight="bold" color={c.mintDeep}>
          {measured == null ? 'Your trend is warming up' : `About ${Math.abs(measured).toFixed(2)} kg a week ${measured < 0 ? 'down' : 'up'}`}
        </T>
        <T v="small" color={c.mintDeep}>
          {note}
        </T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <Chip label="Your week in review" tone="dark" onPress={() => router.push('/week')} />
          <Chip label="Weekly check-in" onPress={() => router.push('/checkin')} />
        </View>
      </Card>

      <Press onPress={() => router.push('/weigh')} style={[styles.weigh, { backgroundColor: c.surface }]} accessibilityLabel="Log today's weight">
        <Icon name="scale" color={c.ink} />
        <T v="body" weight="bold" style={{ flex: 1 }}>
          {s.weights.some((x) => x.date === today) ? 'Update today’s weight' : 'Log today’s weight'}
        </T>
        <Icon name="chevron" color={c.muted} />
      </Press>

      {s.weights.length ? (
        <Card order={5} style={{ gap: 4 }}>
          <T v="label" muted>
            Recent weigh-ins · hold to delete
          </T>
          {[...s.weights].reverse().slice(0, 8).map((x) => (
            <Press key={x.date} onLongPress={() => removeWeight(x.date)} accessibilityLabel={`${shortDate(x.date)}, ${x.kg} kilograms. Hold to delete`} style={styles.wrow}>
              <T v="body" style={{ flex: 1 }}>
                {x.date === today ? 'Today' : shortDate(x.date)}
              </T>
              <T v="body" weight="bold">
                {x.kg} kg
              </T>
            </Press>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end' },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 2 },
  segItem: { height: 34, paddingHorizontal: 12, borderRadius: 17, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', paddingHorizontal: 4 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weigh: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 20 },
  wrow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
});
