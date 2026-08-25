/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // All colors flow through CSS variables so the Telegram theme can
        // override them at runtime (see src/index.css + telegram/theme.ts).
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface-2)',
        hair: 'var(--hairline)',
        ink: 'var(--text)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        win: 'var(--win)',
        lose: 'var(--lose)',
        gold: 'var(--gold)',
        silver: 'var(--silver)',
        bronze: 'var(--bronze)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        display: ['"Space Grotesk"', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 var(--hairline), 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px var(--accent), 0 0 22px -4px var(--accent)',
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: 'var(--accent-flash)' },
          '100%': { backgroundColor: 'transparent' },
        },
        pop: {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flip: {
          '0%': { transform: 'rotateX(90deg)', opacity: '0' },
          '100%': { transform: 'rotateX(0deg)', opacity: '1' },
        },
        rise: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 var(--accent-flash)' },
          '50%': { boxShadow: '0 0 0 6px transparent' },
        },
      },
      animation: {
        flash: 'flash 900ms ease-out',
        pop: 'pop 220ms cubic-bezier(.2,.9,.3,1.2)',
        flip: 'flip 500ms cubic-bezier(.2,.7,.2,1) both',
        rise: 'rise 360ms ease-out both',
        shimmer: 'shimmer 2.2s linear infinite',
        pulseGlow: 'pulseGlow 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
