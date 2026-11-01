import React, { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Card } from './Card';
import { Press } from './Press';
import { Button } from './Button';
import { T } from './T';
import { useTheme } from '../theme/ThemeProvider';
import { font } from '../theme/tokens';
import { duration } from '../lib/motion';
import { api, ApiError } from '../api/client';
import { PROVIDERS, maskKey, providerName, saveOwnKey, useOwnKey, type AiProvider } from '../api/ownKey';

/** Lets a person use their own Gemini, ChatGPT or Claude key instead of PlateWise's AI. */
export function OwnAiKeyCard({ order }: { order: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const own = useOwnKey();
  const [editing, setEditing] = useState(false);
  const [provider, setProvider] = useState<AiProvider>(own?.provider ?? 'gemini');
  const [key, setKey] = useState('');
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const showForm = editing || !own;
  const where = PROVIDERS.find((p) => p.id === provider)?.where;

  const check = async () => {
    const k = key.trim();
    if (!k) return setProblem(`Paste your ${providerName(provider)} key first.`);
    if (checking) return;
    setChecking(true);
    setProblem(null);
    try {
      await api.checkOwnKey({ provider, key: k, on: true });
      await saveOwnKey({ provider, key: k, on: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setKey('');
      setEditing(false);
    } catch (e) {
      setProblem(e instanceof ApiError && e.status !== 0 ? `That key didn’t work with ${providerName(provider)}. Check it was copied in full and that the account has API access.` : e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card order={order} style={{ gap: 10 }}>
      <T v="label" muted>
        Your own AI key
      </T>
      <T v="small" muted>
        PlateWise’s AI works without this. If you’d rather use your own Gemini, ChatGPT or Claude plan, add its API key. It stays in this phone’s secure storage and goes only with scans, meal descriptions and coach chats; PlateWise never keeps it.
      </T>

      {own && !editing ? (
        <Animated.View entering={reduce ? undefined : FadeIn.duration(duration.base)} style={{ gap: 10 }}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <T v="body" weight="semibold">
                {own.on ? `Using your ${providerName(own.provider)} key` : 'Using PlateWise’s AI'}
              </T>
              <T v="small" muted>
                {providerName(own.provider)} · {maskKey(own.key)}
              </T>
            </View>
            <Switch
              value={own.on}
              onValueChange={(on) => void saveOwnKey({ ...own, on })}
              trackColor={{ true: c.mintBorder, false: c.line }}
              thumbColor="#FFFFFF"
              accessibilityLabel={`Use my ${providerName(own.provider)} key`}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Press
              onPress={() => {
                setProvider(own.provider);
                setEditing(true);
              }}
              accessibilityRole="button"
              style={styles.textBtn}
            >
              <T v="small" weight="bold" color={c.mintText}>
                Change key
              </T>
            </Press>
            <Press onPress={() => void saveOwnKey(null)} accessibilityRole="button" style={styles.textBtn}>
              <T v="small" weight="bold" color={c.muted}>
                Remove key
              </T>
            </Press>
          </View>
        </Animated.View>
      ) : null}

      {showForm ? (
        <Animated.View entering={reduce || !own ? undefined : FadeIn.duration(duration.base)} style={{ gap: 10 }}>
          <View style={[styles.seg, { backgroundColor: c.bg }]} accessibilityRole="radiogroup" accessibilityLabel="AI provider">
            {PROVIDERS.map((p) => {
              const on = p.id === provider;
              return (
                <Press
                  key={p.id}
                  onPress={() => {
                    setProvider(p.id);
                    setProblem(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  style={[styles.segItem, on ? { backgroundColor: c.mintTint } : null]}
                >
                  <T v="small" weight="bold" color={on ? c.mintText : c.muted}>
                    {p.name}
                  </T>
                </Press>
              );
            })}
          </View>
          <TextInput
            value={key}
            onChangeText={(t) => {
              setKey(t);
              setProblem(null);
            }}
            placeholder={`Paste your ${providerName(provider)} API key`}
            placeholderTextColor={c.faint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void check()}
            accessibilityLabel={`${providerName(provider)} API key`}
            style={[styles.input, { backgroundColor: c.bg, color: c.ink }]}
          />
          {where ? (
            <T v="small" muted>
              Get one at {where}. Use is billed to your own {providerName(provider)} account.
            </T>
          ) : null}
          {problem ? (
            <T v="small" weight="semibold" color={c.amberText}>
              {problem}
            </T>
          ) : null}
          <Button label={checking ? 'Checking…' : 'Check and use this key'} onPress={() => void check()} />
          {own ? <Button label="Cancel" kind="ghost" onPress={() => (setEditing(false), setKey(''), setProblem(null))} /> : null}
        </Animated.View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textBtn: { minHeight: 44, justifyContent: 'center' },
  seg: { flexDirection: 'row', padding: 4, borderRadius: 999, gap: 4 },
  segItem: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { height: 48, borderRadius: 14, paddingHorizontal: 14, fontFamily: font.bold, fontSize: 16 },
});
