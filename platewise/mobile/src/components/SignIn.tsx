import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { Screen } from './Screen';
import { T } from './T';
import { Card, Rise } from './Card';
import { Press } from './Press';
import { Button } from './Button';
import { Icon } from './Icon';
import { useTheme } from '../theme/ThemeProvider';
import { AccountError, addAccount, passwordProblem, shownAccounts, signInWithPassword, switchAccount, useAccounts, type Account } from '../state/accounts';
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
  const all = useAccounts();
  const list = shownAccounts(all);
  // People who can sign in with a name and password (including those whose log was kept).
  const canReturn = all.list.some((a) => a.passHash);
  const [mode, setMode] = useState<'pick' | 'add' | 'return'>(list.length === 0 ? (canReturn ? 'return' : 'add') : 'pick');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (a: Account) => void switchAccount(a.id);
  const show = (m: typeof mode) => {
    setMode(m);
    setFormError(null);
    setPassword('');
  };
  const add = async () => {
    if (!name.trim()) return setFormError('Type your first name.');
    const problem = passwordProblem(name, password);
    if (problem) return setFormError(problem);
    try {
      await addAccount(name, { password });
    } catch (e) {
      setFormError(e instanceof AccountError ? e.message : 'Something went wrong. Try again.');
    }
  };
  const back = async () => {
    try {
      await signInWithPassword(name, password);
    } catch (e) {
      setFormError(e instanceof AccountError ? e.message : 'Something went wrong. Try again.');
    }
  };
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

        {mode === 'pick' ? null : (
          <Card order={2} style={{ gap: 10 }}>
            <T v="label" muted>
              {mode === 'return' ? 'Welcome back' : googleAvailable ? 'Or use a name and password' : list.length ? 'Add a person' : 'Get started'}
            </T>
            <T v="small" muted>
              {mode === 'return'
                ? 'Sign in with your name and password to carry on with your meals, weigh-ins and chats.'
                : 'Each person gets their own meals, weigh-ins and coach chat on this phone. The password lets you sign back in later.'}
            </T>
            <TextInput
              value={name}
              onChangeText={(t) => {
                setName(t);
                setFormError(null);
              }}
              placeholder="First name, e.g. Ama"
              placeholderTextColor={c.faint}
              autoCapitalize="words"
              autoFocus={list.length > 0}
              returnKeyType="next"
              accessibilityLabel="First name"
              style={[styles.input, { backgroundColor: c.bg, color: c.ink }]}
            />
            <TextInput
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setFormError(null);
              }}
              placeholder={mode === 'return' ? 'Password' : 'Choose a password'}
              placeholderTextColor={c.faint}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => void (mode === 'return' ? back() : add())}
              accessibilityLabel="Password"
              style={[styles.input, { backgroundColor: c.bg, color: c.ink }]}
            />
            {formError ? (
              <T v="small" weight="semibold" color={c.amberText}>
                {formError}
              </T>
            ) : null}
            <Button label={mode === 'return' ? 'Sign in' : 'Continue'} onPress={() => void (mode === 'return' ? back() : add())} />
          </Card>
        )}
        {canReturn && mode !== 'return' ? <Button label="Sign in with name and password" kind="secondary" icon="me" onPress={() => show('return')} /> : null}
        {mode !== 'add' ? <Button label="Add a person without Google" kind="secondary" icon="plus" onPress={() => show('add')} /> : null}

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
