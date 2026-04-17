/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        theme: {
          bg:            'var(--bg)',
          'bg-alt':      'var(--bg-alt)',
          surface:       'var(--surface)',
          'surface-alt': 'var(--surface-alt)',
          border:        'var(--border)',
          text:          'var(--text)',
          muted:         'var(--text-muted)',
          accent:        'var(--accent)',
          accent2:       'var(--accent-2)',
          accent3:       'var(--accent-3)',
        },
      },
    },
  },
  plugins: [],
};
