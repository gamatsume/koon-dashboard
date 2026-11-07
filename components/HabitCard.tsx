"use client";

import { useState } from "react";
import { PagerBar } from "@/components/CardPager";
// lib/dashboard.ts は fs を使うため、ここから値を import してはいけない（型だけ）
import type { HabitCell, HabitDay, HabitStats, HabitTask } from "@/lib/dashboard";

/** 習慣カードの中身。タブで「今日 / 推移 / タスク別」を切り替える */

type Tab = "today" | "trend" | "tasks";

const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "今日" },
  { id: "trend", label: "推移" },
  { id: "tasks", label: "タスク別" },
];

const emptyText = "text-sm text-zinc-400";

/** 達成率に応じた濃さ。地色との差が大きいほど達成している */
function fillClass(ratio: number): string {
  if (ratio >= 1) return "bg-zinc-800 dark:bg-zinc-100";
  if (ratio >= 2 / 3) return "bg-zinc-600 dark:bg-zinc-300";
  if (ratio >= 1 / 3) return "bg-zinc-400 dark:bg-zinc-500";
  if (ratio > 0) return "bg-zinc-300 dark:bg-zinc-600";
  return "bg-zinc-200 dark:bg-zinc-700";
}

function cellClass(cell: HabitCell): string {
  if (cell.future) return "bg-transparent";
  // 記録の無い日も薄く塗る。塗らないと歯抜けに見えて暦として読めなくなる
  if (!cell.day) return "bg-zinc-100 dark:bg-zinc-800/70";
  return fillClass(cell.day.total > 0 ? cell.day.done / cell.day.total : 0);
}

function Summary({ stats }: { stats: HabitStats }) {
  const entries: [string, string][] = [
    ["連続", `${stats.streak}日`],
    ["全部できた日", `${stats.completedDays}日`],
    ["記録", `${stats.recordedDays}日`],
  ];
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="text-xs text-zinc-500">{label}</dt>
          <dd className="font-medium text-zinc-800 dark:text-zinc-200">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** マス目の暦。記録のある日は押すとその日の記録へ飛ぶ */
function Grid({ cells, onPick }: { cells: HabitCell[][]; onPick: (date: string) => void }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex gap-[3px]">
        {cells.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {week.map((cell) => {
              const title = cell.day
                ? `${cell.date} ${cell.day.done}/${cell.day.total}`
                : `${cell.date} 記録なし`;
              const box = `h-3 w-3 rounded-[2px] ${cellClass(cell)}`;
              return cell.day ? (
                <button
                  key={cell.date}
                  type="button"
                  title={title}
                  aria-label={title}
                  onClick={() => onPick(cell.date)}
                  className={`${box} transition hover:ring-2 hover:ring-zinc-400`}
                />
              ) : (
                <div key={cell.date} title={title} className={box} />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 日ごとの積み上げ棒。1マス＝タスク1つで、できたぶんだけ下から埋まる。
 * 高さを揃えるため、どの日もその日の総数ではなく全体の最大に合わせて並べる。
 */
function Bars({ bars }: { bars: HabitDay[] }) {
  if (bars.length === 0) return <p className={emptyText}>記録がありません</p>;
  const max = Math.max(...bars.map((b) => b.total));

  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <div className="flex items-end gap-[3px]">
        {bars.map((bar) => (
          <div
            key={bar.date}
            title={`${bar.date} ${bar.done}/${bar.total}`}
            className="flex flex-col-reverse gap-[2px]"
          >
            {Array.from({ length: max }, (_, i) => {
              const within = i < bar.total;
              const done = i < bar.done;
              return (
                <div
                  key={i}
                  className={`h-2.5 w-3 rounded-[2px] ${
                    !within
                      ? "bg-transparent"
                      : done
                        ? "bg-zinc-800 dark:bg-zinc-100"
                        : "bg-zinc-200 dark:bg-zinc-700"
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tasks({ tasks }: { tasks: HabitTask[] }) {
  if (tasks.length === 0) return <p className={emptyText}>記録がありません</p>;
  return (
    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {tasks.map((task) => {
        const ratio = task.appeared > 0 ? task.done / task.appeared : 0;
        return (
          <li key={task.text} className="flex items-center gap-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">
              {task.text}
            </span>
            <span
              title="直近の出番から続けてできている回数"
              className="shrink-0 text-xs text-zinc-500"
            >
              連続 <span className="font-medium text-zinc-800 dark:text-zinc-200">{task.streak}</span>
            </span>
            <span className="shrink-0 text-xs text-zinc-500">
              {task.done}/{task.appeared}
            </span>
            <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <span
                className={`block h-full ${fillClass(ratio)}`}
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function HabitCard({ stats }: { stats: HabitStats }) {
  const { days, todayDate } = stats;
  // 記録のある日の中での今日の位置。今日のノートがまだ無ければ -1
  const todayIndex = days.findIndex((d) => d.date === todayDate);
  // 今日が無いときは一番新しい記録を開く。カードが空のままになるのを避けるため
  const home = todayIndex < 0 ? 0 : todayIndex;

  const [tab, setTab] = useState<Tab>("today");
  const [at, setAt] = useState(home);

  const entry = days[Math.min(at, days.length - 1)] ?? null;

  /** マス目から日付を選ぶ。記録のある日しか押せない */
  function pick(date: string) {
    const i = days.findIndex((d) => d.date === date);
    if (i < 0) return;
    setAt(i);
    setTab("today");
  }

  return (
    <>
      <div className="mb-3 flex gap-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`rounded-full px-2.5 py-0.5 text-xs transition ${
              tab === id
                ? "bg-zinc-200 font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <>
          {entry ? (
            <>
              <PagerBar
                labels={days.map((d) => d.label)}
                index={Math.min(at, days.length - 1)}
                onIndex={setAt}
                resetTo={home}
                resetLabel={todayIndex < 0 ? "最新" : "今日"}
              >
                <span className="text-zinc-500">
                  {entry.done}/{entry.total} 完了
                </span>
              </PagerBar>
              {todayIndex < 0 && (
                <p className="mb-2 text-xs text-zinc-400">今日のノートはまだありません</p>
              )}
              <ul className="space-y-1.5">
                {entry.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span aria-hidden className="mt-0.5">
                      {item.done ? "☑" : "☐"}
                    </span>
                    <span
                      className={
                        item.done
                          ? "text-zinc-400 line-through dark:text-zinc-600"
                          : "text-zinc-800 dark:text-zinc-200"
                      }
                    >
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={emptyText}>記録がありません</p>
          )}
          <div className="mt-4">
            <Summary stats={stats} />
          </div>
        </>
      )}

      {tab === "trend" && (
        <>
          <Summary stats={stats} />
          <p className="mt-4 mb-1 text-xs text-zinc-500">日ごとの達成（直近{stats.bars.length}日）</p>
          <Bars bars={stats.bars} />
          <p className="mt-4 mb-1 text-xs text-zinc-500">カレンダー（押すとその日の記録へ）</p>
          <Grid cells={stats.cells} onPick={pick} />
        </>
      )}

      {tab === "tasks" && <Tasks tasks={stats.tasks} />}
    </>
  );
}
