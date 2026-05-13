import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Toss palette
        bg: "#F9FAFB",
        surface: "#FFFFFF",
        ink: "#191F28",
        sub: "#4E5968",
        mute: "#8B95A1",
        line: "#E5E8EB",
        lineStrong: "#D1D6DB",
        chip: "#F2F4F6",
        brand: "#3182F6",
        brandHover: "#1B64DA",
        brandSoft: "#E8F2FE",
        success: "#22C55E",
        successSoft: "#E6F9ED",
        warn: "#F59E0B",
        warnSoft: "#FEF6E6",
        danger: "#F04452",
        dangerSoft: "#FEECEE",
        premium: "#8B5CF6",
        premiumHover: "#7C3AED",
        premiumSoft: "#F3EFFD",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        pop: "0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)",
      },
      borderRadius: {
        xl2: "16px",
        xl3: "20px",
      },
    },
  },
  plugins: [],
};
export default config;
