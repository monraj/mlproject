import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Card, Rise } from '../../src/components/Card';
import { Chip } from '../../src/components/Chip';
import { Press } from '../../src/components/Press';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { forecastHigh, forecastLow, forecastMid, trend, weighIns } from '../../src/data/sample';
import { easeOut, spring } from '../../src/lib/motion';
import { font } from '../../src/theme/tokens';

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);
const AG = Animated.createAnimatedComponent(View);

const H = 210;
const PAD_L = 28;
const KG_MIN = 75.5;
const KG_MAX = 86;
const GOAL = 76;

function polyLength(pts: [number, number][]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

function Chart({ width }: { width: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const plotW = width - PAD_L - 6;
  const pastW = plotW * 0.3;
  const y = (kg: number) => 14 + ((KG_MAX - kg) / (KG_MAX - KG_MIN)) * (H - 44);
  const xPast = (i: number) => PAD_L + (i / (trend.length - 1)) * pastW;
  const xFut = (i: number) => PAD_L + pastW + (i / (forecastMid.length - 1)) * (plotW - pastW);

  const trendPts: [number, number][] = trend.map((kg, i) => [xPast(i), y(kg)]);
  const trendD = trendPts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const len = polyLength(trendPts);
  const bandD =
    forecastHigh.map((kg, i) => `${i ? 'L' : 'M'}${xFut(i).toFixed(1)} ${y(kg).toFixed(1)}`).join(' ') +
    ' ' +
    [...forecastLow].reverse().map((kg, i) => `L${xFut(forecastLow.length - 1 - i).toFixed(1)} ${y(kg).toFixed(1)}`).join(' ') +
    ' Z';
  const midD = forecastMid.map((kg, i) => `${i ? 'L' : 'M'}${xFut(i).toFixed(1)} ${y(kg).toFixed(1)}`).join(' ');
  const end = trendPts[trendPts.length - 1];

  const draw = useSharedValue(reduce ? 1 : 0);
  const band = useSharedValue(reduce ? 1 : 0);
  const dot = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    draw.value = withDelay(200, withTiming(1, { duration: 1200, easing: easeOut }));
    dot.value = withDelay(1350, withSpring(1, spring.pop));
    band.value = withDelay(1450, withTiming(1, { duration: 700 }));
  }, [reduce, draw, dot, band]);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - draw.value) }));
  const dotProps = useAnimatedProps(() => ({ r: 6 * dot.value }));
  const bandStyle = useAnimatedStyle(() => ({ opacity: band.value }));
  const dotsStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, draw.value * 3) }));

  const label = { fontFamily: font.semibold, fontSize: 11 };

  return (
    <View accessible accessibilityRole="image" accessibilityLabel="Weight trend falling from 84.2 to 82.1 kilograms over six weeks. Likely range reaches 78 to 80 kilograms in about fourteen weeks. Goal 76 kilograms.">
      <Svg width={width} height={H}>
        {[86, 82, 78].map((kg) => (
          <React.Fragment key={kg}>
            <Line x1={PAD_L} x2={width} y1={y(kg)} y2={y(kg)} stroke={c.line} />
            <SvgText x={0} y={y(kg) + 4} fill={c.muted} {...label}>
              {kg}
            </SvgText>
          </React.Fragment>
        ))}
        <Line x1={PAD_L} x2={width} y1={y(GOAL)} y2={y(GOAL)} stroke={c.amber} strokeWidth={1.5} strokeDasharray="5 4" />
        <SvgText x={width - 2} y={y(GOAL) - 6} fill={c.amberText} fontFamily={font.bold} fontSize={11} textAnchor="end">
          Goal 76 kg
        </SvgText>
        <Line x1={end[0]} x2={end[0]} y1={10} y2={H - 30} stroke={c.line} strokeDasharray="2 3" />
        <SvgText x={end[0]} y={H - 8} fill={c.ink} fontFamily={font.bold} fontSize={11} textAnchor="middle">
          Now
        </SvgText>
        <SvgText x={PAD_L} y={H - 8} fill={c.muted} {...label}>
          6 wks ago
        </SvgText>
        <SvgText x={width - 2} y={H - 8} fill={c.muted} textAnchor="end" {...label}>
          +14 wks
        </SvgText>
        <APath
          d={trendD}
          stroke={c.mint}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={[len, len]}
          animatedProps={lineProps}
        />
        <ACircle cx={end[0]} cy={end[1]} fill={c.raised} stroke={c.mint} strokeWidth={3} animatedProps={dotProps} />
      </Svg>
      <AG pointerEvents="none" style={[StyleSheet.absoluteFill, dotsStyle]}>
        <Svg width={width} height={H}>
          {weighIns.map((kg, i) => (
            <Circle key={i} cx={xPast(i)} cy={y(kg)} r={3} fill={c.faint} />
          ))}
        </Svg>
      </AG>
      <AG pointerEvents="none" style={[StyleSheet.absoluteFill, bandStyle]}>
        <Svg width={width} height={H}>
          <Path d={bandD} fill={c.mint} fillOpacity={0.16} />
          <Path d={midD} stroke={c.mint} strokeWidth={2} strokeDasharray="4 4" fill="none" />
        </Svg>
      </AG>
    </View>
  );
}

export default function Progress() {
  const { c } = useTheme();
  const router = useRouter();
  const [w, setW] = useState(0);
  const [span, setSpan] = useState<'1M' | '3M' | 'All'>('3M');

  return (
    <Screen>
      <Rise style={styles.head}>
        <View style={{ gap: 2, flex: 1 }}>
          <T v="small" weight="semibold" muted>
            Last 6 weeks and ahead
          </T>
          <T v="title">Progress</T>
        </View>
        <View style={[styles.seg, { backgroundColor: c.surface }]} accessibilityRole="tablist">
          {(['1M', '3M', 'All'] as const).map((k) => (
            <Press
              key={k}
              onPress={() => setSpan(k)}
              accessibilityRole="tab"
              accessibilityState={{ selected: span === k }}
              style={[styles.segItem, span === k && { backgroundColor: c.raised }]}
            >
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
            82.1 kg
          </T>
          <T v="small" weight="bold" color={c.mintText}>
            Down 2.1 kg
          </T>
        </Card>
        <Card order={2} style={{ flex: 1, gap: 2 }}>
          <T v="small" weight="semibold" muted>
            Goal
          </T>
          <T v="title" size={26}>
            76 kg
          </T>
          <T v="small" muted>
            6.1 kg to go
          </T>
        </Card>
      </View>

      <Card order={3} style={{ paddingHorizontal: 12, gap: 10 }}>
        <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>{w > 0 ? <Chart width={w} /> : <View style={{ height: H }} />}</View>
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
          About 0.35 kg a week
        </T>
        <T v="small" color={c.mintDeep}>
          A little slower than planned. That’s normal: weight loss eases as your body adapts. We’ve updated your daily burn from your weigh-ins, so keep logging.
        </T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          <Chip label="Your week in review" tone="dark" onPress={() => router.push('/week')} />
          <Chip label="Weekly check-in" onPress={() => router.push('/checkin')} />
        </View>
      </Card>

      <Press onPress={() => undefined} style={[styles.weigh, { backgroundColor: c.surface }]} accessibilityLabel="Log today's weight">
        <Icon name="scale" color={c.ink} />
        <T v="body" weight="bold" style={{ flex: 1 }}>
          Log today’s weight
        </T>
        <Icon name="chevron" color={c.muted} />
      </Press>
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
});
