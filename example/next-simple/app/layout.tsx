import type { Metadata } from "next";

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
      <head>
        <style>{`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            background-color: #000705;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              Oxygen, Ubuntu, Cantarell, sans-serif;
          }
          input::placeholder {
            color: #3b3a35;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
