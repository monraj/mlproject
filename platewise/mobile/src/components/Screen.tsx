import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  bg?: string;
  footer?: React.ReactNode;
  padTop?: boolean;
  bottomSpace?: number;
  contentStyle?: StyleProp<ViewStyle>;
  statusLight?: boolean;
};

/** Page wrapper: safe areas, background, optional scrolling body and a pinned footer. */
export function Screen({ children, scroll = true, bg, footer, padTop = true, bottomSpace = 24, contentStyle, statusLight }: Props) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const content = [
    styles.content,
    { paddingTop: padTop ? insets.top + 12 : 0, paddingBottom: (footer ? 12 : insets.bottom) + bottomSpace },
    contentStyle,
  ];
  return (
    <View style={[styles.root, { backgroundColor: bg ?? c.bg }]}>
      <StatusBar style={statusLight || isDark ? 'light' : 'dark'} />
      {scroll ? (
        <ScrollView contentContainerStyle={content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flex: 1 }]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 16 },
  footer: { paddingHorizontal: 18, paddingTop: 8, gap: 10 },
});
