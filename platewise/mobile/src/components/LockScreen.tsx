import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { T } from './T';
import { Button } from './Button';
import { Press } from './Press';
import { useTheme } from '../theme/ThemeProvider';
import { signOut, type Account } from '../state/accounts';
import { unlock } from '../lib/biometric';

/** Covers the app until the person unlocks with their fingerprint, face or phone PIN. */
export function LockScreen({ account, onUnlock }: { account: Account; onUnlock: () => void }) {
  const { c } = useTheme();
  const [tried, setTried] = useState(false);
  const asking = useRef(false);

  const ask = async () => {
    if (asking.current) return;
    asking.current = true;
    const ok = await unlock(`Unlock ${account.name}’s PlateWise`);
    asking.current = false;
    setTried(true);
    if (ok) onUnlock();
  };

  useEffect(() => {
    void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: c.bg }]} accessibilityViewIsModal>
      <View style={[styles.avatar, { backgroundColor: c.mint }]}>
        <T v="title" size={34} weight="heavy" color="#101828">
          {(account.name || 'M')[0].toUpperCase()}
        </T>
      </View>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <T v="title" size={26}>
          {account.name}
        </T>
        <T v="body" muted center>
          {tried ? 'PlateWise is locked. Use your fingerprint, face or phone PIN.' : 'Unlocking…'}
        </T>
      </View>
      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        <Button label="Unlock" icon="check" onPress={() => void ask()} />
        <Press onPress={() => void signOut()} accessibilityRole="button" style={styles.switch}>
          <T v="small" weight="bold" muted>
            Not {account.name}? Switch person
          </T>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 24, zIndex: 100 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  switch: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
