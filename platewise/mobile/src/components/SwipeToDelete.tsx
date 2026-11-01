import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { duration, easeOut, spring } from '../lib/motion';

export type SwipeToDeleteHandle = { dismiss: () => void };

type Props = { children: React.ReactNode; onDelete: () => void; radius?: number };

// Past this share of the row's width, letting go deletes.
const THRESHOLD = 0.32;

/**
 * Drag left to delete: a bin grows behind the row, the phone ticks when letting go will delete,
 * and the row flies off. dismiss() runs the same exit for a long-press. Reduce Motion skips straight
 * to the result (CLAUDE.md rule 8).
 */
export const SwipeToDelete = forwardRef<SwipeToDeleteHandle, Props>(function SwipeToDelete({ children, onDelete, radius = 20 }, ref) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(360);
  const x = useSharedValue(0);
  const armed = useSharedValue(0);
  const pop = useSharedValue(1);

  const tick = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  const done = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onDelete();
  };

  const flyOff = () => {
    'worklet';
    if (reduce) {
      runOnJS(done)();
      return;
    }
    x.value = withTiming(-width * 1.1, { duration: duration.base, easing: easeOut }, (finished) => {
      if (finished) runOnJS(done)();
    });
  };

  useImperativeHandle(ref, () => ({
    dismiss: () => {
      if (reduce) return done();
      // A little nudge right first, so the long-press reads as "picked up, thrown away".
      x.value = withSequence(withTiming(14, { duration: 110 }), withTiming(-width * 1.1, { duration: duration.base + 60, easing: easeOut }, (f) => f && runOnJS(done)()));
    },
  }));

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      // Resist dragging right; follow the finger to the left.
      x.value = e.translationX > 0 ? e.translationX * 0.15 : e.translationX;
      const past = -x.value > width * THRESHOLD ? 1 : 0;
      if (past !== armed.value) {
        armed.value = past;
        pop.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, spring.pop));
        runOnJS(tick)();
      }
    })
    .onEnd((e) => {
      if (-x.value > width * THRESHOLD || e.velocityX < -900) flyOff();
      else {
        x.value = withSpring(0, spring.sheet);
        armed.value = 0;
      }
    });

  const row = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { rotateZ: `${interpolate(x.value, [-width, 0], [-4, 0], Extrapolation.CLAMP)}deg` }],
    opacity: interpolate(x.value, [-width, -width * 0.5, 0], [0, 0.85, 1], Extrapolation.CLAMP),
  }));
  const bin = useAnimatedStyle(() => {
    const p = interpolate(-x.value, [0, width * THRESHOLD], [0, 1], Extrapolation.CLAMP);
    return { opacity: p, transform: [{ scale: (0.55 + 0.45 * p) * pop.value }, { rotateZ: `${armed.value ? -12 : 0}deg` }] };
  });
  const back = useAnimatedStyle(() => ({
    backgroundColor: armed.value ? c.amber : c.amberTint,
    opacity: interpolate(-x.value, [0, 24], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.back, { borderRadius: radius }, back]}>
        <Animated.View style={bin}>
          <Icon name="trash" color={c.ink} size={24} />
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={row}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  back: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: 24 },
});
