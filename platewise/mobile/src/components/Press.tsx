import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { spring } from '../lib/motion';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  haptic?: boolean;
  scaleTo?: number;
};

/** Pressable that springs down slightly on press (the house "press" feel). */
export function Press({ style, haptic = false, scaleTo = 0.97, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <APressable
      {...rest}
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      onPressIn={(e) => {
        if (!reduce) scale.value = withSpring(scaleTo, spring.press);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, spring.press);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => undefined);
        onPress?.(e);
      }}
      style={[style, aStyle]}
    />
  );
}
