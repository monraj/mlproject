import React, { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import { Card } from './Card';
import { Press } from './Press';
import { T } from './T';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../state/AppState';
import { ACTIVITY_CAP } from '../state/calc';
import { kcal } from '../lib/format';
import { connectWatch, openWatchSettings, watchStatus, type WatchStatus } from '../health/watch';
import { syncNow } from '../health/WatchSync';

const HC_STORE = 'market://details?id=com.google.android.apps.healthdata';

function sleepText(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Connect a smartwatch through Health Connect, see today's data, and choose whether exercise adds to the daily target. */
export function SmartwatchCard({ order }: { order: number }) {
  const { c } = useTheme();
  const { s, day, dispatch } = useApp();
  const p = s.profile!;
  const watch = p.watch ?? { connected: false, adjustBudget: false };
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    watchStatus().then(setStatus);
  }, []);

  if (Platform.OS !== 'android' || status === 'unsupported') return null;

  const connect = async () => {
    setBusy(true);
    setNote(null);
    try {
      const granted = await connectWatch();
      if (!granted.length) {
        setNote('Nothing was shared. You can choose what to share in Health Connect settings.');
        return;
      }
      dispatch({ type: 'patchProfile', patch: { watch: { ...watch, connected: true } } });
      await syncNow(dispatch);
      setNote(`Connected · sharing ${granted.length} kinds of data`);
    } catch {
      setNote('Could not connect to Health Connect. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const w = day.watch;
  const facts = w
    ? [
        w.steps != null ? `${kcal(w.steps)} steps` : null,
        w.activeKcal != null && !p.hideNumbers ? `${kcal(w.activeKcal)} kcal active` : null,
        w.exerciseMin ? `${w.exerciseMin} min exercise` : null,
        w.sleepMin ? `slept ${sleepText(w.sleepMin)}` : null,
        w.restingHr ? `resting heart ${w.restingHr} bpm` : null,
      ].filter(Boolean)
    : [];

  return (
    <Card order={order} style={{ gap: 8 }}>
      <T v="label" muted>
        Smartwatch
      </T>
      {status === 'unavailable' ? (
        <T v="small" muted>
          This phone doesn&apos;t have Health Connect, which watch apps use to share data with PlateWise.
        </T>
      ) : status === 'needs_update' ? (
        <>
          <T v="small" muted>
            Health Connect needs an update before PlateWise can read your watch.
          </T>
          <Press onPress={() => void Linking.openURL(HC_STORE)} accessibilityRole="button" style={styles.textBtn}>
            <T v="small" weight="bold" color={c.mintText}>
              Update Health Connect
            </T>
          </Press>
        </>
      ) : !watch.connected ? (
        <>
          <T v="small" muted>
            Read steps, exercise, calories burned, sleep, heart rate and weigh-ins from your watch or smart scale through Health Connect (Samsung Health, Fitbit / Pixel Watch and most watch apps). Read-only, and it stays on this phone.
          </T>
          {note ? (
            <T v="small" weight="semibold" color={c.amberText}>
              {note}
            </T>
          ) : null}
          <Press onPress={connect} accessibilityRole="button" style={[styles.btn, { backgroundColor: c.button }]}>
            <T v="small" weight="bold" color={c.buttonText}>
              {busy ? 'Connecting…' : 'Connect a smartwatch'}
            </T>
          </Press>
        </>
      ) : (
        <>
          <T v="small" weight="semibold" color={c.mintText}>
            {facts.length ? `Today: ${facts.join(' · ')}` : 'Connected · no watch data for today yet'}
          </T>
          {w?.sources.length ? (
            <T v="small" muted>
              From {w.sources.join(', ')}
            </T>
          ) : null}
          <View style={styles.switchRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="body" weight="semibold">
                Add exercise to my daily target
              </T>
              <T v="small" muted>
                Adds half of the active calories your watch measured, up to {ACTIVITY_CAP} a day. Watches tend to overestimate, so half is safer.
              </T>
            </View>
            <Switch
              value={watch.adjustBudget}
              onValueChange={(v) => dispatch({ type: 'patchProfile', patch: { watch: { ...watch, adjustBudget: v } } })}
              trackColor={{ true: c.mintBorder, false: c.line }}
              thumbColor="#FFFFFF"
              accessibilityLabel="Add exercise to my daily target"
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Press onPress={() => void syncNow(dispatch)} accessibilityRole="button" style={styles.textBtn}>
              <T v="small" weight="bold" color={c.mintText}>
                Sync now
              </T>
            </Press>
            <Press onPress={openWatchSettings} accessibilityRole="button" style={styles.textBtn}>
              <T v="small" weight="bold" color={c.mintText}>
                Choose what to share
              </T>
            </Press>
            <Press onPress={() => dispatch({ type: 'patchProfile', patch: { watch: { connected: false, adjustBudget: false } } })} accessibilityRole="button" style={styles.textBtn}>
              <T v="small" weight="bold" color={c.muted}>
                Disconnect
              </T>
            </Press>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  btn: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  textBtn: { minHeight: 44, justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
