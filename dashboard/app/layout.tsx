import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["cyrillic", "latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://home.home.arpa"),
  title: "Наш дім",
  description: "Спільний простір для справ, рецептів, речей і стану квартири.",
  openGraph: {
    title: "Наш дім",
    description: "Усе важливе — поруч",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Наш дім — домашня панель" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uk"><body className={manrope.variable}>{children}</body></html>;
}
