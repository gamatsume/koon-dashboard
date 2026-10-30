"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * カードをドラッグ（または矢印キー）で並び替えるグリッド。
 *
 * 並び順はこのブラウザの localStorage にだけ保存する。アプリは DB に書き込まない方針なので、
 * 他の端末・ブラウザには反映されない。保存が無いときはサーバーから渡された順に並べる。
 *
 * 高さは Pinterest のように詰める。CSS グリッドは行の高さが揃ってしまうので、
 * 行を 1px にしてカードの実測した高さぶんだけ行をまたがせる。
 * 測る前（サーバー描画時やハイドレーション前）は、ふつうのグリッドとして出す。
 */

export type GridItem = {
  id: string;
  label: string;
  width: 1 | 2 | 3 | 4 | 5 | 6;
  node: ReactNode;
};

const STORAGE_KEY = "koon-dashboard:card-order";

/** カード同士の間隔(px)。行をまたぐ数の計算に使うので、クラスではなく数値で持つ */
const GAP = 16;

/**
 * 幅は6列ぶんで指定する。画面が狭いときは3列に畳み、その中での占有数に読み替える。
 * Tailwind はクラス名を静的に拾うので、組み立てずに全部書いておく。
 */
const SPAN = {
  1: "lg:col-span-1 xl:col-span-1",
  2: "lg:col-span-1 xl:col-span-2",
  3: "lg:col-span-2 xl:col-span-3",
  4: "lg:col-span-2 xl:col-span-4",
  5: "lg:col-span-3 xl:col-span-5",
  6: "lg:col-span-3 xl:col-span-6",
} as const;

/* ---- localStorage を外部ストアとして扱う（SSR 中は「保存なし」として描画する） ---- */

const listeners = new Set<() => void>();
let memoryFallback: string | null = null; // localStorage が使えない環境用

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryFallback;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

function writeOrder(value: string | null) {
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    memoryFallback = value; // 保存できなくても、この画面の中では並び替えを効かせる
  }
  listeners.forEach((l) => l());
}

function parseSaved(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return [...new Set(value.filter((v): v is string => typeof v === "string"))];
  } catch {
    return null;
  }
}

/** 保存された順を優先し、保存に無い（新しく増えた）カードは後ろに元の順で足す */
function applyOrder(items: GridItem[], saved: string[] | null): GridItem[] {
  if (!saved) return items;
  const byId = new Map(items.map((item) => [item.id, item]));
  const head = saved.map((id) => byId.get(id)).filter((item): item is GridItem => !!item);
  const rest = items.filter((item) => !saved.includes(item.id));
  return [...head, ...rest];
}

export default function SortableGrid({ items }: { items: GridItem[] }) {
  const savedRaw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ordered = useMemo(() => applyOrder(items, parseSaved(savedRaw)), [items, savedRaw]);
  const ids = ordered.map((item) => item.id);

  // 取っ手を押している間だけカードを draggable にする（リンクや文字選択を邪魔しないため）
  const [armed, setArmed] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  // 高さを詰めるための実測。id ごとに「またぐ行数(px)」を持つ
  const [spans, setSpans] = useState<Record<string, number>>({});
  const nodes = useRef(new Map<string, HTMLElement>());
  const packed = ids.length > 0 && ids.every((id) => spans[id] !== undefined);

  const register = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) nodes.current.set(id, el);
      else nodes.current.delete(id);
    };
  }, []);

  useEffect(() => {
    function measure() {
      setSpans((prev) => {
        const next: Record<string, number> = {};
        for (const [id, el] of nodes.current) {
          next[id] = Math.ceil(el.getBoundingClientRect().height) + GAP;
        }
        const keys = Object.keys(next);
        const same =
          keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k]);
        return same ? prev : next;
      });
    }

    measure();
    // 中身の変化（画像の読み込み、折り返し）と画面幅の変化の両方で測り直す
    const observer = new ResizeObserver(measure);
    for (const el of nodes.current.values()) observer.observe(el);
    return () => observer.disconnect();
  }, [ordered]);

  function move(from: number, to: number) {
    if (from < 0 || to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    writeOrder(JSON.stringify(next));
  }

  function endDrag() {
    setArmed(null);
    setDragging(null);
    setOver(null);
  }

  return (
    <div>
      <div className="mb-2 flex h-5 items-center justify-end">
        {savedRaw !== null && (
          <button
            type="button"
            onClick={() => writeOrder(null)}
            className="text-xs text-zinc-500 hover:text-zinc-800 hover:underline dark:hover:text-zinc-200"
          >
            並び順を元に戻す
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6"
        style={{
          columnGap: GAP,
          // 測れていれば 1px の行を高さぶんまたがせて詰める。測る前はふつうのグリッド
          rowGap: packed ? 0 : GAP,
          gridAutoRows: packed ? "1px" : "auto",
          // 幅の広いカードが入りきらず空いた列に、後ろの小さいカードを回り込ませる。
          // そのぶん小さいカードが前に出るので、見た目の並びは指定した順と前後することがある
          gridAutoFlow: "row dense",
        }}
      >
        {ordered.map((item, index) => (
          <div
            key={item.id}
            data-card-id={item.id}
            style={{
              alignSelf: "start", // 行いっぱいに引き伸ばさない
              gridRowEnd: packed ? `span ${spans[item.id]}` : undefined,
            }}
            draggable={armed === item.id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", item.id);
              setDragging(item.id);
            }}
            onDragOver={(e) => {
              if (!dragging || dragging === item.id) return;
              e.preventDefault(); // これが無いと drop できない
              e.dataTransfer.dropEffect = "move";
              if (over !== item.id) setOver(item.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) move(ids.indexOf(dragging), index);
              endDrag();
            }}
            onDragEnd={endDrag}
            className={[
              // transition だと color も対象になり、テーマ切り替え時にカード内の文字色まで遅れて変わる。
              // ドラッグ中に薄くする不透明度だけに絞る
              "group relative rounded-xl transition-opacity",
              SPAN[item.width],
              dragging === item.id ? "opacity-40" : "",
              over === item.id ? "ring-2 ring-zinc-400 dark:ring-zinc-500" : "",
            ].join(" ")}
          >
            <div
              role="button"
              tabIndex={0}
              aria-label={`「${item.label}」の位置を変える（ドラッグ、または矢印キー）`}
              title="ドラッグして並び替え"
              onPointerDown={() => setArmed(item.id)}
              onPointerUp={() => setArmed(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  move(index, index - 1);
                } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  move(index, index + 1);
                }
              }}
              className="absolute left-1/2 top-1 z-10 -translate-x-1/2 cursor-grab select-none rounded px-2 text-sm leading-none text-zinc-400 opacity-0 transition hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing dark:hover:text-zinc-200"
            >
              ⠿
            </div>
            {/* 実測する対象。カードそのものの高さを測りたいので、間隔は span 側に足す */}
            <div ref={register(item.id)}>{item.node}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
