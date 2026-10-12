import { splitPrice } from '@/lib/format';
import { colors } from '@/theme';
import { Txt } from './text';

/** Big price with dimmed decimals, like "$92,882.40". */
export function Price({ value, size = 36 }: { value: number; size?: number }) {
  const [whole, decimals] = splitPrice(value);
  return (
    <Txt size={size} weight="semibold" style={{ letterSpacing: -0.5 }} numberOfLines={1} adjustsFontSizeToFit>
      {whole}
      <Txt size={size} weight="semibold" color={colors.textFaint}>
        {decimals}
      </Txt>
    </Txt>
  );
}
