import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dedalus Chat Example",
  description: "A minimal Next.js example using dedalus-react",
  icons: {
    icon: "https://www.firmware.ai/api/media/file/dedalus-logo-gold.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
