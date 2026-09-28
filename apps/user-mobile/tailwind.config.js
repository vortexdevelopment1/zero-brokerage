/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#FFFFFF",
          dark: "#09090B",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F4F4F5",
          subtle: "#FAFAFA",
        },
        "muted-surface": "#F4F4F5",
        "primary-content": "#09090B",
        "secondary-content": "#71717A",
        "muted-content": "#A1A1AA",
        "inverse-content": "#FFFFFF",

        "subtle-border": "#F4F4F5",
        "default-border": "#E4E4E7",
        "strong-border": "#D4D4D8",

        brand: {
          DEFAULT: "#0A3C61",
          primary: "#0A3C61",
          dark: "#062A45",
          light: "#E3F0FA",
          hover: "#0E4F80",
          accent: "#D3822A",
          "accent-light": "#FCEFD8",
        },

        interactive: {
          DEFAULT: "#0A3C61",
          hover: "#0E4F80",
          pressed: "#062A45",
        },

        disabled: {
          background: "#F4F4F5",
          content: "#A1A1AA",
          border: "#E4E4E7",
        },

        success: {
          DEFAULT: "#159862",
          light: "#E1F5EB",
          text: "#0F7A4E",
          border: "#A3E0C4",
        },

        warning: {
          DEFAULT: "#C07A00",
          light: "#FCEFD8",
          text: "#9A5B00",
          border: "#F7D69B",
        },

        error: {
          DEFAULT: "#D33A2E",
          light: "#FBE7E5",
          text: "#B3261E",
          border: "#F6B3AD",
        },

        info: {
          DEFAULT: "#1877BE",
          light: "#E3F0FA",
          text: "#0E4F80",
          border: "#B8D9F0",
        },

        overlay: {
          DEFAULT: "rgba(9, 9, 11, 0.5)",
          subtle: "rgba(9, 9, 11, 0.25)",
        },
      },
      borderRadius: {
        small: "4px",
        medium: "8px",
        large: "12px",
        "extra-large": "16px",
        pill: "9999px",
      },
      spacing: {
        1: "4px",
        2: "8px",
        3: "12px",
        4: "16px",
        5: "20px",
        6: "24px",
        8: "32px",
        10: "40px",
        12: "48px",
        16: "64px",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms",
        slow: "400ms",
      },
      fontSize: {
        display: ["32px", { lineHeight: "40px", letterSpacing: "-0.5px" }],
        h1: ["28px", { lineHeight: "34px", letterSpacing: "-0.4px" }],
        h2: ["24px", { lineHeight: "30px", letterSpacing: "-0.3px" }],
        h3: ["20px", { lineHeight: "26px", letterSpacing: "-0.2px" }],
        title: ["18px", { lineHeight: "24px", letterSpacing: "-0.1px" }],
        "body-large": ["16px", { lineHeight: "24px", letterSpacing: "0px" }],
        body: ["14px", { lineHeight: "20px", letterSpacing: "0px" }],
        "body-small": ["13px", { lineHeight: "18px", letterSpacing: "0px" }],
        label: ["12px", { lineHeight: "16px", letterSpacing: "0.2px" }],
        caption: ["11px", { lineHeight: "14px", letterSpacing: "0.2px" }],
      },
    },
  },
  plugins: [],
};
