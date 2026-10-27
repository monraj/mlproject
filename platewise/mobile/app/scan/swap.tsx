import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { T } from '../../src/components/T';
import { Press } from '../../src/components/Press';
import { IconButton } from '../../src/components/IconButton';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useApp } from '../../src/state/AppState';
import { food as foodById, productFoods, searchFoods, draftFromFood, type Food } from '../../src/data/foods';
import { font } from '../../src/theme/tokens';
import { duration, spring, stagger } from '../../src/lib/motion';

export default function Swap() {
  const { c } = useTheme();
  const { s, dispatch } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduce = useReducedMotion();
  const { id, mode } = useLocalSearchParams<{ id?: string; mode?: string }>();
  const adding = mode === 'add';
  const item = s.draft.find((i) => i.id === id);
  const extra = useMemo(() => productFoods(s.products), [s.products]);
  const [q, setQ] = useState('');

  const y = useSharedValue(reduce ? 0 : height);
  const fade = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    y.value = reduce ? 0 : withSpring(0, spring.sheet);
    fade.value = withTiming(1, { duration: duration.base });
  }, [reduce, y, fade]);

  const goBack = () => router.back();
  const close = () => {
    if (reduce) return goBack();
    fade.value = withTiming(0, { duration: duration.base });
    y.value = withTiming(height, { duration: duration.base }, (finished) => {
      if (finished) runOnJS(goBack)();
    });
  };

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const options: Food[] = useMemo(() => {
    if (q.trim()) return searchFoods(q, extra);
    const fromModel = (item?.candidates ?? []).map((cand) => foodById(cand.foodId) ?? extra.find((f) => f.id === cand.foodId)).filter((f): f is Food => !!f);
    return fromModel.length ? fromModel : adding ? searchFoods('', extra) : [];
  }, [item, q, extra, adding]);

  const choose = (f: Food) => {
    Haptics.selectionAsync().catch(() => undefined);
    if (adding || !item) {
      dispatch({ type: 'addItem', item: draftFromFood(f) });
    } else {
      const wasUnmatched = item.per100?.kcal == null;
      const fresh = draftFromFood(f, wasUnmatched ? undefined : item.kind === 'count' && item.countG ? (item.count ?? 1) * item.countG : item.grams);
      dispatch({
        type: 'updateItem',
        id: item.id,
        patch: { ...fresh, id: item.id, aiFoodId: item.aiFoodId, aiGrams: item.aiGrams, candidates: item.candidates, bbox: item.bbox },
      });
    }
    close();
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={[styles.sheet, { backgroundColor: c.raised, paddingBottom: insets.bottom + 20 }, sheetStyle]}
      >
        <View style={[styles.handle, { backgroundColor: c.line }]} />
        <View style={styles.head}>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="title" size={24}>
              {adding ? 'Add a food' : 'What is this?'}
            </T>
            <T v="small" muted>
              {adding ? 'Search the food list or your scanned products.' : `We saw ${item?.name.toLowerCase() ?? 'this'}. Pick the closest match.`}
            </T>
          </View>
          <IconButton icon="close" label="Close" onPress={close} />
        </View>

        <View style={{ gap: 8 }}>
          {options.map((o, i) => {
            const best = i === 0 && !q && !adding;
            return (
              <Animated.View key={o.id} entering={reduce ? undefined : FadeInDown.duration(duration.base).delay(120 + i * stagger)}>
                <Press
                  haptic
                  onPress={() => choose(o)}
                  scaleTo={0.98}
                  accessibilityLabel={`${o.name}. ${o.detail}${best ? '. Best match' : ''}`}
                  style={[styles.option, { backgroundColor: best ? c.mintTint : c.surface, borderColor: best ? c.mintBorder : 'transparent' }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="h2">{o.name}</T>
                    <T v="small" muted>
                      {o.detail}
                    </T>
                  </View>
                  {best ? (
                    <View style={[styles.badge, { backgroundColor: c.button }]}>
                      <T v="small" size={12} weight="bold" color={c.buttonText}>
                        Best match
                      </T>
                    </View>
                  ) : (
                    <Icon name="chevron" color={c.faint} />
                  )}
                </Press>
              </Animated.View>
            );
          })}
          {options.length === 0 ? (
            <Animated.View entering={FadeIn}>
              <T v="small" muted>
                {q.trim() ? 'No match yet. Try another name, or scan the package barcode.' : 'Type a food name below.'}
              </T>
            </Animated.View>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <T v="small" weight="semibold" muted nativeID="searchLabel">
            {adding ? 'Search foods' : 'Not there? Search all foods'}
          </T>
          <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.line }]}>
            <Icon name="search" color={c.muted} size={18} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus={adding}
              placeholder="e.g. kenkey, banku, red-red"
              placeholderTextColor={c.faint}
              accessibilityLabelledBy="searchLabel"
              style={{ flex: 1, fontFamily: font.medium, fontSize: 16, color: c.ink }}
            />
          </View>
        </View>
        <T v="small" muted>
          Your choice helps PlateWise get this dish right next time.
        </T>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderWidth: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
});
