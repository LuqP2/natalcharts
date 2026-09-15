import type { Metadata } from "next";
import "@fontsource/noto-sans-symbols-2/symbols-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mandala Natal",
  description:
    "Gere gratuitamente uma mandala natal tropical completa, calculada no seu navegador.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
