/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-bright': '#f5f7f9',
        'tertiary-fixed-dim': '#f976ba',
        'primary-dim': '#00557b',
        'secondary-fixed-dim': '#78cef7',
        'outline-variant': '#abadaf',
        'surface-variant': '#d9dde0',
        'tertiary-fixed': '#ff8bc5',
        'inverse-on-surface': '#9a9d9f',
        'primary-container': '#34b5fa',
        'surface-container-low': '#eef1f3',
        'secondary-dim': '#005672',
        primary: '#00628c',
        'primary-fixed': '#34b5fa',
        'on-tertiary-fixed-variant': '#73004b',
        'tertiary-container': '#ff8bc5',
        'on-secondary-fixed': '#00394c',
        'surface-container-highest': '#d9dde0',
        'inverse-primary': '#34b5fa',
        'on-primary': '#e9f4ff',
        'surface-tint': '#00628c',
        'error-container': '#fb5151',
        'primary-fixed-dim': '#17a8ec',
        surface: '#f5f7f9',
        secondary: '#006382',
        background: '#f5f7f9',
        'on-surface': '#2c2f31',
        'on-tertiary-fixed': '#360021',
        'surface-container-high': '#dfe3e6',
        'tertiary-dim': '#912063',
        'surface-dim': '#d0d5d8',
        'surface-container-lowest': '#ffffff',
        'secondary-fixed': '#93dbff',
        'on-error': '#ffefee',
        'inverse-surface': '#0b0f10',
        'on-tertiary': '#ffeff3',
        outline: '#747779',
        'on-error-container': '#570008',
        'on-secondary': '#e5f5ff',
        tertiary: '#a02d70',
        error: '#b31b25',
        'on-primary-fixed-variant': '#003954',
        'on-secondary-fixed-variant': '#005773',
        'on-tertiary-container': '#630040',
        'on-primary-fixed': '#00121e',
        'on-background': '#2c2f31',
        'on-secondary-container': '#004d67',
        'error-dim': '#9f0519',
        'on-primary-container': '#003047',
        'on-surface-variant': '#595c5e',
        'secondary-container': '#93dbff',
        'surface-container': '#e5e9eb'
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px'
      },
      fontFamily: {
        headline: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Be Vietnam Pro', 'sans-serif'],
        label: ['Plus Jakarta Sans', 'sans-serif']
      }
    }
  },
  plugins: []
};
