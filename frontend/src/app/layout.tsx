import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SupplyAlert | AI-Powered Supply Chain Risk Intelligence",
  description:
    "Predict supply chain disruptions before they happen. SupplyAlert uses AI and real-time global signals to protect your logistics operations.",
  keywords: ["supply chain", "risk prediction", "AI logistics", "disruption alerts"],
  openGraph: {
    title: "SupplyAlert — No Surprises. Just Solutions.",
    description: "AI-powered early warning system for global supply chain disruptions.",
    type: "website",
  },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
