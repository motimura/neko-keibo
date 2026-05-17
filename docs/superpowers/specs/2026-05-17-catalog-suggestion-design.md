# 商品サジェスト機能 設計書

- 作成日: 2026-05-17
- 対象: 猫計簿 (neko-keibo)
- フェーズ: Phase 5（ストア公開）と並行する追加機能
- ステータス: 設計承認待ち

---

## 1. 目的と背景

支出登録時に「品名」を毎回手入力するのは負担が大きい。特にフード・消耗品は同じ商品をリピート購入することが多く、品名や金額を覚えていないと入力に時間がかかる。

事前に主要メーカーの商品カタログを内蔵し、入力中の文字列に対して「品名 + 目安金額」をサジェストすることで、**初回入力でもタップ一発で品名・金額を確定できる**ようにする。

過去の購入履歴を見るのではなく、**アプリ内蔵のカタログ**を使うことで、初回利用や新商品購入時にも候補が出る点が特徴。

## 2. スコープ

### 対象
- 支出登録画面（`app/add.tsx` 経由の `components/ExpenseForm.tsx`）
- カテゴリが `food` または `litter` のときのみサジェストUI を表示
- 静的カタログ（in-memory TypeScript 配列）から候補を取得

### 非スコープ（YAGNI）
- 過去の購入履歴とのマージ（将来拡張余地として API は妨げないが、初版では実装しない）
- カタログのリモート更新
- 商品画像表示
- バーコードスキャン
- カテゴリ自動推定
- サジェスト精度向上のためのファジー検索（typo許容など）
- ユーザーによるカタログ追加機能

## 3. アーキテクチャ概要

```
[ExpenseForm (品名 TextInput)]
        │ onChangeText
        ▼
[内部 state: itemName]
        │
        ▼
[ProductSuggestions コンポーネント]
        │ category + query
        ▼
[utils/catalogSearch.ts: searchCatalog()]
        │ filter + sort
        ▼
[utils/productCatalog.ts: CATALOG (静的配列)]
        │
        ▼ 上位N件
[サジェストリスト表示]
        │ onSelect
        ▼
[ExpenseForm: itemName と amount を更新]
```

- データの流れは一方向。サジェストは純粋関数で計算
- SQLite は使わない（カタログは in-memory）
- 既存の Zustand ストアには手を入れない

## 4. データ構造

### `types/catalog.ts`（新規）

```ts
export type CatalogCategory = 'food' | 'litter';

export type CatalogItem = {
  id: string;             // 'royalcanin-mansuporto-2kg' (slug)
  category: CatalogCategory;
  brand: string;          // 'ロイヤルカナン'
  productName: string;    // '満腹感サポート'
  size: string;           // '2kg'
  amount: number;         // 3500（目安価格、円、整数）
  displayName: string;    // 'ロイヤルカナン 満腹感サポート 2kg'
  searchKey: string;      // 正規化済み検索文字列（NFKC + 小文字 + スペース除去）
};
```

- `id` は重複禁止（テストで担保）
- `displayName` はUI表示用、`searchKey` は検索用
- `amount` は円単位整数（円未満切り捨て）

## 5. カタログデータ

### 5.1 フード（プレミアム26ブランド + メインストリーム5ブランド）

