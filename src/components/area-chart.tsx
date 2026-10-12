import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors } from '@/theme';

type Props = {
  data: number[];
  height: number;
  color?: string;
  /** Draws a dashed guide and a dot at the last point. */
  marker?: boolean;
  strokeWidth?: number;
};

export function AreaChart({ data, height, color = colors.accent, marker = false, strokeWidth = 2 }: Props) {
  const [width, setWidth] = useState(0);
  const gradientId = `g${color.replace(/[^a-z0-9]/gi, '')}`;

  let line = '';
  let area = '';
  let last = { x: 0, y: 0 };
  if (width > 0 && data.length > 1) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = marker ? 8 : 2;
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * width,
      y: pad + (1 - (v - min) / span) * (height - pad * 2),
    }));
    line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    area = `${line} L${width},${height} L0,${height} Z`;
    last = pts[pts.length - 1];
  }

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && line ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gradientId})`} />
          <Path d={line} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinejoin="round" />
          {marker ? (
            <>
              <Line
                x1={0}
                x2={width}
                y1={last.y}
                y2={last.y}
                stroke={color}
                strokeOpacity={0.5}
                strokeDasharray="4 5"
              />
              <Circle cx={last.x - 4} cy={last.y} r={5} fill={color} />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}
