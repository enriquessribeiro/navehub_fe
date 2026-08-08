import type { Config } from "tailwindcss";

/**
 * Tokens de marca do NaveHub.
 *
 * Paleta: preto "Nave" (sidebar/topbar, ecoando o site do Nave Cursos) +
 * amarelo como cor de ação/destaque, sobre um canvas claro e quente — a
 * área de trabalho é usada por longos períodos (resolver questões, ler e
 * escrever redação), então o conteúdo em si fica em superfícies claras de
 * alto contraste; o preto/amarelo fica reservado para navegação, marca e
 * pontos de destaque, não para blocos grandes de texto.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        nave: {
          black: "#0B0B0C",
          "black-soft": "#18181B",
          yellow: "#F2B705",
          "yellow-soft": "#FCE8A8",
          "yellow-strong": "#B8890A",
        },
        ink: "#17170F",
        muted: "#6B6B63",
        canvas: "#F7F6F1",
        surface: "#FFFFFF",
        line: "#E7E4D9",
        success: "#1E8E5A",
        "success-soft": "#DCF3E7",
        pending: "#B8890A",
        "pending-soft": "#FBEAC7",
        danger: "#C4432E",
        "danger-soft": "#F8E1DC",
      },
      fontFamily: {
        display: ["\"Space Grotesk\"", "system-ui", "sans-serif"],
        body: ["\"Inter\"", "system-ui", "sans-serif"],
        mono: ["\"JetBrains Mono\"", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "10px",
        control: "8px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 23, 15, 0.06), 0 1px 0 rgba(23, 23, 15, 0.04)",
      },
    },
  },
  plugins: [],
} satisfies Config;
