import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Press } from './Press';
import { T } from './T';
import { Icon, type IconName } from './Icon';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  grow?: boolean;
  accessibilityHint?: string;
  /** Override colours for buttons on fixed-colour backgrounds (e.g. the dark recap story). */
  bgColor?: string;
  fgColor?: string;
};

export function Button({ label, onPress, kind = 'primary', icon, style, grow, accessibilityHint, bgColor, fgColor }: Props) {
  const { c } = useTheme();
  const bg = bgColor ?? (kind === 'primary' ? c.button : kind === 'secondary' ? c.surface : 'transparent');
  const fg = fgColor ?? (kind === 'primary' ? c.buttonText : c.ink);
  return (
    <Press
      haptic
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      style={[styles.base, { backgroundColor: bg }, grow && { flexGrow: 1 }, style]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={18} color={fg} strokeWidth={2.2} /> : null}
        <T v="h2" color={fg}>
          {label}
        </T>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
