/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0F1A',
        panel: '#131826',
        violet: '#7C6FFF',
        cyan: '#4FD8EA',
        text: {
          primary: '#EDEFF7',
          muted: '#8B90A8',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        glow: '0 0 40px rgba(124, 111, 255, 0.25)',
      },
    },
  },
  plugins: [],
}
