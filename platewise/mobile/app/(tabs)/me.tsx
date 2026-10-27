import React from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Card, Rise } from '../../src/components/Card';
import { Press } from '../../src/components/Press';
import { Icon, type IconName } from '../../src/components/Icon';
import { useTheme, type ThemePref } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { kcal } from '../../src/lib/format';

function Row({ icon, label, detail, onPress }: { icon: IconName; label: string; detail?: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityLabel={detail ? `${label}, ${detail}` : label} style={styles.row}>
      <Icon name={icon} color={c.ink} />
      <T v="body" weight="semibold" style={{ flex: 1 }}>
        {label}
      </T>
      {detail ? (
        <T v="small" muted>
          {detail}
        </T>
      ) : null}
      <Icon name="chevron" color={c.faint} />
    </Press>
  );
}

export default function Me() {
  const { c, pref, setPref } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const prefs: { id: ThemePref; label: string }[] = [
    { id: 'system', label: 'Phone' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];

  return (
    <Screen>
      <Rise>
        <T v="title">Me</T>
      </Rise>

      <Card order={1} style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: c.mint }]}>
          <T v="h2" size={22} weight="heavy" color="#101828">
            A
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2">Ama</T>
          <T v="small" muted>
            Goal 76 kg · Steady pace · {kcal(s.budget)} kcal a day
          </T>
        </View>
      </Card>

      <Card order={2} style={{ gap: 12 }}>
        <T v="label" muted>
          Appearance
        </T>
        <View style={[styles.seg, { backgroundColor: c.bg }]} accessibilityRole="radiogroup" accessibilityLabel="Theme">
          {prefs.map((p) => {
            const on = pref === p.id;
            return (
              <Press
                key={p.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPref(p.id)}
                style={[styles.segItem, on && { backgroundColor: c.button }]}
              >
                <T v="small" weight="bold" color={on ? c.buttonText : c.muted}>
                  {p.label}
                </T>
              </Press>
            );
          })}
        </View>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="body" weight="semibold">
              Hide numbers
            </T>
            <T v="small" muted>
              Show progress without calorie counts.
            </T>
          </View>
          <Switch
            value={s.hideNumbers}
            onValueChange={(v) => dispatch({ type: 'setHideNumbers', value: v })}
            trackColor={{ true: c.mintBorder, false: c.line }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Hide numbers"
          />
        </View>
      </Card>

      <Card order={3} style={{ paddingVertical: 6 }}>
        <Row icon="calendar" label="Week in review" onPress={() => router.push('/week')} />
        <Row icon="progress" label="Weekly check-in" detail="Mondays" onPress={() => router.push('/checkin')} />
        <Row icon="today" label="Goal and pace" onPress={() => router.push('/onboarding')} />
        <Row icon="info" label="How estimates work" detail="Ranges, not exact" onPress={() => router.push('/coach')} />
      </Card>

      <T v="small" muted center>
        PlateWise prototype · sample data · not medical advice
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
});
