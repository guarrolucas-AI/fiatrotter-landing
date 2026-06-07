/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-navy': '#003B5C',
        'brand-pink': '#E91E8C',
        'brand-blue': '#4285F4',
        'brand-green': '#34A853',
        'brand-red': '#EA4335',
      },
    },
  },
  plugins: [],
};
