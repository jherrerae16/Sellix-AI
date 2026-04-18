import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AI-Native brand palette
        brand: {
          blue: "#6366F1",   // indigo (primary)
          red: "#EF4444",
          orange: "#F59E0B",
          green: "#10B981",
        },
        risk: {
          high: "#EF4444",
          medium: "#F59E0B",
          low: "#10B981",
        },
        accent: {
          emerald: "#10B981",
          violet: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 2px 8px -2px rgb(99 102 241 / 0.08)',
        'soft-lg': '0 10px 30px -10px rgb(99 102 241 / 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
