import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "arkvvs.tools",
  description: "크리에이터를 위한 AI 툴킷",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
