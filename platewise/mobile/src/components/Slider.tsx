import React, { useRef, useState } from 'react';
import { PanResponder, View, type LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeProvider';
import { clamp } from '../lib/format';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  likelyLow?: number;
  likelyHigh?: number;
  onChange: (v: number) => void;
  label: string;
};

/**
 * Portion slider. The tinted band shows the AI's likely range; the thumb is the user's choice.
 * Dragging moves the value; tapping the track jumps there. Screen readers get +/- steps.
 */
export function Slider({ value, min, max, step = 5, likelyLow, likelyHigh, onChange, label }: Props) {
  const { c } = useTheme();
  const [width, setWidth] = useState(0);
  const track = useRef<View>(null);
  const geo = useRef({ x: 0, w: 1 });
  const last = useRef(value);
  const cb = useRef(onChange);
  cb.current = onChange;
  const bounds = useRef({ min, max, step });
  bounds.current = { min, max, step };

  const emit = (pageX: number) => {
    const { min: lo, max: hi, step: st } = bounds.current;
    const x = clamp(pageX - geo.current.x, 0, geo.current.w);
    const v = clamp(Math.round((lo + (x / geo.current.w) * (hi - lo)) / st) * st, lo, hi);
    if (v === last.current) return;
    // A light tick every 25 g so the drag feels like turning a dial.
    if (Math.floor(v / 25) !== Math.floor(last.current / 25)) Haptics.selectionAsync().catch(() => undefined);
    last.current = v;
    cb.current(v);
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const pageX = e.nativeEvent.pageX;
        track.current?.measureInWindow((x, _y, w) => {
          geo.current = { x, w: w || 1 };
          emit(pageX);
        });
      },
      onPanResponderMove: (e) => emit(e.nativeEvent.pageX),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pos = (v: number) => ((v - min) / (max - min)) * width;
  const bandL = likelyLow != null ? pos(likelyLow) : 0;
  const bandR = likelyHigh != null ? pos(likelyHigh) : 0;

  return (
    <View
      ref={track}
      onLayout={onLayout}
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: `${value} grams` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const d = e.nativeEvent.actionName === 'increment' ? step * 2 : -step * 2;
        onChange(clamp(value + d, min, max));
      }}
      style={{ height: 36, justifyContent: 'center', flexGrow: 1 }}
    >
      <View pointerEvents="none" style={{ height: 6, borderRadius: 3, backgroundColor: c.line }} />
      {likelyLow != null && likelyHigh != null ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: bandL, width: Math.max(0, bandR - bandL), height: 6, borderRadius: 3, backgroundColor: c.mintLight }}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: pos(value) - 13,
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: c.raised,
          borderWidth: 3,
          borderColor: c.mintBorder,
        }}
      />
    </View>
  );
}
