import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { font, type FontWeight } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

type Variant = 'display' | 'title' | 'h2' | 'body' | 'small' | 'label' | 'number';

const variants: Record<Variant, TextStyle & { weight: FontWeight }> = {
  display: { fontSize: 44, lineHeight: 50, letterSpacing: -1.4, weight: 'heavy' },
  number: { fontSize: 34, lineHeight: 38, letterSpacing: -1, weight: 'heavy' },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.8, weight: 'heavy' },
  h2: { fontSize: 17, lineHeight: 22, letterSpacing: -0.2, weight: 'bold' },
  body: { fontSize: 15, lineHeight: 21, weight: 'medium' },
  small: { fontSize: 13, lineHeight: 18, weight: 'medium' },
  label: { fontSize: 12, lineHeight: 16, letterSpacing: 0.8, weight: 'bold', textTransform: 'uppercase' },
};

type Props = TextProps & {
  v?: Variant;
  weight?: FontWeight;
  color?: string;
  muted?: boolean;
  size?: number;
  center?: boolean;
};

export function T({ v = 'body', weight, color, muted, size, center, style, ...rest }: Props) {
  const { c } = useTheme();
  const { weight: base, ...vs } = variants[v];
  const fontSize = size ?? vs.fontSize;
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={1.6}
      style={[
        vs,
        {
          fontFamily: font[weight ?? base],
          color: color ?? (muted ? c.muted : c.ink),
          fontSize,
          lineHeight: size ? Math.round(size * 1.2) : vs.lineHeight,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}
