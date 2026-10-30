"use client";

import { useState } from "react";
// lib/dashboard.ts は fs を使うため、ここから値を import してはいけない。
// 必要なものはサーバー側のページから props で受け取る。
import type { ViewOption, ViewType, Width } from "@/lib/dashboard";

/**
 * `_view.md` を組み立てる。
 *
 * どのフォルダに置くかは利用者が決めるので、ここではフォルダを扱わない。
 * アプリは DB に書き込まないため、作るのは中身だけ。
 */

/** 6列ぶんのうち何列を使うか。分数は目安として添える */
const WIDTHS: { value: Width; fraction: string }[] = [
  { value: 1, fraction: "1/6" },
  { value: 2, fraction: "1/3" },
  { value: 3, fraction: "1/2" },
  { value: 4, fraction: "2/3" },
  { value: 5, fraction: "5/6" },
  { value: 6, fraction: "全幅" },
];
const SAFE_KEY = /^[A-Za-z0-9_-]+$/;

const legend = "text-xs font-medium text-zinc-500 dark:text-zinc-400";
const button =
  "rounded-full border border-zinc-300 bg-white px-4 py-1.5 text-sm text-zinc-700 shadow-sm transition hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500";
const code =
  "rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200";

/**
 * クリップボードへ入れる。
 * navigator.clipboard は権限が無いと失敗するので、その場合は選択してコピーする古い方法に落とす。
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 続けて代替手段を試す
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.readOnly = true;
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** YAML に出せない文字が入っていたら引用符で囲む */
function yamlValue(key: string): string {
  return SAFE_KEY.test(key) ? key : JSON.stringify(key);
}

/** 選んだとおりに書き出す。省略の規則を持ち込むと、選んだ値と中身が食い違って見えるため */
function buildFile(view: ViewType, width: Width, show: string[], hidden: boolean): string {
  const lines = [`view: ${view}`, `width: ${width}`];
  if (show.length > 0) {
    lines.push("show:");
    for (const key of show) lines.push(`  - ${yamlValue(key)}`);
  }
  if (hidden) lines.push("hidden: true");
  return `---\n${lines.join("\n")}\n---\n`;
}

export default function ViewSettingsBuilder({
  views,
  pickNote,
}: {
  views: ViewOption[];
  pickNote: string;
}) {
  const [view, setView] = useState<ViewType>("note");
  const [width, setWidth] = useState<Width>(2);
  const [showInput, setShowInput] = useState("");
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  const show = showInput
    .split(/[,、\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const text = buildFile(view, width, show, hidden);

  async function copy() {
    const ok = await copyText(text);
    setCopyFailed(!ok);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "_view.md";
    a.click();
    // すぐ revoke するとダウンロードが中断されることがある
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className={legend}>ビューの種類</legend>
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-[2.5rem_9rem_1fr_1fr] bg-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800/60">
            <span />
            <span>view</span>
            <span>出すノート</span>
            <span>本文の扱い</span>
          </div>
          {views.map((v) => (
            <label
              key={v.type}
              className={`grid cursor-pointer grid-cols-[2.5rem_9rem_1fr_1fr] items-start border-t border-zinc-100 px-3 py-2.5 text-sm transition dark:border-zinc-800 ${
                view === v.type
                  ? "bg-zinc-100 dark:bg-zinc-800"
                  : "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
              }`}
            >
              <input
                type="radio"
                name="view"
                value={v.type}
                checked={view === v.type}
                onChange={() => setView(v.type)}
                className="mt-0.5"
              />
              <span className="text-zinc-800 dark:text-zinc-200">
                <span className={code}>{v.type}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">{v.name}</span>
              </span>
              <span className="text-zinc-700 dark:text-zinc-300">{v.items}</span>
              <span className="text-zinc-700 dark:text-zinc-300">{v.body}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{pickNote}</p>
      </fieldset>

      <fieldset>
        <legend className={legend}>カードの幅</legend>
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
          {WIDTHS.map(({ value, fraction }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-1.5 text-sm text-zinc-800 dark:text-zinc-200"
            >
              <input
                type="radio"
                name="width"
                value={value}
                checked={width === value}
                onChange={() => setWidth(value)}
              />
              {value}
              <span className="text-xs text-zinc-500">{fraction}</span>
            </label>
          ))}
          <span className="text-xs text-zinc-500">横は6列ぶん。6で横いっぱい</span>
        </div>
      </fieldset>

      <div>
        <label className={legend} htmlFor="show">
          カードに出すプロパティ
        </label>
        <input
          id="show"
          type="text"
          value={showInput}
          onChange={(e) => setShowInput(e.target.value)}
          placeholder="price, renewal"
          className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
        このカードを出さない
      </label>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <button type="button" onClick={copy} className={button}>
            コピー
          </button>
          <button type="button" onClick={download} className={button}>
            ダウンロード
          </button>
          {copied && <span className="text-xs text-zinc-500">コピーしました</span>}
        </div>
        {copyFailed && (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            コピーできませんでした。下のテキストを選択してコピーしてください。
          </p>
        )}
        <pre className="mt-3 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          <code>{text}</code>
        </pre>
      </div>
    </div>
  );
}
