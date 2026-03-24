import type { Metadata } from "next";
import "./globals.css";
import GameBoyShell from "./components/GameBoyShell";

export const metadata: Metadata = {
  title: "Cyberspace Arcade",
  description: "A retro Game Boy experience by Luthfi Gifari",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GameBoyShell>{children}</GameBoyShell>
      </body>
    </html>
  );
}
