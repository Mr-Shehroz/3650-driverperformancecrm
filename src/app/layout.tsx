import type { Metadata, Viewport } from "next";
import { Inter, Barlow } from "next/font/google";
import { Toaster } from "sonner";
import { SwRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow",
  display: "swap",
});
// metadata 
export const metadata: Metadata = {
  title: { default: "DRS Performance Portal", template: "%s · DRS Portal" },
  description:
    "Driver and sales performance portal for Direct Relocation Services",
  applicationName: "DRS Portal",
  appleWebApp: {
    capable: true,
    title: "DRS Portal",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable}`}>
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: "var(--font-inter)", fontSize: 15 },
          }}
        />
        <SwRegister />
      </body>
    </html>
  );
}
