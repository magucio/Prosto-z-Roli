// Design tokens „Prosto z Roli”: ziemiste, ciepłe barwy; zieleń tylko jako akcent stanu.
export const palette = {
  soil900: '#1F1B16',
  soil700: '#4A4239',
  soil500: '#6B645B',
  soil300: '#A8A095',
  soil100: '#E7E1D8',
  cream50: '#FAF7F2',
  white: '#FFFFFF',
  rust600: '#A8481F',
  rust500: '#B5552B',
  rust400: '#E07A4C',
  leaf600: '#3E6B48',
  leaf400: '#6FA07A',
  wheat500: '#C9A227',
  danger500: '#C0392B',
  danger400: '#E5735F',
  night900: '#15130F',
  night800: '#1F1C17',
  night700: '#2A261F',
} as const;

export const colors = {
  light: {
    background: palette.cream50,
    surface: palette.white,
    surfaceMuted: '#F2EDE5',
    text: palette.soil900,
    textMuted: palette.soil500,
    border: palette.soil100,
    primary: palette.rust500,
    primaryPressed: palette.rust600,
    onPrimary: palette.white,
    success: palette.leaf600,
    warning: palette.wheat500,
    danger: palette.danger500,
  },
  dark: {
    background: palette.night900,
    surface: palette.night800,
    surfaceMuted: palette.night700,
    text: '#F3EEE6',
    textMuted: palette.soil300,
    border: '#3A342C',
    primary: palette.rust400,
    primaryPressed: palette.rust500,
    onPrimary: palette.night900,
    success: palette.leaf400,
    warning: palette.wheat500,
    danger: palette.danger400,
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = { [K in keyof (typeof colors)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const typography = {
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
} as const;
