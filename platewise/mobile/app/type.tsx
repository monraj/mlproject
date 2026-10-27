import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { Button } from '../src/components/Button';
import { IconButton } from '../src/components/IconButton';
import { Chip } from '../src/components/Chip';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { api } from '../src/api/client';
import { mealForHour } from '../src/lib/format';
import { font } from '../src/theme/tokens';
import { duration } from '../src/lib/motion';

const EXAMPLES = ['Waakye with egg, stew and gari', 'Banku and tilapia with pepper', 'Two slices of bread and tea'];

/** Type what you ate; the server works out foods and portions. */
export default function TypeIt() {
  const { c } = useTheme();
  const { dispatch } = useApp();
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.parseText(text.trim(), 'en', mealForHour(new Date().getHours()));
      if (!r.isFood) {
        setError(r.note ?? 'We couldn’t find a food in that. Try naming the dish and how much.');
        return;
      }
      dispatch({ type: 'startDraft', items: r.items, source: 'text', note: r.note });
      router.replace('/scan/review');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fromList = () => {
    dispatch({ type: 'startDraft', items: [], source: 'search' });
    router.replace('/scan/review');
    setTimeout(() => router.push({ pathname: '/scan/swap', params: { mode: 'add' } }), 50);
  };

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Food list" kind="secondary" icon="search" onPress={fromList} />
          <Button label={busy ? 'Working it out…' : 'Work it out'} grow onPress={go} />
        </View>
      }
    >
      <View style={styles.head}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <T v="title" size={26}>
          Type it
        </T>
      </View>
      <Animated.View entering={FadeInDown.duration(duration.slow)} style={{ gap: 6 }}>
        <T muted>Say what you ate and roughly how much, the way you’d tell a friend.</T>
      </Animated.View>
      <TextInput
        value={text}
        onChangeText={setText}
        multiline
        autoFocus
        placeholder="One ball of kenkey with fried fish and shito"
        placeholderTextColor={c.faint}
        accessibilityLabel="What you ate"
        style={[styles.input, { backgroundColor: c.surface, color: c.ink }]}
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EXAMPLES.map((e) => (
          <Chip key={e} label={e} onPress={() => setText(e)} />
        ))}
      </View>
      {error ? (
        <T v="small" weight="semibold" color={c.amberText}>
          {error}
        </T>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: { minHeight: 140, borderRadius: 20, padding: 16, fontFamily: font.semibold, fontSize: 20, lineHeight: 28, textAlignVertical: 'top' },
});
