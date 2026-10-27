import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { T } from './T';
import { duration, easeOut } from '../lib/motion';
import { kcal } from '../lib/format';

type Props = {
  value: number;
  size?: number;
  color?: string;
  delay?: number;
};

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function Column({ digit, index, count, line, size, color, delay }: { digit: number; index: number; count: number; line: number; size: number; color?: string; delay: number }) {
  const reduce = useReducedMotion();
  const y = useSharedValue(reduce ? -digit * line : 0);
  useEffect(() => {
    // Rightmost digit lands last: each column runs a little longer than the one before it.
    const ms = duration.data + (index / Math.max(1, count - 1)) * 400;
    y.value = reduce ? -digit * line : withDelay(delay, withTiming(-digit * line, { duration: ms, easing: easeOut }));
  }, [digit, line, reduce, delay, index, count, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  // An invisible copy of the target digit sets the column's width, so a "1" isn't as wide as a "0".
  return (
    <View style={{ height: line, overflow: 'hidden' }}>
      <T v="display" size={size} style={{ height: line, lineHeight: line, opacity: 0 }}>
        {String(digit)}
      </T>
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' }, style]}>
        {DIGITS.map((d) => (
          <T key={d} v="display" size={size} color={color} style={{ height: line, lineHeight: line }}>
            {d}
          </T>
        ))}
      </Animated.View>
    </View>
  );
}

/** Rolling number (motion: "value change"). Digits roll; separators stay put. */
export function Odometer({ value, size = 56, color, delay = 0 }: Props) {
  const text = kcal(value);
  const line = Math.round(size * 1.12);
  const digitCount = text.replace(/\D/g, '').length;
  let di = 0;
  return (
    <View style={{ flexDirection: 'row' }} accessible accessibilityLabel={text}>
      {text.split('').map((ch, i) => {
        if (/\d/.test(ch)) {
          const idx = di++;
          return <Column key={i} digit={Number(ch)} index={idx} count={digitCount} line={line} size={size} color={color} delay={delay} />;
        }
        return (
          <T key={i} v="display" size={size} color={color} style={{ height: line, lineHeight: line }}>
            {ch}
          </T>
        );
      })}
    </View>
  );
}
