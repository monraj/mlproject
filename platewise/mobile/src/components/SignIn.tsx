import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Screen } from './Screen';
import { T } from './T';
import { Card, Rise } from './Card';
import { Press } from './Press';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { addAccount, switchAccount, useAccounts, type Account } from '../state/accounts';
import { font } from '../theme/tokens';
import { googleAvailable, signInWithGoogle } from '../auth/google';

function Avatar({ name }: { name: string }) {
  const { c } = useTheme();
  return (
    <View style={[styles.avatar, { backgroundColor: c.mint }]}>
      <T v="h2" size={18} weight="heavy" color="#101828">
        {(name || 'M')[0].toUpperCase()}
      </T>
    </View>
  );
}

/** Shown when nobody is signed in: pick who you are, or add a new person to this phone. */
export function SignIn() {
  const { c } = useTheme();
  const { list } = useAccounts();
  const [adding, setAdding] = useState(list.length === 0);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (a: Account) => void switchAccount(a.id);
  const add = () => void addAccount(name);
  const google = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await signInWithGoogle();
    setBusy(false);
    if (r.ok) await addAccount(r.name, { email: r.email, google: true });
    else if (!r.cancelled) setError(r.message);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen contentStyle={{ gap: 16 }}>
        <Rise>
          <View style={{ flexDirection: 'row', marginTop: 24 }}>
            <T v="display" size={40}>
              plate
            </T>
            <T v="display" size={40} color={c.mintBorder}>
              wise
            </T>
          </View>
          <T v="body" weight="semibold" muted>
            {list.length ? 'Who’s using PlateWise?' : 'Snap your food. Know your day.'}
          </T>
        </Rise>

        {googleAvailable ? (
          <Rise order={1}>
            <Press onPress={google} accessibilityRole="button" accessibilityLabel="Continue with Google" style={[styles.google, { backgroundColor: c.button }]}>
              <View style={[styles.g, { backgroundColor: '#FFFFFF' }]}>
                <T v="h2" size={16} weight="heavy" color="#4285F4">
                  G
                </T>
              </View>
              <T v="h2" color={c.buttonText}>
                {busy ? 'Opening Google…' : 'Continue with Google'}
              </T>
            </Press>
            {error ? (
              <T v="small" weight="semibold" color={c.amberText} style={{ marginTop: 8 }}>
                {error}
              </T>
            ) : null}
          </Rise>
        ) : null}

        {list.length ? (
          <Card order={1} style={{ paddingVertical: 6 }}>
            {list.map((a) => (
              <Press key={a.id} onPress={() => pick(a)} accessibilityLabel={`Continue as ${a.name}`} style={styles.row}>
                <Avatar name={a.name} />
                <View style={{ flex: 1 }}>
                  <T v="body" weight="semibold">
                    {a.name}
                  </T>
                  {a.email ? (
                    <T v="small" muted>
                      {a.google ? 'Google · ' : ''}
                      {a.email}
                    </T>
                  ) : null}
                </View>
                <Icon name="chevron" color={c.faint} />
              </Press>
            ))}
          </Card>
        ) : null}

        {adding ? (
          <Card order={2} style={{ gap: 10 }}>
            <T v="label" muted>
              {googleAvailable ? 'Or use just a name' : list.length ? 'Add a person' : 'Get started'}
            </T>
            <T v="small" muted>
              Each person gets their own meals, weigh-ins and coach chat on this phone.
            </T>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="First name, e.g. Ama"
              placeholderTextColor={c.faint}
              autoCapitalize="words"
              autoFocus={list.length > 0}
              returnKeyType="done"
              onSubmitEditing={add}
              accessibilityLabel="First name"
              style={[styles.input, { backgroundColor: c.bg, color: c.ink }]}
            />
            <Button label="Continue" onPress={add} />
          </Card>
        ) : (
          <Button label="Add a person without Google" kind="secondary" icon="plus" onPress={() => setAdding(true)} />
        )}

        <T v="small" muted center>
          Your log stays on this phone. Signing out keeps it safe for next time.
        </T>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  google: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  g: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  input: { height: 48, borderRadius: 14, paddingHorizontal: 14, fontFamily: font.bold, fontSize: 16 },
});
