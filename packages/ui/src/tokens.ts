/**
 * Kaypi · tokens de diseño — marca Runa.
 *
 * Fuente de verdad en JS (espejo de `theme.css`, que los expone como CSS vars para
 * Tailwind v4 en web). En móvil, NativeWind/StyleSheet consume este objeto para que
 * web y app compartan EXACTAMENTE la misma paleta, radios y tipografía.
 *
 * Color en oklch (perceptualmente uniforme): L (claridad) · C (croma) · H (matiz).
 * Neutros fríos (H≈264) + primario violeta Runa (#5546E1, H≈279) y verde de
 * confirmación (#0EA371, H≈162). Estados: success/warning/destructive.
 */
export const tokens = {
  color: {
    light: {
      background: 'oklch(0.984 0.004 264)',
      foreground: 'oklch(0.239 0.021 264)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.239 0.021 264)',
      primary: 'oklch(0.511 0.224 279)',
      primaryForeground: 'oklch(1 0 0)',
      secondary: 'oklch(0.954 0.004 256)',
      secondaryForeground: 'oklch(0.405 0.031 265)',
      muted: 'oklch(0.959 0.008 279)',
      mutedForeground: 'oklch(0.501 0.025 259)',
      accent: 'oklch(0.942 0.026 293)',
      accentForeground: 'oklch(0.411 0.195 278)',
      border: 'oklch(0.932 0.011 257)',
      input: 'oklch(0.932 0.011 257)',
      ring: 'oklch(0.511 0.224 279)',
      success: 'oklch(0.634 0.136 162)',
      successForeground: 'oklch(1 0 0)',
      warning: 'oklch(0.785 0.159 73)',
      warningForeground: 'oklch(0.31 0.06 70)',
      destructive: 'oklch(0.626 0.193 23)',
      destructiveForeground: 'oklch(1 0 0)',
    },
    dark: {
      background: 'oklch(0.19 0.015 270)',
      foreground: 'oklch(0.95 0.006 264)',
      card: 'oklch(0.225 0.018 270)',
      cardForeground: 'oklch(0.95 0.006 264)',
      primary: 'oklch(0.62 0.19 281)',
      primaryForeground: 'oklch(0.99 0.006 279)',
      secondary: 'oklch(0.28 0.018 270)',
      secondaryForeground: 'oklch(0.95 0.006 264)',
      muted: 'oklch(0.28 0.018 270)',
      mutedForeground: 'oklch(0.71 0.02 264)',
      accent: 'oklch(0.33 0.07 280)',
      accentForeground: 'oklch(0.92 0.04 285)',
      border: 'oklch(0.30 0.015 268)',
      input: 'oklch(0.32 0.015 268)',
      ring: 'oklch(0.62 0.19 281)',
      success: 'oklch(0.68 0.14 162)',
      successForeground: 'oklch(0.16 0.02 162)',
      warning: 'oklch(0.80 0.15 75)',
      warningForeground: 'oklch(0.22 0.05 70)',
      destructive: 'oklch(0.64 0.19 23)',
      destructiveForeground: 'oklch(0.99 0.01 23)',
    },
  },
  radius: { sm: '0.375rem', md: '0.5rem', lg: '0.75rem' },
  /** Escala de espaciado en px (múltiplos de 4). */
  space: [0, 4, 8, 12, 16, 24, 32, 48, 64] as const,
  font: {
    sans: '"Geist", ui-sans-serif, system-ui, sans-serif',
    mono: '"Geist Mono", ui-monospace, SFMono-Regular, monospace',
  },
  /** Easing y duraciones canónicas para animaciones (filosofía: propósito > decoración). */
  motion: {
    easing: [0.32, 0.72, 0, 1] as [number, number, number, number],
    duracion: { micro: 0.18, base: 0.28, lento: 0.4 },
  },
} as const;

export type Tokens = typeof tokens;
