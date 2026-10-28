"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * ダッシュボードの上に重ねるモーダル。
 *
 * 開いたときに URL は `/db/...` に変わっているので、閉じる＝`router.back()`。
 * これで「戻る」でも閉じられ、同じ URL を直接開けば単独ページとして出る。
 *
 * 枠には <dialog> を使う。Esc で閉じる・背面を操作不能にする・フォーカスを閉じ込める、
 * といった挙動がブラウザ側で用意されているため。
 */
export default function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // 本文を選択して枠の外で指を離したときに閉じてしまわないよう、押した場所も見る
  const pressedOutside = useRef(false);

  // 並列ルートのスロットは、別のページへ移っても直前の中身を保持する。
  // モーダル内のリンクを押したときに重なったまま残らないよう、
  // ノートの URL から離れたら自分で消える。
  const showing = pathname.startsWith("/db/");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, [showing]);

  function close() {
    router.back();
  }

  if (!showing) return null;

  return (
    <dialog
      ref={dialogRef}
      // Esc でブラウザが閉じたときも、URL を戻しておく
      onClose={close}
      className="h-full max-h-none w-full max-w-none overflow-y-auto bg-transparent p-0 backdrop:bg-black/60"
    >
      <div
        onMouseDown={(e) => {
          pressedOutside.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (pressedOutside.current && e.target === e.currentTarget) close();
        }}
        className="flex min-h-full justify-center p-4 sm:p-8"
      >
        <div className="relative h-max w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="absolute right-3 top-3 rounded px-2 py-0.5 text-sm text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
          {children}
        </div>
      </div>
    </dialog>
  );
}
