import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";

import { DeskShell } from "@/components/DeskShell";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "CHUKO Desk",
  description: "Sandbox desk for buying and selling USDT and USDC through the Breet API.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body>
        <DeskShell>{children}</DeskShell>
      </body>
    </html>
  );
}
