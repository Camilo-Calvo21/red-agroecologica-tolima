/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Display: Fraunces — serif cálido con personalidad editorial
        display: ['"Fraunces"', 'Georgia', 'serif'],
        // Body: Manrope — sans humanista que se siente cercano
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        // Mono: para datos numéricos
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Paleta tierra
        tierra: {
          50:  '#FAF7F2',
          100: '#F0E9DD',
          200: '#E0D2BC',
          300: '#C9B391',
          400: '#A88560',
          500: '#8B6845',
          600: '#6E4F32',
          700: '#523A24',
          800: '#3A291A',
          900: '#221810',
        },
        // Paleta musgo/agroecología
        musgo: {
          50:  '#F2F6F0',
          100: '#DEEAD8',
          200: '#BDD4B0',
          300: '#94B681',
          400: '#6E9658',
          500: '#52793D',
          600: '#3F5F2E',
          700: '#314824',
          800: '#23341A',
          900: '#162110',
        },
        // Paleta agua
        agua: {
          50:  '#F0F7FB',
          100: '#D6EEF7',
          200: '#A6D8EC',
          300: '#6FBFDF',
          400: '#3FA4D0',
          500: '#1A82B5',
          600: '#0F6593',
          700: '#0A4D72',
          800: '#073753',
          900: '#042235',
        },
        // Acento ámbar (para alertas suaves y destacados)
        ambar: {
          400: '#E5A458',
          500: '#D08A3D',
          600: '#A86A2C',
        },
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '0.9rem' }],
      },
      animation: {
        'fade-in':       'fadeIn 0.5s ease-out',
        'slide-up':      'slideUp 0.5s ease-out',
        'pulse-soft':    'pulseSoft 3s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backgroundImage: {
        // Textura sutil de papel reciclado
        'paper-grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
