import React, { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Card, Rise } from '../../src/components/Card';
import { Press } from '../../src/components/Press';
import { Icon, type IconName } from '../../src/components/Icon';
import { useTheme, type ThemePref } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { kcal } from '../../src/lib/format';
import { profileBudget } from '../../src/state/calc';
import { api, apiBase, saveServerSettings, serverSettings, type Health } from '../../src/api/client';
import { askPermission } from '../../src/lib/reminders';
import { WEEKDAYS } from '../../src/lib/dates';
import { font } from '../../src/theme/tokens';
import type { Reminders } from '../../src/state/types';

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
  const p = s.profile!;
  const [health, setHealth] = useState<Health | null | 'down'>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState(serverSettings().url);
  const [serverCode, setServerCode] = useState(serverSettings().code);
  const [testing, setTesting] = useState(false);
  const check = () => {
    setHealth(null);
    setHealthError(null);
    return api
      .check()
      .then(setHealth)
      .catch((e: Error) => {
        setHealth('down');
        setHealthError(e.message);
      });
  };
  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const saveServer = async () => {
    setTesting(true);
    await saveServerSettings(serverUrl, serverCode);
    setServerUrl(serverSettings().url);
    await check();
    setTesting(false);
  };
  const r = p.reminders;
  const setReminders = async (patch: Partial<Reminders>) => {
    const next = { ...r, ...patch };
    if (patch.on && !(await askPermission())) {
      const msg = 'Allow notifications for PlateWise in your phone settings to get reminders.';
      if (Platform.OS === 'web') return;
      Alert.alert('Notifications are off', msg);
      return;
    }
    dispatch({ type: 'patchProfile', patch: { reminders: next } });
  };
  const confirm = (title: string, body: string, action: string, go: () => void) => {
    if (Platform.OS === 'web') return go();
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      { text: action, style: 'destructive', onPress: go },
    ]);
  };
  const planned = Object.keys(s.plans).length;
  const time = (key: 'breakfast' | 'lunch' | 'dinner', label: string) => (
    <View style={{ flex: 1, gap: 4 }}>
      <T v="small" muted>
        {label}
      </T>
      <TextInput
        defaultValue={r[key]}
        onEndEditing={(e) => {
          const v = e.nativeEvent.text.trim();
          if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) setReminders({ [key]: v.padStart(5, '0') });
        }}
        accessibilityLabel={`${label} reminder time`}
        style={[styles.time, { backgroundColor: c.bg, color: c.ink }]}
      />
    </View>
  );
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
            {(p.name || 'Y')[0].toUpperCase()}
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="h2">{p.name || 'You'}</T>
          <T v="small" muted>
            Goal {p.goalKg} kg · {p.paceKgWeek ? `${p.paceKgWeek} kg a week` : 'Keep steady'}
            {p.hideNumbers ? '' : ` · ${kcal(profileBudget(p))} kcal a day`}
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
            value={p.hideNumbers}
            onValueChange={(v) => dispatch({ type: 'patchProfile', patch: { hideNumbers: v } })}
            trackColor={{ true: c.mintBorder, false: c.line }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Hide numbers"
          />
        </View>
      </Card>

      <Card order={3} style={{ gap: 12 }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="body" weight="semibold">
              Meal reminders
            </T>
            <T v="small" muted>
              Only for meals you haven’t logged yet that day.
            </T>
          </View>
          <Switch value={r.on} onValueChange={(v) => setReminders({ on: v })} trackColor={{ true: c.mintBorder, false: c.line }} thumbColor="#FFFFFF" accessibilityLabel="Meal reminders" />
        </View>
        {r.on ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {time('breakfast', 'Breakfast')}
              {time('lunch', 'Lunch')}
              {time('dinner', 'Dinner')}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <T v="small" muted>
                Weigh-in day
              </T>
              {WEEKDAYS.map((d, i) => (
                <Press key={d} onPress={() => setReminders({ weighDay: i })} accessibilityRole="radio" accessibilityState={{ checked: r.weighDay === i }} style={[styles.day, { backgroundColor: r.weighDay === i ? c.button : c.bg }]}>
                  <T v="small" weight="bold" color={r.weighDay === i ? c.buttonText : c.muted}>
                    {d.slice(0, 2)}
                  </T>
                </Press>
              ))}
            </View>
          </>
        ) : null}
      </Card>

      <Card order={4} style={{ paddingVertical: 6 }}>
        <Row icon="calendar" label="Week in review" onPress={() => router.push('/week')} />
        <Row icon="progress" label="Weekly check-in" onPress={() => router.push('/checkin')} />
        <Row icon="today" label="Goal and pace" detail={`${p.weightKg} → ${p.goalKg} kg`} onPress={() => router.push('/onboarding')} />
        <Row icon="bookmark" label="Saved meals" detail={`${s.saved.length}`} onPress={() => router.push('/saved-meals')} />
        {planned ? <Row icon="calendar" label="Clear planned days" detail={`${planned}`} onPress={() => confirm('Clear planned days?', 'Flex plans and maintenance days go back to your normal budget.', 'Clear', () => dispatch({ type: 'clearPlans' }))} /> : null}
        <Row
          icon="close"
          label="Delete all my data"
          onPress={() => confirm('Delete everything?', 'Your meals, weigh-ins, chat and profile are removed from this phone. This can’t be undone.', 'Delete', () => {
            dispatch({ type: 'reset' });
            router.replace('/onboarding');
          })}
        />
      </Card>

      <Card order={5} style={{ gap: 4 }}>
        <T v="label" muted>
          PlateWise server
        </T>
        <T v="small" weight="semibold" color={health === 'down' ? c.amberText : c.mintText}>
          {health === null ? 'Checking… (a sleeping free server can take a minute)' : health === 'down' ? healthError ?? 'Not connected.' : health.demo ? 'Connected · demo answers (no AI key on the server yet)' : `Connected · AI by ${health.ai}`}
        </T>
        <T v="small" muted>
          Server address
        </T>
        <TextInput
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder={apiBase()}
          placeholderTextColor={c.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          accessibilityLabel="Server address"
          style={[styles.time, { backgroundColor: c.bg, color: c.ink, fontSize: 14 }]}
        />
        <T v="small" muted>
          Access code
        </T>
        <TextInput
          value={serverCode}
          onChangeText={setServerCode}
          placeholder="From your server's settings"
          placeholderTextColor={c.faint}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          accessibilityLabel="Access code"
          style={[styles.time, { backgroundColor: c.bg, color: c.ink, fontSize: 14 }]}
        />
        <Press onPress={saveServer} accessibilityRole="button" style={[styles.saveBtn, { backgroundColor: c.button }]}>
          <T v="small" weight="bold" color={c.buttonText}>
            {testing ? 'Connecting…' : 'Save and connect'}
          </T>
        </Press>
      </Card>

      <T v="small" muted center>
        Estimates for general wellness · not medical advice · your log stays on this phone
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
  time: { height: 44, borderRadius: 12, paddingHorizontal: 12, fontFamily: font.bold, fontSize: 16 },
  saveBtn: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
