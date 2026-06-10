/**
 * Kaypi · tokens de diseño — dirección "Presencia serena".
 *
 * Fuente de verdad en JS (espejo de `theme.css`, que los expone como CSS vars para
 * Tailwind v4 en web). En móvil, NativeWind/StyleSheet consume este objeto para que
 * web y app compartan EXACTAMENTE la misma paleta, radios y tipografía.
 *
 * Color en oklch (perceptualmente uniforme): L (claridad) · C (croma) · H (matiz).
 * Neutros casi monocromáticos con un matiz frío (H≈250) + un único acento
 * "confirmado" teal-verde (H≈165). Estados: success/warning/destructive.
 */
export const tokens = {
  color: {
    light: {
      background: 'oklch(0.99 0.002 250)',
      foreground: 'oklch(0.21 0.012 250)',
      card: 'oklch(1 0 0)',
      cardForeground: 'oklch(0.21 0.012 250)',
      primary: 'oklch(0.70 0.13 165)',
      primaryForeground: 'oklch(0.99 0.01 165)',
      secondary: 'oklch(0.96 0.005 250)',
      secondaryForeground: 'oklch(0.30 0.012 250)',
      muted: 'oklch(0.96 0.005 250)',
      mutedForeground: 'oklch(0.52 0.012 250)',
      accent: 'oklch(0.95 0.025 165)',
      accentForeground: 'oklch(0.28 0.06 165)',
      border: 'oklch(0.92 0.004 250)',
      input: 'oklch(0.92 0.004 250)',
      ring: 'oklch(0.70 0.13 165)',
      success: 'oklch(0.72 0.15 150)',
      successForeground: 'oklch(0.99 0.01 150)',
      warning: 'oklch(0.80 0.15 80)',
      warningForeground: 'oklch(0.27 0.05 80)',
      destructive: 'oklch(0.58 0.20 25)',
      destructiveForeground: 'oklch(0.99 0.01 25)',
    },
    dark: {
      background: 'oklch(0.18 0.01 250)',
      foreground: 'oklch(0.95 0.005 250)',
      card: 'oklch(0.21 0.012 250)',
      cardForeground: 'oklch(0.95 0.005 250)',
      primary: 'oklch(0.72 0.13 165)',
      primaryForeground: 'oklch(0.16 0.02 165)',
      secondary: 'oklch(0.27 0.012 250)',
      secondaryForeground: 'oklch(0.95 0.005 250)',
      muted: 'oklch(0.27 0.012 250)',
      mutedForeground: 'oklch(0.70 0.012 250)',
      accent: 'oklch(0.30 0.04 165)',
      accentForeground: 'oklch(0.92 0.04 165)',
      border: 'oklch(0.30 0.01 250)',
      input: 'oklch(0.32 0.01 250)',
      ring: 'oklch(0.72 0.13 165)',
      success: 'oklch(0.70 0.15 150)',
      successForeground: 'oklch(0.16 0.02 150)',
      warning: 'oklch(0.80 0.15 80)',
      warningForeground: 'oklch(0.20 0.04 80)',
      destructive: 'oklch(0.62 0.20 25)',
      destructiveForeground: 'oklch(0.99 0.01 25)',
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
