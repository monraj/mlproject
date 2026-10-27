import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'close'
  | 'plus'
  | 'camera'
  | 'mic'
  | 'barcode'
  | 'pencil'
  | 'bookmark'
  | 'copy'
  | 'chat'
  | 'today'
  | 'progress'
  | 'calendar'
  | 'me'
  | 'check'
  | 'chevron'
  | 'arrow'
  | 'search'
  | 'drop'
  | 'leaf'
  | 'bulb'
  | 'flash'
  | 'gallery'
  | 'scale'
  | 'flame'
  | 'share'
  | 'send'
  | 'info';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 22, color, strokeWidth = 2 }: Props) {
  const p = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  let body: React.ReactNode = null;
  switch (name) {
    case 'back':
      body = <Path d="M15 18l-6-6 6-6" {...p} />;
      break;
    case 'close':
      body = <Path d="M6 6l12 12M18 6L6 18" {...p} />;
      break;
    case 'plus':
      body = <Path d="M12 5v14M5 12h14" {...p} />;
      break;
    case 'camera':
      body = (
        <>
          <Path d="M4 8h3l2-3h6l2 3h3v11H4z" {...p} />
          <Circle cx={12} cy={13} r={3.5} {...p} />
        </>
      );
      break;
    case 'mic':
      body = (
        <>
          <Rect x={9} y={3} width={6} height={11} rx={3} {...p} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...p} />
        </>
      );
      break;
    case 'barcode':
      body = <Path d="M4 6v12M8 6v12M11 6v12M15 6v12M18 6v12M21 6v12" {...p} />;
      break;
    case 'pencil':
      body = <Path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4" {...p} />;
      break;
    case 'bookmark':
      body = <Path d="M6 3h12v18l-6-4-6 4z" {...p} />;
      break;
    case 'copy':
      body = (
        <>
          <Rect x={8} y={8} width={12} height={12} rx={2} {...p} />
          <Path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" {...p} />
        </>
      );
      break;
    case 'chat':
      body = <Path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" {...p} />;
      break;
    case 'today':
      body = (
        <>
          <Circle cx={12} cy={12} r={8} {...p} />
          <Path d="M12 4a8 8 0 0 1 8 8h-8z" {...p} />
        </>
      );
      break;
    case 'progress':
      body = <Path d="M4 19h16M5 15l4-4 4 3 6-7" {...p} />;
      break;
    case 'calendar':
      body = (
        <>
          <Rect x={4} y={5} width={16} height={15} rx={3} {...p} />
          <Path d="M4 10h16M9 3v4M15 3v4" {...p} />
        </>
      );
      break;
    case 'me':
      body = (
        <>
          <Circle cx={12} cy={8} r={4} {...p} />
          <Path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" {...p} />
        </>
      );
      break;
    case 'check':
      body = <Path d="M5 12l5 5 9-10" {...p} />;
      break;
    case 'chevron':
      body = <Path d="M9 6l6 6-6 6" {...p} />;
      break;
    case 'arrow':
      body = <Path d="M5 12h14M13 6l6 6-6 6" {...p} />;
      break;
    case 'search':
      body = (
        <>
          <Circle cx={11} cy={11} r={7} {...p} />
          <Path d="M20 20l-3.5-3.5" {...p} />
        </>
      );
      break;
    case 'drop':
      body = <Path d="M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-3 2-6 6-10z" {...p} />;
      break;
    case 'leaf':
      body = <Path d="M7 20c6 0 11-5 11-12V4h-4C7 4 4 9 4 14c0 2 1 4 3 6zM4 20c4-4 7-7 10-11" {...p} />;
      break;
    case 'bulb':
      body = <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" {...p} />;
      break;
    case 'flash':
      body = <Path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" {...p} />;
      break;
    case 'gallery':
      body = (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={3} {...p} />
          <Circle cx={9} cy={10} r={2} {...p} />
          <Path d="M21 16l-5-5-9 9" {...p} />
        </>
      );
      break;
    case 'scale':
      body = (
        <>
          <Rect x={3} y={4} width={18} height={16} rx={4} {...p} />
          <Path d="M8 9a4 4 0 0 1 8 0M12 9l1.5-2" {...p} />
        </>
      );
      break;
    case 'flame':
      body = <Path d="M12 3c4 4 6 7 6 10a6 6 0 0 1-12 0c0-2 1-4 3-6 0 2 1 3 2 3 0-3 0-5 1-7z" {...p} />;
      break;
    case 'share':
      body = <Path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" {...p} />;
      break;
    case 'send':
      body = <Path d="M4 12l16-8-6 16-2-7z" {...p} />;
      break;
    case 'info':
      body = (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v5M12 8h.01" {...p} />
        </>
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {body}
    </Svg>
  );
}
