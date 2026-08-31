"use client";

/**
 * ライト／ダークの切り替え。
 *
 * 現在のテーマは React の state ではなく <html data-theme> から読む。
 * 表示するラベルも CSS（dark:）で出し分けるため、サーバとクライアントで
 * 同じHTMLになり、ハイドレーションのズレも初期表示のちらつきも起きない。
 */
export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // プライベートモード等で保存できなくても、その場の切り替えは成立させる
    }
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm text-zinc-700 shadow-sm transition hover:border-zinc-400 hover:shadow dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
    >
      <span className="dark:hidden">☾ ダーク</span>
      <span className="hidden dark:inline">☀ ライト</span>
    </button>
  );
}
