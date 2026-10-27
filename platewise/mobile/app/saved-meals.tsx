import React from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../src/components/Screen';
import { T } from '../src/components/T';
import { IconButton } from '../src/components/IconButton';
import { Press } from '../src/components/Press';
import { Icon } from '../src/components/Icon';
import { Card } from '../src/components/Card';
import { useTheme } from '../src/theme/ThemeProvider';
import { useApp } from '../src/state/AppState';
import { fromMealItem } from '../src/state/calc';
import { approx } from '../src/lib/format';
import { duration, stagger } from '../src/lib/motion';
import type { SavedMeal } from '../src/state/types';

export default function SavedMeals() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const hide = !!s.profile?.hideNumbers;

  const use = (m: SavedMeal) => {
    dispatch({ type: 'startDraft', items: m.items.map((it, i) => fromMealItem(it, `sv${i}${Date.now().toString(36)}`)), source: 'saved' });
    router.replace('/scan/review');
  };
  const remove = (m: SavedMeal) => {
    const go = () => dispatch({ type: 'deleteSaved', id: m.id });
    if (Platform.OS === 'web') return go();
    Alert.alert('Remove from saved meals?', m.name, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen>
      <View style={styles.head}>
        <IconButton icon="back" label="Back" onPress={() => router.back()} />
        <T v="title" size={26}>
          Saved meals
        </T>
      </View>
      {s.saved.length === 0 ? (
        <Card>
          <T muted>No saved meals yet. On “Check your plate”, tap “Save to favourites too” and the meal shows up here for one-tap logging.</T>
        </Card>
      ) : (
        <T v="small" muted>
          Tap to log again. Hold to remove.
        </T>
      )}
      {s.saved.map((m, i) => (
        <Animated.View key={m.id} entering={FadeInDown.duration(duration.slow).delay(i * stagger)}>
          <Press onPress={() => use(m)} onLongPress={() => remove(m)} accessibilityLabel={`${m.name}. Tap to log, hold to remove`} style={[styles.row, { backgroundColor: c.surface }]}>
            <Icon name="bookmark" color={c.mintText} />
            <T v="body" weight="bold" style={{ flex: 1 }} numberOfLines={2}>
              {m.name}
            </T>
            {!hide ? (
              <T v="body" weight="bold">
                {approx(m.kcal)}
              </T>
            ) : null}
          </Press>
        </Animated.View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, borderRadius: 20 },
});