プレミアム（[出典](https://www.min-petkenko.com/premiumFood.php?mode=cat)）:
ロイヤルカナン / アーテミス / ブリスミックス / ジウィ / キアオラ /
ニュートロ シュプレモ / ニュートロ ナチュラルチョイス / ニュートロ ワイルドレシピ /
クプレラ / フォルツァ10 / ソリッドゴールド / アニモンダ /
セレクトバランス / アボダーム / ホリスティック・レセピー /
iti / シシア / ナウフレッシュ / ファーストメイト /
アカナ / オリジン / ハッピードッグ / ハッピーキャット /
ベッツソリューション / ビオリオーブ / プロフェッショナル・バランス

メインストリーム:
シーバ / モンプチ / カルカン / ピュリナワン / アイムス

各ブランド × 代表3〜5商品 × 主要2〜3サイズ → **約400件**

### 5.2 消耗品（猫用品メーカー上位20社）

```
ユニ・チャーム / 花王 / アイリスオーヤマ / ライオン商事 /
ペティオ / マルカン / ドギーマン / 猫壱 /
リッチェル / ジェックス / ボンビアルコン / スドー /
アドメイト / ペッツルート / ヒノキア / コーチョー /
大王製紙 / 王子ネピア / ニチドウ / シーズイシハラ
```

リピート購入されやすい品目に限定（食器・キャリーなどリピート性の低いものは含めない）:
- 猫砂（鉱物・木質・紙・おから・シリカ）
- ペットシーツ
- お手入れシート（耳・口・目）
- 爪とぎ消耗品

各ブランド × 代表2〜4商品 × 1〜2サイズ → **約100件**

### 5.3 合計

初版: **約500件**

### 5.4 価格の扱い（重要）

- 価格は **市場相場ベースの目安値**
- 店舗・セール・定期便割引で実値とずれる
- タップ後、金額欄で編集可能。ズレた場合はユーザーが書き換える
- 仕様としてズレを許容する（家計簿アプリの目的は「入力の高速化」であり、価格DBではない）

### 5.5 カタログ更新

- アプリのバージョンアップで `utils/productCatalog.ts` を編集して追加
- リモート更新の仕組みは持たない

## 6. 検索ロジック

### `utils/catalogSearch.ts`（新規）

```ts
export function normalizeQuery(input: string): string {
  return input.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

export function searchCatalog(
  query: string,
  category: CatalogCategory,
  catalog: CatalogItem[] = CATALOG,
  limit = 8
): CatalogItem[]
```

#### 仕様
1. `query` を `normalizeQuery` で正規化（NFKC + lowercase + 空白除去）
2. 空文字（1文字未満）なら空配列を返す
3. `category` 一致 ＋ `searchKey.includes(normalizedQuery)` でフィルタ
4. ソート優先順:
   - ① `searchKey.startsWith(normalizedQuery)` を上に（前方一致優先）
   - ② `brand` の正規化がクエリで始まるものを次に
   - ③ `displayName` の短い順
5. 上位 `limit` 件（既定 8）を返す

#### 正規化のテストケース
- 「ロイカナ」→ ヒットしない（カタログには「ロイヤルカナン」しかない、初版では typo・略称対応しない）
- 「ROYAL」→ カタログに英字表記があればヒット（基本はカナで登録するため初版ではヒットしない可能性が高い）
- 「ろいやるかなん」（ひらがな）→ ヒットしない（カタカナ正規化はしない）
- 「ロイヤルカナン」「ろ」「ロイ」→ それぞれ前方一致

将来拡張余地としてカタカナ⇄ひらがな変換、英⇄カナ変換を追加可能だが初版では入れない。

## 7. UI 設計

### `components/ProductSuggestions.tsx`（新規）

```tsx
type Props = {
  query: string;
  category: CatalogCategory | null; // food/litter 以外は null → 非表示
  onSelect: (item: CatalogItem) => void;
};
```

#### レンダリング仕様
- `category` が `food` `litter` 以外なら何もレンダリングしない
- `query` が空なら何もレンダリングしない
- 検索結果が0件なら「該当する商品が見つかりません」を1行表示（タップ不可）
- 結果あり: カード状リストで最大8件

#### 各行のレイアウト
- 左: `displayName`（1行、長すぎる場合は省略）
- 右: `¥{amount.toLocaleString('ja-JP')}`
- タップで `onSelect(item)` を発火

#### キーボード挙動
- `keyboardShouldPersistTaps="handled"` を ScrollView 側で既に設定済み
- サジェストは ScrollView 内の通常View として配置（独立スクロールは持たない、最大8件なので画面に収まる）

#### スタイル
- 既存のフォームスタイル（rounded-lg、border-gray-200）に合わせる
- 各行: 背景白、タップ時のpressed状態は薄いグレー
- リストは最大400px相当（5〜8件）。長い場合はScrollViewが既に親側で動作するためスクロール可能

### スクリーン上の配置

`ExpenseForm.tsx` 内の品名 TextInput 直下に `ProductSuggestions` を挿入:

```
[品名入力欄]
[ProductSuggestions]  ← ここに追加
[金額入力欄]
...
```

## 8. ExpenseForm への統合

### 変更点（`components/ExpenseForm.tsx`）

1. `import { ProductSuggestions } from './ProductSuggestions'`
2. 品名 TextInput の下に `<ProductSuggestions>` を配置
3. `onSelect` ハンドラで以下を実行:
   - `setItemName(item.displayName)`
   - `setAmount(String(item.amount))`
4. `category` が `food`/`litter` 以外、または編集モード（`editTarget` がある）の場合はサジェストを非表示
5. `props` の追加は不要（カテゴリは既に内部 state にある）

### 編集モードでサジェスト非表示にする理由

編集中に誤ってサジェストをタップすると、既存の品名・金額が上書きされてユーザーが混乱する可能性がある。新規登録時のみに限定する。

## 9. テスト

### `__tests__/catalogSearch.test.ts`
- 正規化: 全角→半角、大文字→小文字、空白除去
- 空文字 → 空配列
- 部分一致でヒット
- 前方一致が部分一致より上位
- ブランド一致が次点
- displayName が短い順
- カテゴリフィルタが効く（food のクエリで litter が混ざらない）
- limit 引数で結果件数が制限される
- 0件ヒット時は空配列

### `__tests__/productCatalog.test.ts`
- `id` が全件ユニーク
- 全件で必須フィールド（id, category, brand, productName, size, amount, displayName, searchKey）が定義されている
- `amount` が正の整数
- `searchKey` が `normalizeQuery(displayName)` と一致
- `category` が `food` または `litter` のみ
- 各ブランドが少なくとも1件以上含まれる（リスト全カバーを保証）

### `__tests__/ProductSuggestions.test.tsx`
- category=null で何もレンダリングされない
- category=food, query="" で何もレンダリングされない
- category=food, query="ロイ" でリストがレンダリングされる
- アイテムをタップすると `onSelect` が正しい引数で呼ばれる
- 0件ヒット時「該当する商品が見つかりません」が表示される

### 既存テストへの影響
- `ExpenseForm` のレンダリングテストにサジェストの存在チェックを追加
- 編集モードでサジェストが出ないことを確認するテストを追加

## 10. 影響範囲

| ファイル | 変更内容 |
|---|---|
| `types/catalog.ts` | 新規 |
| `utils/productCatalog.ts` | 新規（約500件のカタログ） |
| `utils/catalogSearch.ts` | 新規 |
| `components/ProductSuggestions.tsx` | 新規 |
| `components/ExpenseForm.tsx` | 品名入力欄の下にサジェスト追加 |
| `__tests__/catalogSearch.test.ts` | 新規 |
| `__tests__/productCatalog.test.ts` | 新規 |
| `__tests__/ProductSuggestions.test.tsx` | 新規 |
| `CLAUDE.md` | ディレクトリ構成・カタログ仕様の追記 |
| `README.md` | 機能説明の追記 |

DB スキーマ変更なし、マイグレーション不要。

## 11. パフォーマンス見積もり

- カタログ500件 × 1件あたり約200B → JS バンドル増 約100KB
- 検索（filter + sort）500件で **1ms未満**（実測前見積もり）
- 入力1文字ごとに再計算しても体感ゼロ。デバウンスは不要

10,000件規模になったら SQLite + FTS5 への移行を検討する分岐点とする。

## 12. リスクと既知の制約

| リスク | 対応 |
|---|---|
| カタログの価格と実値がずれる | 「目安価格」と明示。タップ後ユーザー編集可。UIで「目安」表記を入れる（軽い注意書き） |
| カタログにない商品 | 通常通り手入力。サジェストはオプショナル |
| ブランド名のゆらぎ（カナ／英／略称） | 初版は正式名カナのみ。タイポ・略称は将来拡張 |
| カタログ追加・修正がアプリ更新でしか反映されない | リモート更新は非スコープ。Phase 6以降で検討余地 |
| 編集モード中の誤タップで上書き | 編集モードでは非表示にして回避 |
| 商標・ブランド名の表記権 | 一般的な商品名表記の範囲内で記載。問題が発生した場合は該当ブランドを削除 |

## 13. リリース戦略

- 設計承認 → 実装計画作成（writing-plans）
- 実装はTDD（テスト先行）で進める
- カタログデータは段階的拡充: 初版はプレミアム26ブランド + 消耗品上位10社で MVP リリース、その後追加コミットで残りのブランドを足す
- 既存機能への影響がないことを E2E でも確認

## 14. 将来拡張余地

- 過去の購入履歴と静的カタログのマージ（履歴側を上位に）
- ユーザーがカタログにない商品を「お気に入り」として保存
- カタログの差分リモート更新（バージョン管理 + JSON 配信）
- カタカナ⇄ひらがな⇄ローマ字の相互検索
- バーコードスキャンによる商品特定
