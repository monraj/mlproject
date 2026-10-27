import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { T } from '../../src/components/T';
import { Press } from '../../src/components/Press';
import { IconButton } from '../../src/components/IconButton';
import { Icon } from '../../src/components/Icon';
import { Button } from '../../src/components/Button';
import { PlateArt } from '../../src/components/PlateArt';
import { useApp } from '../../src/state/AppState';
import { mealForHour } from '../../src/lib/format';

const DARK = '#0C111D';

/** Re-encode as a ≤1024 px JPEG on the device, which also drops EXIF/GPS (CLAUDE.md rule 6). */
async function shrink(uri: string): Promise<string> {
  try {
    const small = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1024 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
    return small.uri;
  } catch {
    return uri;
  }
}

/** Camera: snap a meal or pick one from the gallery, then hand it to the scanning screen. */
export default function Camera() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const cam = useRef<CameraView>(null);
  const shutter = useSharedValue(1);
  const flash = useSharedValue(0);

  const shutterStyle = useAnimatedStyle(() => ({ transform: [{ scale: shutter.value }] }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const proceed = (uri: string) => {
    dispatch({ type: 'startDraft', items: [], source: 'photo', photoUri: uri });
    router.replace('/scan/scanning');
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, exif: false });
    const asset = res.canceled ? null : res.assets[0];
    if (asset) proceed(await shrink(asset.uri));
  };

  const take = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    shutter.value = withSequence(withTiming(0.86, { duration: 90 }), withTiming(1, { duration: 160 }));
    if (!permission?.granted || !cam.current) {
      if (permission?.canAskAgain !== false) await requestPermission();
      else await pickFromGallery();
      return;
    }
    flash.value = withSequence(withTiming(0.7, { duration: 60 }), withTiming(0, { duration: 260 }));
    try {
      const photo = await cam.current.takePictureAsync({ quality: 0.8, exif: false });
      if (photo?.uri) proceed(await shrink(photo.uri));
    } catch {
      await pickFromGallery();
    }
  };

  const meal = mealForHour(new Date().getHours());

  return (
    <View style={[styles.root, { backgroundColor: DARK, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <IconButton icon="close" label="Close camera" tone="dark" onPress={() => router.back()} />
        <T v="h2" color="#FFFFFF">
          {meal}
        </T>
        <IconButton icon="flash" label={torch ? 'Turn torch off' : 'Turn torch on'} tone="dark" onPress={() => setTorch((t) => !t)} />
      </View>

      <View style={styles.frame}>
        {permission?.granted ? (
          <CameraView ref={cam} style={StyleSheet.absoluteFill} facing="back" enableTorch={torch} />
        ) : (
          <View style={styles.noCam}>
            <PlateArt size={220} />
            <T v="body" color="#FFFFFF" center style={{ paddingHorizontal: 24 }}>
              Allow the camera to snap your plate, or choose a photo from your gallery.
            </T>
            <Button label="Allow camera" kind="secondary" onPress={() => requestPermission()} />
            <Button label="Choose a photo" kind="ghost" fgColor="#FFFFFF" onPress={pickFromGallery} />
          </View>
        )}
        {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
          <View key={k} pointerEvents="none" style={[styles.corner, cornerPos[k]]} />
        ))}
        <View pointerEvents="none" style={styles.hint}>
          <T v="small" weight="semibold" color="#FFFFFF">
            Whole plate in view · slight angle
          </T>
        </View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }, flashStyle]} />
      </View>

      <View style={styles.modes}>
        <View style={[styles.mode, { backgroundColor: '#FFFFFF' }]}>
          <T v="small" weight="bold" color={DARK}>
            Photo
          </T>
        </View>
        <Press onPress={() => router.replace('/voice')} style={styles.mode} accessibilityLabel="Describe your meal by voice instead">
          <T v="small" weight="semibold" color="#FFFFFF">
            Say it
          </T>
        </Press>
        <Press onPress={() => router.replace('/type')} style={styles.mode} accessibilityLabel="Type your meal instead">
          <T v="small" weight="semibold" color="#FFFFFF">
            Type it
          </T>
        </Press>
      </View>

      <View style={styles.controls}>
        <Press onPress={pickFromGallery} accessibilityLabel="Choose from gallery" style={styles.side}>
          <Icon name="gallery" color="#FFFFFF" size={24} />
        </Press>
        <Press onPress={take} accessibilityLabel="Take photo" scaleTo={0.92}>
          <View style={styles.shutterRing}>
            <Animated.View style={[styles.shutter, shutterStyle]} />
          </View>
        </Press>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );
}

const cornerPos = {
  tl: { left: 20, top: 20, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 14 },
  tr: { right: 20, top: 20, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 14 },
  bl: { left: 20, bottom: 20, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 14 },
  br: { right: 20, bottom: 20, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 14 },
} as const;

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 18, gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  frame: { flex: 1, borderRadius: 28, overflow: 'hidden', backgroundColor: '#1F242F' },
  noCam: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#FFFFFF' },
  hint: { position: 'absolute', bottom: 28, alignSelf: 'center', backgroundColor: DARK, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  modes: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  mode: { height: 36, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: '#333741', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  side: { width: 52, height: 52, borderRadius: 14, backgroundColor: '#1F242F', alignItems: 'center', justifyContent: 'center' },
  shutterRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#FFFFFF' },
});
