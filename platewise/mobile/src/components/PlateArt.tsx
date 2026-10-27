import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

/** Illustrated waakye plate, used when there's no real photo (sample mode). */
export function PlateArt({ size = 280 }: { size?: number }) {
  const { c } = useTheme();
  const f = c.food;
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300" accessibilityLabel="Plate of waakye with egg, stew and plantain">
      <Ellipse cx={150} cy={156} rx={138} ry={126} fill={f.plate} />
      <Ellipse cx={150} cy={152} rx={112} ry={100} fill={f.plateRim} />
      <Path d="M78 150c0-38 30-62 70-62 32 0 52 18 52 44 0 30-28 52-66 52-34 0-56-12-56-34z" fill={f.rice} />
      <Circle cx={104} cy={128} r={3} fill={f.bean} />
      <Circle cx={130} cy={112} r={3} fill={f.bean} />
      <Circle cx={160} cy={124} r={3} fill={f.bean} />
      <Circle cx={118} cy={152} r={3} fill={f.bean} />
      <Circle cx={146} cy={146} r={3} fill={f.bean} />
      <Circle cx={176} cy={148} r={3} fill={f.bean} />
      <Path d="M170 168c14-12 40-12 54 0 8 8 2 22-18 24-22 2-44-10-36-24z" fill={f.stew} />
      <Ellipse cx={206} cy={122} rx={24} ry={20} fill={f.egg} />
      <Circle cx={206} cy={122} r={10} fill={f.yolk} />
      <Path d="M96 196c10-10 34-12 48-4 6 4 2 12-8 14-14 3-32 2-40-2-4-2-4-5 0-8z" fill={f.plantain} />
      <Path d="M150 204c10-8 30-8 40-2 4 3 1 9-6 10-11 2-25 1-31-2-3-2-5-4-3-6z" fill="#D9792A" />
    </Svg>
  );
}
