"use client";

import { type ReactNode, useState } from "react";

/**
 * 1枚ずつ出すカード（ドキュメント・習慣）の送り操作。
 *
 * 日付を1日ずつ動かすのではなく、フォルダに実際にあるノートの一覧を動かす。
 * 記録の無い日を踏まないので、抜けのあるフォルダでも素直に遡れる。
 * 一覧は新しい順なので、添字 0 が最新。
 */

const arrow =
  "rounded-full px-2 text-base leading-6 text-zinc-500 transition enabled:hover:bg-zinc-100 disabled:opacity-25 dark:enabled:hover:bg-zinc-800";
const reset =
  "rounded-full px-2 py-0.5 text-xs text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800";

export function PagerBar({
  labels,
  index,
  onIndex,
  resetTo = 0,
  resetLabel,
  children,
}: {
  labels: string[];
  index: number;
  onIndex: (next: number) => void;
  /** 戻るボタンの行き先。習慣は今日、ドキュメントは最新 */
  resetTo?: number;
  resetLabel: string;
  /** 右端に添えるもの（達成数など） */
  children?: ReactNode;
}) {
  // 1枚しか無いなら送る先が無いので出さない
  if (labels.length < 2) {
    return children ? <div className="mb-3 flex justify-end text-xs">{children}</div> : null;
  }

  return (
    <div className="mb-3 flex items-center gap-1">
      <button
        type="button"
        onClick={() => onIndex(index + 1)}
        disabled={index >= labels.length - 1}
        aria-label="前のノート"
        className={arrow}
      >
        ‹
      </button>
      <select
        value={index}
        onChange={(e) => onIndex(Number(e.target.value))}
        aria-label="ノートを選ぶ"
        className="max-w-[12rem] rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {labels.map((label, i) => (
          <option key={i} value={i}>
            {label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onIndex(index - 1)}
        disabled={index <= 0}
        aria-label="次のノート"
        className={arrow}
      >
        ›
      </button>
      {index !== resetTo && (
        <button type="button" onClick={() => onIndex(resetTo)} className={reset}>
          {resetLabel}
        </button>
      )}
      {children && <span className="ml-auto text-xs">{children}</span>}
    </div>
  );
}

/**
 * サーバー側で作った中身を受け取り、選ばれた1枚だけを出す。
 * 中身の組み立てはサーバーに残したいので、ここでは出し分けだけを持つ。
 */
export default function CardPager({
  labels,
  pages,
  resetLabel = "最新",
}: {
  labels: string[];
  pages: ReactNode[];
  resetLabel?: string;
}) {
  const [index, setIndex] = useState(0);
  const at = Math.min(index, pages.length - 1);

  return (
    <>
      <PagerBar labels={labels} index={at} onIndex={setIndex} resetLabel={resetLabel} />
      {pages[at]}
    </>
  );
}
