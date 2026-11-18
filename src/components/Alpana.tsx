import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G } from 'react-native-svg';
import colors from '../constants/colors';

const PETALS = Array.from({ length: 8 }, (_, i) => i * 45);
const DOTS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i * 22.5 * Math.PI) / 180;
  return { x: 100 + 86 * Math.sin(angle), y: 100 - 86 * Math.cos(angle) };
});

/**
 * Alpana (Bengali floor-art) motif: concentric circles, 8 petals and a ring of dots.
 * Decorative only — use a low `opacity` (~0.12 in headers, ~0.05 behind screens).
 */
export function Alpana({ size = 160, opacity = 0.12, color = colors.brand, style }: {
  size?: number;
  opacity?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={[{ opacity, pointerEvents: 'none' }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={100} cy={100} r={96} stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={100} cy={100} r={74} stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={100} cy={100} r={40} stroke={color} strokeWidth={1.5} fill="none" />
      <Circle cx={100} cy={100} r={12} fill={color} />
      {PETALS.map((angle) => (
        <G key={angle} transform={`rotate(${angle} 100 100)`}>
          <Ellipse cx={100} cy={52} rx={13} ry={28} stroke={color} strokeWidth={1.5} fill="none" />
        </G>
      ))}
      {DOTS.map((dot, index) => (
        <Circle key={index} cx={dot.x} cy={dot.y} r={2.6} fill={color} />
      ))}
    </Svg>
  );
}
