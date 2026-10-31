import React from 'react';
import { Alert, Platform, Share, StyleSheet, Switch, View } from 'react-native';
import { Card } from './Card';
import { Press } from './Press';
import { T } from './T';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../state/AppState';
import { AI_CONSENT_TEXT, setAiConsent, usePrivacy } from '../api/privacy';

/** Consent for online AI, a copy of your data, and what PlateWise is not. */
export function PrivacyCard({ order }: { order: number }) {
  const { c } = useTheme();
  const { s } = useApp();
  const privacy = usePrivacy();

  const exportData = async () => {
    const { hydrated: _h, ...data } = s as typeof s & { hydrated?: boolean };
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'PlateWise', data }, null, 1);
    try {
      await Share.share({ title: 'PlateWise data', message: json });
    } catch {
      if (Platform.OS !== 'web') Alert.alert('Could not share', 'Try again in a moment.');
    }
  };

  return (
    <Card order={order} style={{ gap: 8 }}>
      <T v="label" muted>
        Privacy
      </T>
      <View style={styles.switchRow}>
        <T v="small" style={{ flex: 1 }}>
          {AI_CONSENT_TEXT}
        </T>
        <Switch
          value={privacy.aiConsent}
          onValueChange={(v) => void setAiConsent(v)}
          trackColor={{ true: c.mintBorder, false: c.line }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Allow online AI"
        />
      </View>
      <T v="small" muted>
        {privacy.aiConsent ? 'Online AI is on.' : 'Online AI is off. Only the on-device model is used, if you have downloaded it.'} Your log, weight and profile stay on this phone.
      </T>
      <Press onPress={exportData} accessibilityRole="button" style={styles.textBtn}>
        <T v="small" weight="bold" color={c.mintText}>
          Export a copy of my data
        </T>
      </Press>
      <T v="small" muted>
        PlateWise is not a medical device. It gives estimates for general wellness and is not medical advice.
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  textBtn: { minHeight: 44, justifyContent: 'center' },
});
