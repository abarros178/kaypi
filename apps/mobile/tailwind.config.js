/**
 * NativeWind v4 (Tailwind v3) para móvil.
 *
 * Espejo de la línea "Presencia serena" (ver DESIGN.md y @kaypi/ui/tokens). Como React Native
 * aún no parsea oklch en estilos nativos, aquí van equivalentes hex aproximados. Si afinas un
 * color, mantenlo coherente con los tokens oklch de web. — pendiente de Felipe: conversión fiel.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './index.ts', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#fcfcfd',
        foreground: '#27272f',
        card: '#ffffff',
        muted: '#f4f4f6',
        'muted-foreground': '#71717a',
        border: '#e6e6ea',
        primary: '#13b3a4',
        'primary-foreground': '#f7fffd',
        success: '#1fbf66',
        warning: '#e6a82b',
        destructive: '#dc3a3a',
      },
      fontFamily: {
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
