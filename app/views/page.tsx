import Link from "next/link";
import { ROLE_KEYS, viewOptions } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

/**
 * 表示のしかた。読むためのページで、ここでは何も設定しない。
 * 設定は /settings で行う。
 */

const section =
  "rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const heading = "mb-3 text-base font-semibold text-black dark:text-zinc-50";
const th =
  "border-b border-zinc-200 px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-zinc-500 dark:border-zinc-800";
const td =
  "border-b border-zinc-100 px-3 py-2 align-top text-zinc-700 dark:border-zinc-800 dark:text-zinc-300";

function C({ children }: { children: string }) {
  return (
    <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
      {children}
    </code>
  );
}

export default function ViewsPage() {
  const views = viewOptions();

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 dark:bg-black sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/"
          className="inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← ダッシュボードへ戻る
        </Link>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            表示のしかた
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            ノートがダッシュボードにどう出るかの決まりです。実際に設定するには{" "}
            <Link href="/settings" className="underline">
              設定
            </Link>{" "}
            へ。
          </p>
        </header>

        <section className={section}>
          <h2 className={heading}>1. フォルダ = カード1枚</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              データフォルダ直下のフォルダ1つが、カード1枚になります。
              <strong>フォルダ名がそのままカードの見出し</strong>です。
            </li>
            <li>
              読むのは<strong>フォルダ直下の</strong> <C>.md</C> だけです。サブフォルダは読みません。
            </li>
            <li>
              <C>README.md</C> と <C>_view.md</C> はノートとして扱いません。
            </li>
            <li>
              名前が <C>_</C> <C>.</C> で始まるフォルダと、<C>.md</C>{" "}
              が1つも無いフォルダはカードになりません。
            </li>
          </ul>
        </section>

        <section className={section}>
          <h2 className={heading}>
            2. 表示方法は <C>_view.md</C> で決まる
          </h2>
          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            フォルダに <C>_view.md</C> を置き、プロパティで指定します。
            <strong>無ければ「メモ」</strong>です。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>プロパティ</th>
                  <th className={th}>意味</th>
                  <th className={th}>既定</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={td}>
                    <C>view</C>
                  </td>
                  <td className={td}>ビューの種類（下表）</td>
                  <td className={td}>
                    <C>note</C>（メモ）
                  </td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>width</C>
                  </td>
                  <td className={td}>カードの幅 1〜6（横は6列ぶん。6で横いっぱい）</td>
                  <td className={td}>種類ごと</td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>show</C>
                  </td>
                  <td className={td}>カードに出すプロパティ名</td>
                  <td className={td}>出さない</td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>hidden</C>
                  </td>
                  <td className={td}>
                    <C>true</C> でカードを出さない
                  </td>
                  <td className={td}>出す</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className={section}>
          <h2 className={heading}>3. ビューの種類</h2>
          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            7種類です。<C>view: checklist</C> でも <C>view: チェックリスト</C> でも書けます。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>view</th>
                  <th className={th}>出すノート</th>
                  <th className={th}>本文の扱い</th>
                  <th className={th}>既定の幅</th>
                </tr>
              </thead>
              <tbody>
                {views.map((v) => (
                  <tr key={v.type}>
                    <td className={td}>
                      <C>{v.type}</C>
                      <div className="mt-0.5 text-xs text-zinc-500">{v.name}</div>
                    </td>
                    <td className={td}>{v.items}</td>
                    <td className={td}>{v.body}</td>
                    <td className={td}>{v.defaultWidth}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            <strong>
              本文が全文出るのは <C>document</C> と <C>quote</C> だけ
            </strong>
            です。ここが一番つまずきやすい点です。
          </p>
        </section>

        <section className={section}>
          <h2 className={heading}>4. 役割が決まっているプロパティ</h2>
          <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
            次のプロパティは <C>show</C> に書かなくても表示されます。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>プロパティ</th>
                  <th className={th}>役割</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={td}>
                    <C>title</C> → <C>name</C> → <C>subject</C>
                  </td>
                  <td className={td}>タイトル（左ほど優先。どれも無ければファイル名）</td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>date</C>
                  </td>
                  <td className={td}>
                    日付（無ければファイル名の <C>YYYY-MM-DD</C>）
                  </td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>url</C>
                  </td>
                  <td className={td}>
                    <C>http</C> で始まるとき、タイトルが外部リンクになる
                  </td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>source</C> → <C>from</C>
                  </td>
                  <td className={td}>出どころ（日付の横に出る）</td>
                </tr>
                <tr>
                  <td className={td}>
                    <C>author</C>
                  </td>
                  <td className={td}>格言の署名</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            これ以外のプロパティは <C>show</C> に書いたときだけ出ます（<C>table</C> は{" "}
            <C>show</C> が無ければ全部が列になります）。ノートを開けば、すべてのプロパティが見られます。
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            役割つきのプロパティ：
            {ROLE_KEYS.map((k) => (
              <span key={k} className="ml-1">
                <C>{k}</C>
              </span>
            ))}
          </p>
        </section>

        <section className={section}>
          <h2 className={heading}>5. 並び順</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              ノートは<strong>新しい順</strong>です。日付の降順 → 日付が無ければファイル名の降順。
            </li>
            <li>
              ファイル名から日付として拾えるのは <C>YYYY-MM-DD</C> の形だけです（
              <C>2026_1019週</C> は拾えません）。
            </li>
            <li>
              <C>schedule</C> だけは、次に来る予定を上にするため<strong>日付の昇順</strong>です。
            </li>
            <li>
              カードの初期の並びは、上の表のビューの種類順 → フォルダ名順です。
              カード上部の ⠿ をドラッグすると変えられます（並び順はこのブラウザにだけ保存されます）。
            </li>
          </ul>
        </section>

        <section className={section}>
          <h2 className={heading}>6. 置き方と反映</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link href="/settings" className="underline">
                _view.md を作る
              </Link>{" "}
              で中身を作り、コピーかダウンロードで受け取ります。
            </li>
            <li>
              適用したいフォルダの<strong>直下</strong>に、<C>_view.md</C>{" "}
              という名前で置きます（サブフォルダに置いても効きません）。
            </li>
            <li>ダッシュボードの「↻ 更新」を押すと反映されます。</li>
          </ol>
          <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
            アプリはデータフォルダに<strong>書き込みません</strong>。ファイルを置くのは手作業です。
          </p>
        </section>
      </div>
    </div>
  );
}
