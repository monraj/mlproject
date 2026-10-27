import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { duration, easeOut } from '../lib/motion';

type Props = {
  value: number; // 0..1
  from?: number;
  color: string;
  track: string;
  height?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
};

/** Horizontal bar that grows from the left to its value. */
export function Bar({ value, from = 0, color, track, height = 8, delay = 0, style }: Props) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? value : from);

  useEffect(() => {
    v.value = reduce ? value : withDelay(delay, withTiming(value, { duration: duration.data, easing: easeOut }));
  }, [value, reduce, delay, v]);

  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: Math.max(0.001, Math.min(1, v.value)) }] }));

  return (
    <View style={[{ height, borderRadius: height / 2, backgroundColor: track, overflow: 'hidden' }, style]}>
      <Animated.View
        style={[{ height, width: '100%', borderRadius: height / 2, backgroundColor: color, transformOrigin: 'left' }, fill]}
      />
    </View>
  );
}
