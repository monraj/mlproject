import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duration, easeOut } from '../lib/motion';

const ACircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  stroke: number;
  progress: number; // 0..1
  from?: number; // animate from this progress (e.g. previous total)
  color: string;
  track: string;
  delay?: number;
  ms?: number;
  children?: React.ReactNode;
  label?: string;
};

/** Progress ring that draws itself (motion: "draw-on rings"). */
export function Ring({ size, stroke, progress, from = 0, color, track, delay = 0, ms = duration.dataLong, children, label }: Props) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(reduce ? progress : from);

  useEffect(() => {
    if (reduce) {
      p.value = progress;
    } else {
      p.value = withDelay(delay, withTiming(progress, { duration: ms, easing: easeOut }));
    }
  }, [progress, reduce, delay, ms, p]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - Math.min(1, Math.max(0, p.value))),
  }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={[circ, circ]}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children ? (
        <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}
