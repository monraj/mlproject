import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutLeft,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Screen } from '../../src/components/Screen';
import { T } from '../../src/components/T';
import { Button } from '../../src/components/Button';
import { IconButton } from '../../src/components/IconButton';
import { Press } from '../../src/components/Press';
import { Slider } from '../../src/components/Slider';
import { Chip } from '../../src/components/Chip';
import { PlateArt } from '../../src/components/PlateArt';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { itemKcal, mealKcal, share } from '../../src/state/calc';
import type { DraftItem } from '../../src/state/types';
import { approx, range } from '../../src/lib/format';
import { duration, stagger } from '../../src/lib/motion';

function ItemCard({ item, index }: { item: DraftItem; index: number }) {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const reduce = useReducedMotion();
  const k = itemKcal(item);
  const unmatched = item.per100?.kcal == null;
  const needsCheck = item.confidence === 'low' || unmatched;
  const hide = !!s.profile?.hideNumbers;

  // The item to check pulses twice to draw the eye, then stops.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (needsCheck && !reduce) pulse.value = withDelay(900, withRepeat(withTiming(1, { duration: 700 }), 4, true));
  }, [needsCheck, reduce, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({
    borderColor: needsCheck ? interpolateColor(pulse.value, [0, 1], [c.amber, c.amberTint]) : 'transparent',
  }));

  const set = (patch: Partial<DraftItem>) => dispatch({ type: 'updateItem', id: item.id, patch });
  const max = Math.max(item.gramsHigh * 1.5, item.grams + 20);

  return (
    <Animated.View
      entering={FadeInDown.duration(duration.slow).delay(150 + index * stagger)}
      exiting={FadeOutLeft.duration(duration.base)}
      layout={LinearTransition}
      style={[styles.item, { backgroundColor: c.surface }, pulseStyle]}
    >
      <View style={styles.itemHead}>
        <Press
          onPress={() => router.push({ pathname: '/scan/swap', params: { id: item.id } })}
          accessibilityLabel={`${item.name}. ${needsCheck ? 'Needs checking. ' : ''}Tap to change the food`}
          style={{ flex: 1, gap: 2, minHeight: 44, justifyContent: 'center' }}
        >
          <T v="h2" style={{ textDecorationLine: 'underline', textDecorationColor: c.faint }}>
            {item.name}
          </T>
          <T v="small" weight={needsCheck ? 'bold' : 'semibold'} color={needsCheck ? c.amberText : c.mintText}>
            {item.hint ?? 'Looks right'}
          </T>
        </Press>
        {!hide ? (
          <Animated.View key={Math.round(k.mid / 10)} entering={FadeIn.duration(duration.fast)}>
            <T v="body" weight="bold">
              {unmatched ? '— kcal' : `${range(k.low, k.high)} kcal`}
            </T>
          </Animated.View>
        ) : null}
        <Press onPress={() => dispatch({ type: 'removeItem', id: item.id })} accessibilityLabel={`Remove ${item.name}`} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T v="h2" muted>
            ×
          </T>
        </Press>
      </View>

      {item.kind === 'count' ? (
        <View style={styles.row}>
          <T v="small" muted style={{ flex: 1 }}>
            How many?
          </T>
          <Press
            onPress={() => set({ count: Math.max(1, (item.count ?? 1) - 1) })}
            accessibilityLabel={`One fewer ${item.name}`}
            style={[styles.step, { backgroundColor: c.raised }]}
          >
            <T v="h2">−</T>
          </Press>
          <T v="h2" style={{ minWidth: 20, textAlign: 'center' }}>
            {item.count ?? 1}
          </T>
          <Press onPress={() => set({ count: (item.count ?? 1) + 1 })} accessibilityLabel={`One more ${item.name}`} style={[styles.step, { backgroundColor: c.raised }]}>
            <T v="h2">+</T>
          </Press>
        </View>
      ) : (
        <View style={styles.row}>
          <Slider
            label={`${item.name} portion`}
            value={item.grams}
            min={5}
            max={Math.round(max / 5) * 5}
            likelyLow={item.gramsLow}
            likelyHigh={item.gramsHigh}
            onChange={(g) => set({ grams: g })}
          />
          <View style={[styles.grams, { backgroundColor: c.raised }]}>
            <T v="body" weight="bold">
              {item.grams} g
            </T>
          </View>
        </View>
      )}

      {item.kind === 'oil' ? (
        <View style={[styles.row, { gap: 8 }]} accessibilityRole="radiogroup" accessibilityLabel="How oily was it?">
          {(['light', 'normal', 'very'] as const).map((o) => (
            <Chip key={o} label={o === 'light' ? 'Light' : o === 'normal' ? 'Normal' : 'Very oily'} selected={item.oil === o} onPress={() => set({ oil: o })} style={{ flex: 1, alignItems: 'center' }} />
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
}

export default function Review() {
  const { c } = useTheme();
  const { s, leftKcal, budget, dispatch } = useApp();
  const router = useRouter();
  const [fav, setFav] = useState(false);
  const total = mealKcal(s.draft);
  const dayShare = share(total.mid, budget);
  const hide = !!s.profile?.hideNumbers;
  const unmatched = s.draft.filter((i) => i.per100?.kcal == null);
  const back = { voice: '/voice', text: '/type', barcode: '/barcode' }[s.draftSource as string] ?? '/scan/camera';

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Add item" kind="secondary" icon="plus" onPress={() => router.push({ pathname: '/scan/swap', params: { mode: 'add' } })} />
          <Button
            label={unmatched.length ? 'Pick a match first' : 'Save meal'}
            grow
            onPress={() => {
              if (unmatched.length || !s.draft.length) return;
              dispatch({ type: 'saveDraft', favourite: fav ? s.draft.map((i) => i.name).join(', ').slice(0, 60) : undefined });
              router.replace('/scan/saved');
            }}
          />
        </View>
      }
    >
      <View style={styles.head}>
        <IconButton icon="back" label="Go back" onPress={() => router.replace(back)} />
        <View style={{ gap: 2 }}>
          <T v="title" size={24}>
            Check your plate
          </T>
          <T v="small" muted>
            {s.draft.length} {s.draft.length === 1 ? 'item' : 'items'} found · tap a name to change it
          </T>
        </View>
      </View>

      <Animated.View entering={FadeIn.duration(duration.slow)} style={[styles.summary, { backgroundColor: c.hero }]}>
        <View style={[styles.thumb, { backgroundColor: '#2B2620' }]}>
          {s.photoUri ? <Image source={{ uri: s.photoUri }} style={StyleSheet.absoluteFill} /> : <PlateArt size={64} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="small" weight="semibold" color={c.heroMuted}>
            This meal
          </T>
          {hide ? (
            <T v="title" size={24} color={c.heroText}>
              {s.draft.length} {s.draft.length === 1 ? 'food' : 'foods'}
            </T>
          ) : (
            <>
              <Animated.View key={Math.round(total.mid / 10)} entering={FadeIn.duration(duration.fast)}>
                <T v="title" size={28} color={c.heroText}>
                  About {approx(total.mid).slice(1)} kcal
                </T>
              </Animated.View>
              <T v="small" color={c.heroMuted}>
                Likely {range(total.low, total.high)} · {Math.round(dayShare * 100)}% of today
              </T>
            </>
          )}
        </View>
      </Animated.View>

      <View style={{ gap: 10 }}>
        {s.draft.map((it, i) => (
          <ItemCard key={it.id} item={it} index={i} />
        ))}
      </View>

      {s.draftNote ? (
        <T v="small" muted>
          {s.draftNote}
        </T>
      ) : null}

      {s.draft.length === 0 ? (
        <T muted>No foods yet. Tap Add item to search the food list.</T>
      ) : null}

      {unmatched.length ? (
        <T v="small" weight="semibold" color={c.amberText}>
          Tap {unmatched.map((i) => i.name).join(', ')} to pick the closest food, or remove it.
        </T>
      ) : null}

      <Chip label={fav ? 'Saving to favourites' : 'Save to favourites too'} selected={fav} onPress={() => setFav((f) => !f)} style={{ alignSelf: 'flex-start' }} />

      {!hide && total.mid > leftKcal ? (
        <T v="small" muted>
          This is a bit more than you have left today. That’s fine — your weekly check-in balances things out.
        </T>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 22 },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  item: { borderRadius: 20, padding: 14, gap: 10, borderWidth: 2 },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grams: { minWidth: 70, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  step: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
