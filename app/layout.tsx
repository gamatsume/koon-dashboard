import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vaultダッシュボード",
  description: "Obsidian の Markdown フォルダを表示するダッシュボード",
};

// 描画前に data-theme を確定させる。これが無いと初回表示で明→暗のちらつきが出る。
// 保存済みの選択が無ければ OS の設定に従う。
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","light")}})()`;

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  // ノートをモーダルで重ねるためのスロット。開いていないときは null（app/@modal/default.tsx）
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* next/script の beforeInteractive は初期HTMLに埋め込まれず描画後に走るため、
            ちらつき防止にはならない。ここは生の script である必要がある。 */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        {modal}
      </body>
    </html>
  );
}
