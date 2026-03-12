import type { Metadata, Viewport } from "next";
import { Geist, Lora, Caveat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { InventoryProvider } from "@/context/InventoryContext";
import { Toaster } from "react-hot-toast";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InvenStories",
  description: "A living inventory of things that matter",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#8b6914",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${lora.variable} ${caveat.variable} font-sans antialiased`}>
        <AuthProvider>
          <InventoryProvider>
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  borderRadius: "6px",
                  background: "#2c2416",
                  color: "#faf7f2",
                  fontSize: "13px",
                },
              }}
            />
          </InventoryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
