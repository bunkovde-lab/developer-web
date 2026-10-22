import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Девелопер — сетевая настольная игра",
  description: "Комната по ссылке, общее игровое поле и личные карты.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
