import { Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme';

type Props = TextProps & {
  size?: number;
  weight?: keyof typeof fonts;
  color?: string;
  /** Tabular figures so prices don't jitter while they update. */
  numeric?: boolean;
};

export function Txt({ size = 15, weight = 'regular', color = colors.text, numeric, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fonts[weight],
          fontSize: size,
          color,
          lineHeight: Math.round(size * 1.3),
          letterSpacing: size >= 28 ? -0.8 : size >= 20 ? -0.3 : 0,
        },
        numeric && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}
