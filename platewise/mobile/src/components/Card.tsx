import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { duration, stagger } from '../lib/motion';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'mint' | 'amber' | 'hero' | 'outline';
  /** Position in an entrance sequence; cards rise in 80 ms apart. Omit for no entrance. */
  order?: number;
  baseDelay?: number;
};

export function Card({ children, style, tone = 'surface', order, baseDelay = 0 }: Props) {
  const { c } = useTheme();
  const bg =
    tone === 'mint' ? c.mintTint : tone === 'amber' ? c.amberTint : tone === 'hero' ? c.hero : tone === 'outline' ? 'transparent' : c.surface;
  const border = tone === 'outline' ? { borderWidth: 2, borderStyle: 'dashed' as const, borderColor: c.line } : null;
  const base: StyleProp<ViewStyle> = [{ backgroundColor: bg, borderRadius: radius.card, padding: 16 }, border, style];
  if (order == null) return <View style={base}>{children}</View>;
  return (
    <Animated.View entering={FadeInDown.duration(duration.slow).delay(baseDelay + order * stagger)} style={base}>
      {children}
    </Animated.View>
  );
}

/** Generic entrance wrapper for anything that isn't a card. */
export function Rise({ children, order = 0, baseDelay = 0, style }: { children: React.ReactNode; order?: number; baseDelay?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeInDown.duration(duration.slow).delay(baseDelay + order * stagger)} style={style}>
      {children}
    </Animated.View>
  );
}
