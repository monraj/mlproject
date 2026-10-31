import React, { useEffect, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Press } from './Press';
import { T } from './T';
import { Bar } from './Bar';
import { useTheme } from '../theme/ThemeProvider';
import { recommend, type DeviceInfo, type Recommendation } from '../ai/capability';
import { readDevice } from '../ai/device';
import { MODELS, formatGb, modelBytes, type GemmaModel } from '../ai/models';
import { cancelDownload, deleteModel, downloadModel, setAiMode, useGemma, type AiMode } from '../ai/modelStore';

const GEMMA_TERMS = 'https://ai.google.dev/gemma/terms';

const MODES: { id: AiMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Uses the server when it answers, and Gemma on this phone when it does not.' },
  { id: 'online', label: 'Online', hint: 'Always uses the server.' },
  { id: 'offline', label: 'Offline', hint: 'Always uses Gemma on this phone. Nothing leaves the phone.' },
];

export function OnDeviceAi({ order }: { order: number }) {
  const { c } = useTheme();
  const g = useGemma();
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [choice, setChoice] = useState<GemmaModel | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' || g.installed || g.download) return;
    let live = true;
    readDevice().then((d) => {
      if (!live) return;
      const r = recommend(d);
      setDevice(d);
      setRec(r);
      setChoice((cur) => cur ?? r.model);
    });
    return () => {
      live = false;
    };
  }, [g.installed, g.download]);

  if (Platform.OS === 'web') return null;

  const installed = g.installed ? MODELS[g.installed] : null;
  const confirmDelete = () =>
    Alert.alert('Delete the on-device model?', `This frees ${formatGb(modelBytes(installed as GemmaModel))}. You can download it again later.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void deleteModel() },
    ]);

  return (
    <Card order={order} style={{ gap: 6 }}>
      <T v="label" muted>
        On-device AI (works offline)
      </T>

      {installed ? (
        <>
          <T v="small" weight="semibold" color={c.mintText}>
            Ready · {installed.label}
          </T>
          <T v="small" muted>
            {installed.vision ? 'Photo scan, logging, Coach, ideas and labels can run without internet.' : 'Logging, Coach and ideas can run without internet. Photo scan needs the server.'}
          </T>
          <View style={[styles.seg, { backgroundColor: c.bg }]} accessibilityRole="radiogroup">
            {MODES.map((m) => (
              <Press
                key={m.id}
                onPress={() => void setAiMode(m.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: g.mode === m.id }}
                style={[styles.segItem, { backgroundColor: g.mode === m.id ? c.button : 'transparent' }]}
              >
                <T v="small" weight="bold" color={g.mode === m.id ? c.buttonText : c.muted}>
                  {m.label}
                </T>
              </Press>
            ))}
          </View>
          <T v="small" muted>
            {MODES.find((m) => m.id === g.mode)?.hint}
          </T>
          <Press onPress={confirmDelete} accessibilityRole="button" style={styles.textBtn}>
            <T v="small" weight="bold" color={c.muted}>
              Delete model
            </T>
          </Press>
        </>
      ) : g.download ? (
        <>
          <T v="small" weight="semibold">
            Downloading {MODELS[g.download.model].label}
          </T>
          <Bar value={g.download.total ? g.download.done / g.download.total : 0} color={c.mint} track={c.line} height={10} />
          <T v="small" muted>
            {formatGb(g.download.done)} of {formatGb(g.download.total)} · keep the app open and stay on Wi-Fi
          </T>
          <Press onPress={() => void cancelDownload()} accessibilityRole="button" style={styles.textBtn}>
            <T v="small" weight="bold" color={c.muted}>
              Pause
            </T>
          </Press>
        </>
      ) : !rec ? (
        <T v="small" muted>
          Checking what this phone can run…
        </T>
      ) : choice ? (
        <>
          <T v="small" weight="semibold">
            {choice.id === rec.model?.id ? 'Recommended' : 'Selected'} for {device?.name ?? 'this phone'}: {choice.label}
          </T>
          {rec.reasons.map((r) => (
            <T key={r} v="small" muted>
              • {r}
            </T>
          ))}
          <T v="small" muted>
            Works offline: {(choice.vision ? ['Photo scan', 'Voice and text logging', 'Coach chat', 'Meal ideas', 'Packaged-food labels'] : ['Voice and text logging', 'Coach chat', 'Meal ideas']).join(', ')}.
          </T>
          <T v="small" muted>
            One-time download of {formatGb(modelBytes(choice))}. Use Wi-Fi; mobile data charges may apply.
          </T>
          {g.error ? (
            <T v="small" weight="semibold" color={c.amberText}>
              {g.error}
            </T>
          ) : null}
          <T v="small" muted>
            Gemma is provided under and subject to the Gemma Terms of Use. By downloading it you agree to those terms and Google’s Gemma Prohibited Use Policy.
          </T>
          <Press onPress={() => void Linking.openURL(GEMMA_TERMS)} accessibilityRole="link" style={styles.textBtn}>
            <T v="small" weight="bold" color={c.mintText}>
              Read the Gemma Terms of Use
            </T>
          </Press>
          <Press onPress={() => void downloadModel(choice.id)} accessibilityRole="button" style={[styles.saveBtn, { backgroundColor: c.button }]}>
            <T v="small" weight="bold" color={c.buttonText}>
              Download {choice.label} ({formatGb(modelBytes(choice))})
            </T>
          </Press>
          {rec.alternative && choice.id === rec.model?.id ? (
            <Press onPress={() => setChoice(rec.alternative)} accessibilityRole="button" style={styles.textBtn}>
              <T v="small" weight="bold" color={c.mintText}>
                Use the smaller {rec.alternative.label} instead ({formatGb(modelBytes(rec.alternative))}, no photo scan)
              </T>
            </Press>
          ) : null}
          {rec.model && choice.id !== rec.model.id ? (
            <Press onPress={() => setChoice(rec.model)} accessibilityRole="button" style={styles.textBtn}>
              <T v="small" weight="bold" color={c.mintText}>
                Back to the recommended {rec.model.label}
              </T>
            </Press>
          ) : null}
        </>
      ) : (
        <>
          {rec.reasons.map((r) => (
            <T key={r} v="small" muted>
              • {r}
            </T>
          ))}
          <T v="small" muted>
            On-device AI is not available on this phone, so the app uses the server.
          </T>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 4, marginTop: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4, paddingHorizontal: 16 },
  textBtn: { minHeight: 44, justifyContent: 'center' },
});
