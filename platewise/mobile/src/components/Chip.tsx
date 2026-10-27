import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { Press } from './Press';
import { T } from './T';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'mint' | 'amber' | 'dark';
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected, onPress, tone = 'default', style }: Props) {
  const { c } = useTheme();
  let bg = c.surface;
  let fg = c.ink;
  let border = 'transparent';
  if (selected) {
    bg = c.button;
    fg = c.buttonText;
  } else if (tone === 'mint') {
    bg = c.mintTint;
    fg = c.mintDeep;
  } else if (tone === 'amber') {
    bg = c.amberTint;
    fg = c.amberText;
    border = c.amber;
  } else if (tone === 'dark') {
    bg = c.button;
    fg = c.buttonText;
  }
  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={[
        { minHeight: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: bg, borderWidth: 1.5, borderColor: border, justifyContent: 'center' },
        style,
      ]}
    >
      <T v="small" weight="bold" color={fg}>
        {label}
      </T>
    </Press>
  );
}
