import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { T } from '../src/components/T';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { api, ApiError } from '../src/api/client';
import { draftFromFood, productFoods } from '../src/data/foods';
import type { Product } from '../src/state/types';
import { font } from '../src/theme/tokens';

const DARK = '#0C111D';

type Form = { code: string; name: string; kcal: string; protein: string; carbs: string; fat: string; serving: string; servingLabel: string; source: string };
const emptyForm = (code = ''): Form => ({ code, name: '', kcal: '', protein: '', carbs: '', fat: '', serving: '', servingLabel: '1 serving', source: 'user' });
const str = (n: number | null | undefined) => (n == null ? '' : String(Math.round(n * 10) / 10));

/** Barcode: live scanner → Open Food Facts → confirm values → review. Products are remembered on the phone. */
export default function Barcode() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [form, setForm] = useState<Form | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const locked = useRef(false);
  const cam = useRef<CameraView>(null);

  const logProduct = (p: Product) => {
    const f = productFoods({ [p.code]: p })[0];
    dispatch({ type: 'startDraft', items: [draftFromFood(f, p.servingG)], source: 'barcode' });
    router.replace('/scan/review');
  };

  const lookup = async (code: string) => {
    if (locked.current) return;
    locked.current = true;
    Haptics.selectionAsync().catch(() => undefined);
    const known = s.products[code];
    if (known) return logProduct(known);
    setBusy(true);
    setStatus(`Looking up ${code}…`);
    try {
      const p = await api.product(code);
      setForm({ code, name: p.name, kcal: str(p.per100.kcal), protein: str(p.per100.protein), carbs: str(p.per100.carbs), fat: str(p.per100.fat), serving: str(p.serving_g ?? 100), servingLabel: p.serving_label, source: p.source });
      setStatus(p.per100.kcal == null ? 'Found it, but without calories. Add them from the label.' : 'Found it. Check the numbers against the pack.');
    } catch (e) {
      setForm(emptyForm(code));
      setStatus(e instanceof ApiError && e.status === 404 ? 'Not in the product database yet. Photograph the nutrition label, or type the values.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const readLabel = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    setStatus('Reading the label…');
    try {
      const photo = await cam.current.takePictureAsync({ quality: 0.8, exif: false });
      if (!photo?.uri) throw new Error('No photo');
      const p = await api.productLabel(photo.uri);
      setForm((f) => ({
        ...(f ?? emptyForm()),
        code: f?.code || p.barcode || '',
        name: p.name,
        kcal: str(p.per100.kcal),
        protein: str(p.per100.protein),
        carbs: str(p.per100.carbs),
        fat: str(p.per100.fat),
        serving: str(p.serving_g ?? 100),
        servingLabel: p.serving_label,
        source: p.source,
      }));
      setStatus(p.per100.kcal == null ? 'Couldn’t read the numbers. Type them from the label.' : 'Read from the label. Check the numbers.');
    } catch (e) {
      setStatus((e as Error).message === 'No photo' ? 'Couldn’t take a photo.' : (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!form) return;
    const kcal = Number(form.kcal.replace(',', '.'));
    if (!form.name.trim() || !(kcal > 0)) {
      setStatus('Add at least the product name and calories per 100 g.');
      return;
    }
    const n = (v: string) => (v.trim() ? Number(v.replace(',', '.')) : null);
    const product: Product = {
      code: form.code || `manual-${Date.now()}`,
      name: form.name.trim().slice(0, 60),
      per100: { kcal, protein: n(form.protein), carbs: n(form.carbs), fat: n(form.fat) },
      servingG: n(form.serving) ?? 100,
      servingLabel: form.servingLabel || '1 serving',
      source: form.source,
    };
    dispatch({ type: 'saveProduct', product });
    logProduct(product);
  };

  const field = (key: keyof Form, label: string, numeric = true) => (
    <View style={{ flex: 1, gap: 4 }}>
      <T v="small" weight="semibold" muted>
        {label}
      </T>
      <TextInput
        value={form?.[key] ?? ''}
        onChangeText={(v) => setForm((f) => (f ? { ...f, [key]: v } : f))}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        accessibilityLabel={label}
        style={[styles.input, { backgroundColor: c.surface, color: c.ink }]}
      />
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: form ? c.bg : DARK, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <StatusBar style={form ? 'auto' : 'light'} />
      <View style={styles.top}>
        <IconButton icon="close" label="Close" tone={form ? 'surface' : 'dark'} onPress={() => router.back()} />
        <T v="h2" color={form ? c.ink : '#FFFFFF'}>
          {form ? 'Check the product' : 'Scan a barcode'}
        </T>
        <View style={{ width: 44 }} />
      </View>

      {form ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 20 }}>
            {status ? <T v="small" muted>{status}</T> : null}
            {field('name', 'Product name', false)}
            <T v="label" muted>
              Per 100 g (or 100 ml)
            </T>
            <View style={styles.row}>
              {field('kcal', 'Calories')}
              {field('protein', 'Protein g')}
            </View>
            <View style={styles.row}>
              {field('carbs', 'Carbs g')}
              {field('fat', 'Fat g')}
            </View>
            <View style={styles.row}>
              {field('serving', 'One serving (g)')}
              {field('code', 'Barcode')}
            </View>
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Scan again" kind="secondary" onPress={() => { locked.current = false; setForm(null); setStatus(null); }} />
            <Button label="Save and log" grow onPress={save} />
          </View>
        </KeyboardAvoidingView>
      ) : (
        <>
          <View style={styles.frame}>
            {permission?.granted ? (
              <CameraView
                ref={cam}
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
                onBarcodeScanned={busy ? undefined : (r: BarcodeScanningResult) => lookup(r.data)}
              />
            ) : (
              <View style={styles.noCam}>
                <T v="body" color="#FFFFFF" center>
                  Allow the camera to scan barcodes, or type the number below.
                </T>
                <Button label="Allow camera" kind="secondary" onPress={() => requestPermission()} />
              </View>
            )}
            <View pointerEvents="none" style={styles.window} />
          </View>
          {status ? (
            <T v="small" color="#CECFD2" center>
              {status}
            </T>
          ) : (
            <T v="small" color="#CECFD2" center>
              Hold the barcode inside the box. No barcode? Photograph the nutrition label.
            </T>
          )}
          <View style={styles.row}>
            <TextInput
              value={manual}
              onChangeText={setManual}
              keyboardType="number-pad"
              placeholder="Type the barcode number"
              placeholderTextColor="#667085"
              accessibilityLabel="Barcode number"
              style={[styles.input, { flex: 1, backgroundColor: '#1F242F', color: '#FFFFFF' }]}
            />
            <Button label="Look up" kind="secondary" onPress={() => manual.trim() && lookup(manual.trim())} />
          </View>
          <Button label={busy ? 'Working…' : 'Photograph the label'} bgColor="#FFFFFF" fgColor={DARK} onPress={readLabel} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18, gap: 16 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  frame: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: '#1F242F', alignItems: 'center', justifyContent: 'center' },
  noCam: { alignItems: 'center', gap: 16, padding: 24 },
  window: { position: 'absolute', width: '78%', height: 150, borderRadius: 18, borderWidth: 3, borderColor: '#FFFFFF' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { height: 50, borderRadius: 14, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 16 },
});
