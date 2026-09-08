/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#F6F8FC',
        primary: '#2563EB',
        ai: '#7C3AED',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        dark: '#1E293B',
        muted: '#64748B',
        card: '#FFFFFF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
        glow: '0 0 20px rgba(124,58,237,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
        'glow-blue': '0 0 20px rgba(37,99,235,0.3)',
      }
    }
  },
  plugins: []
};
