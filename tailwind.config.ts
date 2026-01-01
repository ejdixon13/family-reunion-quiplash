import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        quiplash: {
          yellow: "#FFD600",
          blue: "#1A237E",
          purple: "#7C4DFF",
          pink: "#FF4081",
        },
        whatsapp: {
          green: "#25D366",
          teal: "#128C7E",
          outgoing: "#DCF8C6",
          incoming: "#FFFFFF",
          bg: "#ECE5DD",
        },
      },
      fontFamily: {
        display: ["Fredoka", "cursive"],
        body: ["Nunito", "sans-serif"],
      },
      animation: {
        "bounce-in": "bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "slide-in-left": "slideInLeft 0.5s ease-out forwards",
        "slide-in-right": "slideInRight 0.5s ease-out forwards",
        "winner-pulse": "winnerPulse 1s ease-in-out infinite",
        "quiplash-burst": "quiplashBurst 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards",
        shake: "shake 0.3s ease-in-out",
        float: "float 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
