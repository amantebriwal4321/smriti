import type { Metadata } from "next";
import { Fraunces, Inter, Noto_Sans_Devanagari, Noto_Sans_Kannada } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "600"] });
const kann = Noto_Sans_Kannada({ variable: "--font-kann", subsets: ["kannada"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Smriti · living map of India's heritage archives",
  description: "Turn monument photos, Devanagari and Kannada scans and travel journals into a searchable, mapped, multilingual archive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${deva.variable} ${kann.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
