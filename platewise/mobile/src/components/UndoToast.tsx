import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeOutDown, SlideInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Press } from './Press';
import { T } from './T';
import { useTheme } from '../theme/ThemeProvider';

type Props = { text: string; onUndo: () => void; onDone: () => void; ms?: number };

/** "Meal removed · Undo" with a bar that runs down; gone after a few seconds. */
export function UndoToast({ text, onUndo, onDone, ms = 5000 }: Props) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const left = useSharedValue(1);

  useEffect(() => {
    left.value = withTiming(0, { duration: ms, easing: Easing.linear });
    const t = setTimeout(onDone, ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const bar = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }));

  return (
    <Animated.View entering={reduce ? undefined : SlideInDown.springify().damping(16)} exiting={reduce ? undefined : FadeOutDown.duration(200)} style={[styles.toast, { backgroundColor: c.button }]}>
      <View style={styles.row}>
        <T v="body" weight="semibold" color={c.buttonText} style={{ flex: 1 }} numberOfLines={1}>
          {text}
        </T>
        <Press onPress={onUndo} haptic accessibilityLabel="Undo" style={styles.undo}>
          <T v="body" weight="bold" color={c.buttonText}>
            Undo
          </T>
        </Press>
      </View>
      <Animated.View style={[styles.bar, { backgroundColor: c.mint }, bar]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, bottom: 104, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 6, minHeight: 56 },
  undo: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  bar: { height: 3, transformOrigin: 'left' },
});
