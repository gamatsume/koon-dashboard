# koon-dashboard

Markdown ファイル群をデータソースとして読み込み、Next.js 製のダッシュボードで
一覧・閲覧するアプリです。データベースは持ちません。**フォルダと `.md` ファイルがそのままデータです。**

- **読むだけ**: アプリはファイルを読むだけで、書き込みは一切行いません。編集は普段お使いのエディタや Obsidian で行います。
- **2つのデータソース**: ダッシュボード用の「DB」と、Obsidian vault の閲覧。どちらも Markdown フォルダです。
- **フレームワーク**: Next.js (App Router, TypeScript, Tailwind CSS v4)
- **Markdown 解析**: `gray-matter`（frontmatter）+ `react-markdown` / `remark-gfm`（表・チェックリスト）

---

## すぐ試す

```bash
npm install
npm run dev
```

`http://localhost:3000` を開くとダッシュボードが表示されます。
初期状態では `sample-db/` のサンプルデータが読み込まれるので、**そのまま動きます。**

| ページ | 内容 |
|---|---|
| `/` | ダッシュボード本体 |
| `/subs` | 表形式のビュー（サブスク一覧など） |
| `/vault` | Obsidian vault のノート一覧 |

---

## 自分のデータに差し替える

`.env.local` を作り、データフォルダの場所を指定します。

```bash
cat > .env.local <<'EOF'
DASHBOARD_DB_PATH=/Users/yourname/Documents/MyDashboardData
VAULT_PATH=/Users/yourname/Documents/MyVault
EOF
```

| 環境変数 | 対象 | 未設定時 |
|---|---|---|
| `DASHBOARD_DB_PATH` | ダッシュボードのデータ | `dashboard.config.json` の `dbPath`（既定は `sample-db`） |
| `VAULT_PATH` | Obsidian vault | プロジェクト内の `vault/` |

相対パスも使えます（プロジェクトルート起点）。`~` から始まるパスも展開されます。

---

## ダッシュボードの仕組み

### フォルダ = ビュー

`dashboard.config.json` の `views` に書いたキーが、そのままデータフォルダの名前になります。

```
DASHBOARD_DB_PATH/
├── today/       ← views.today
│   ├── 2026-08-15.md
│   └── routine.md
├── weekly/      ← views.weekly
├── schedule/
├── quotes/
├── memo/
├── sns/
├── news/
├── mail/
└── subs/
```

各フォルダ直下の `.md` を読み込みます。`README.md` だけは除外されるので、
フォルダの説明を置いておけます。サブフォルダは読みません。

### ビューの種類

`views.<キー>.type` で表示のされ方が決まります。

| type | 動作 | 使いどころ |
|---|---|---|
| `checklist` | フォルダ内**全ファイル**の `- [ ]` / `- [x]` を集計し、達成数を表示 | 今日のタスク |
| `document` | ファイル名の降順で**最新1件**を全文表示 | 週次の目標 |
| `schedule` | 日付の昇順に並べ、**残り日数**を表示 | 予定 |
| `quote` | **日替わり**で1件を表示 | 格言・リマインダ |
| `feed` | 日付の降順に一覧 | ニュース、メール、SNS |
| `table` | frontmatter のキーを**列**にした表 | サブスク管理、蔵書 |
| `note` | 一覧＋抜粋 | メモ |

### ファイルの書き方

frontmatter は任意です。無くても動きます。

```markdown
---
title: 歯科検診
date: 2026-08-20
---

14:00 から。保険証を忘れずに。
```

| 項目 | 決まり方 |
|---|---|
| タイトル | `title` → `subject` → ファイル名 の順に採用 |
| 日付 | `date` → ファイル名中の `YYYY-MM-DD` の順に採用 |
| 抜粋 | 本文の最初の空でない行（見出しは除く） |

**frontmatter が壊れていてもクラッシュしません。** 生の本文として表示されます。

`table` 型では、`title` 以外の frontmatter のキーがすべて列になります。

```markdown
---
title: クラウドストレージ
plan: 200GB
price: 380円/月
renewal: "2026-09-15"
---
```

→ `plan` / `price` / `renewal` の3列を持つ表になります。

> **日付は引用符で囲ってください。** YAML は引用符なしの `2026-09-15` を日付型として
> 解釈するため、表の中で `Tue Sep 15 2026 09:00:00 GMT+0900 ...` のように展開されます。
> `date` 項目（日付として扱ってほしいもの）は引用符なしのままで構いません。

### レイアウト

`layout` で、どのビューをどの段に置くかを決めます。

```json
"layout": {
  "top":    ["today", "weekly", "quotes"],
  "middle": ["schedule"],
  "bottom": ["sns", "news", "mail"]
}
```

`views` に定義していても `layout` に書かなければダッシュボードには出ません
（`subs` は専用ページ `/subs` に表示されます）。

### ビューを追加する

1. `dashboard.config.json` の `views` にキーを足す
2. `layout` のどこかに置く
3. データフォルダに同名のフォルダを作り、`.md` を置く

コードの変更は不要です。

---

## Obsidian vault の閲覧

`/vault` は、ダッシュボードとは別に Markdown ノートを一覧・閲覧するページです。

- サブフォルダも**再帰的に**読み込みます（`Daily Notes/` など）
- タグ（frontmatter の `tags`）で絞り込めます
- Obsidian の `[[Wikilink]]` 記法はノート間リンクとして解決されます

`VAULT_PATH` を設定しない場合は、同梱の `vault/` にあるサンプルノートが表示されます。

---

## ディレクトリ構成

```
app/
├── page.tsx              ダッシュボード本体
├── subs/                 表ビューのページ
├── db/[...slug]/         DB ノートの詳細
├── vault/                vault のノート一覧
└── notes/[...slug]/      vault ノートの詳細
lib/
├── dashboard.ts          DB の読み込みとビュー型ごとの整形
└── vault.ts              vault の読み込み
components/
└── RefreshButton.tsx     再読み込みボタン
dashboard.config.json     ビュー定義とレイアウト
sample-db/                サンプルデータ（DASHBOARD_DB_PATH 未設定時に使用）
vault/                    サンプルの Obsidian vault
```

---

## 注意

- **サーバーサイドでファイルを読みます。** ローカル、あるいは自分だけがアクセスできる環境での利用を想定しています。データフォルダの内容がそのまま画面に出るため、公開サーバーへそのまま置かないでください。
- ページはリクエストごとにレンダリングされます。ファイルを編集したら「↻ 更新」で反映されます。

## ライセンス

MIT License. 詳細は [LICENSE](./LICENSE) を参照してください。
