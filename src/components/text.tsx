import { Text, type TextProps } from 'react-native';

import { colors, fonts } from '@/theme';

type Props = TextProps & {
  size?: number;
  weight?: keyof typeof fonts;
  color?: string;
};

export function Txt({ size = 15, weight = 'regular', color = colors.text, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts[weight], fontSize: size, color, lineHeight: size * 1.25 }, style]}
    />
  );
}
