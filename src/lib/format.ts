// Crypto convention: "$82,431.00" for every locale.
const locale = 'en-US';

export function formatPrice(value: number): string {
  const digits = value >= 1000 ? 2 : value >= 1 ? 2 : value >= 0.01 ? 4 : 8;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Splits a formatted price so the decimals can be rendered dimmer. */
export function splitPrice(value: number): [string, string] {
  const text = formatPrice(value);
  const match = text.match(/^(.*?)([.,]\d+)(\D*)$/);
  return match ? [match[1], match[2] + match[3]] : [text, ''];
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
