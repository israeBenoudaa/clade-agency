/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0A1E3F',
          deep: '#061530',
          soft: '#1B3260',
          light: '#2D4A7C',
        },
        paper: {
          DEFAULT: '#FAFBFD',
          warm: '#F4F6FB',
        },
        electric: '#06B6D4',
        accent: '#3B82F6',
        muted: '#6B7A99',
        border: {
          DEFAULT: '#E4E8F0',
          soft: '#EEF1F6',
        },
      },
      fontFamily: {
        display: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter Tight', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out both',
        'slide-right': 'slideRight 0.6s ease-out both',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'shimmer': 'shimmer 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 3s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: 0, transform: 'translateX(-20px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
      },
      backgroundImage: {
        'gradient-ink': 'linear-gradient(135deg, #061530 0%, #0A1E3F 50%, #1B3260 100%)',
        'gradient-electric': 'linear-gradient(135deg, #06B6D4, #3B82F6)',
        'dot-pattern': 'radial-gradient(#E4E8F0 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
