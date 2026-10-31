// Motion tokens. Every animation in the app takes its timing from here.
// See docs/design/MOTION.md and the "Motion spec" board on the design canvas.
import { Easing } from 'react-native-reanimated';

export const duration = {
  fast: 150,
  base: 250,
  slow: 500,
  data: 1000,
  dataLong: 1200,
} as const;

export const stagger = 80;

export const easeOut = Easing.bezier(0.2, 0.8, 0.2, 1);
export const easeInOut = Easing.inOut(Easing.quad);

export const spring = {
  sheet: { damping: 20, stiffness: 220, mass: 1 },
  pop: { damping: 12, stiffness: 260, mass: 0.8 },
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  drop: { damping: 11, stiffness: 180, mass: 0.9 },
} as const;
