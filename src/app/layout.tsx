import type { Metadata } from "next";
import { QueryProvider } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LG SwapIt",
  description: "Photo-based appliance swap and credit prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

