import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { Press } from './Press';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'surface' | 'dark' | 'clear';
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({ icon, label, onPress, tone = 'surface', size = 44, style }: Props) {
  const { c } = useTheme();
  const bg = tone === 'surface' ? c.surface : tone === 'dark' ? 'rgba(255,255,255,0.14)' : 'transparent';
  const fg = tone === 'dark' ? '#FFFFFF' : c.ink;
  return (
    <Press
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={6}
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}
    >
      <Icon name={icon} size={20} color={fg} />
    </Press>
  );
}
