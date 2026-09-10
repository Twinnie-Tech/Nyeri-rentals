import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { SanityLive } from "@/lib/sanity/live";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GreenKey Realty | Homes, Land & Stays in Nyeri",
    template: "%s | GreenKey Realty",
  },
  description:
    "Rent homes, buy property, list Airbnb stays, find luxury villas, plots, and farmland across Nyeri County.",
  keywords: [
    "Nyeri real estate",
    "GreenKey Realty",
    "homes for sale Nyeri",
    "Airbnb Nyeri",
    "villas Nyeri",
    "plots for sale",
    "farmland Nyeri",
    "houses",
    "apartments",
    "bedsitter",
  ],
  authors: [{ name: "Twinnie Tech" }],
  creator: "Twinnie Tech",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ),
  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "GreenKey Realty",
    title: "GreenKey Realty | Homes, Land & Stays in Nyeri",
    description:
      "Rent, buy, host, or invest — homes, villas, Airbnb stays, plots, and farmland in Nyeri County.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GreenKey Realty | Homes, Land & Stays in Nyeri",
    description:
      "Rent, buy, host, or invest — homes, villas, Airbnb stays, plots, and farmland in Nyeri County.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F7F5" },
    { media: "(prefers-color-scheme: dark)", color: "#1A2420" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.sanity.io" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${manrope.variable} ${fraunces.variable} ${geistMono.variable} font-body antialiased`}
      >
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
        <Toaster />
        <SanityLive />
      </body>
    </html>
  );
}
