/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        head: ['Archivo Black', 'sans-serif'],
        sans: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: 'var(--card)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        border: 'var(--border)',
        primary: 'var(--primary)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        danger: 'var(--danger)',
      },
      boxShadow: {
        retro: '4px 4px 0 0 var(--border)',
        'retro-lg': '8px 8px 0 0 var(--border)',
      },
    },
  },
  plugins: [],
}
