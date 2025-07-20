/** @type {import('tailwindcss').Config} */

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // AWS Themed Colors
        aws: {
          orange: {
            DEFAULT: "#FF9900", // AWS Orange (255, 153, 0) - similar to (214,102,42) but brighter
            light: "#FFB84D",
            dark: "#E68A00",
          },
          yellow: {
            // From previous
            DEFAULT: "#FFC107",
            light: "#FFD147",
          },
          blue: {
            // AWS Dark Blue/Squid Ink (35,48,61)
            DEFAULT: "#232F3E",
            light: "#3A4A5E", // Lighter shade for UI elements
            sky: "#53B1FF", // A vibrant blue accent (similar to palette's Blue)
          },
          gray: {
            // From palette
            light: "#F5F5F5", // Base01 (250,250,250) is too white, F5F5F5 is a common light gray
            medium: "#E0E0E0", // For borders
            dark: "#4A4A4A", // For text
            textMuted: "#5F6B7A", // (90,109,132) from palette Base2 for muted text
          },
          cyan: {
            // From palette (23,128,182)
            DEFAULT: "#1780B6",
            light: "#67C8F0",
          },
          green: {
            // From palette (68,132,48)
            DEFAULT: "#448430",
          },
          purple: {
            medium: "#9d71f0"
          }
          // Add other accent colors if needed
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px #FF9900, 0 0 10px #FF9900" },
          "50%": { boxShadow: "0 0 15px #FFC107, 0 0 25px #FFC107" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(-5%)", animationTimingFunction: "cubic-bezier(0.8,0,1,1)" },
          "50%": { transform: "translateY(0)", animationTimingFunction: "cubic-bezier(0,0,0.2,1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s infinite ease-in-out",
        "bounce-subtle": "bounce-subtle 1s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} 

export default config
