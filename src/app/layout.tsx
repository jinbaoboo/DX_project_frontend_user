import type { Metadata, Viewport } from "next";
import { PreventPageZoom } from "./PreventPageZoom";
import { QueryProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LG SwapIt",
  description: "Photo-based appliance swap and credit prototype",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <PreventPageZoom />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
