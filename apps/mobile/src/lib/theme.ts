import { colors, type ThemeColors } from '@pzr/ui';
import { useColorScheme } from 'react-native';

export function useThemeColors(): ThemeColors {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}

const priceFormat = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });

export function formatPrice(price: number | null, priceType: string, unit: string): string {
  if (priceType === 'negotiable' || price === null) {
    return 'Do uzgodnienia';
  }
  return `${priceFormat.format(price)} / ${unit}`;
}
