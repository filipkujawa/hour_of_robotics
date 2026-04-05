import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "@/app/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces"
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono"
});

export const metadata: Metadata = {
  title: "Hour of Robotics",
  description: "A premium robotics learning environment for high school students using the Innate MARS robot."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <Toaster richColors={false} position="top-right" />
      </body>
    </html>
  );
}
