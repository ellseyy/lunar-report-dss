import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Landing Report",
  description: "Telemetry-backed lunar landing site evaluation and DTE communication report engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#050505] text-white font-sans antialiased selection:bg-white selection:text-[#050505]">
        {children}
      </body>
    </html>
  );
}