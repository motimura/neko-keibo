# 商品サジェスト機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** food/litter カテゴリの支出登録時に、品名入力欄の下に「品名 + 目安金額」のサジェストを最大8件表示し、タップで品名・金額を一括入力できるようにする。

**Architecture:** in-memory TypeScript 配列で約500件規模の静的カタログを持ち、入力文字列の部分一致で候補を絞り込み、サジェストUIコンポーネントを `ExpenseForm` の品名入力直下に統合する。DB変更なし、マイグレーション不要。

**Tech Stack:** TypeScript / React Native (Expo) / NativeWind / Jest + @testing-library/react-native

**Spec:** `docs/superpowers/specs/2026-05-17-catalog-suggestion-design.md`

---

## ファイル構成

### 新規作成
- `types/catalog.ts` — `CatalogCategory`, `CatalogItem` 型
- `utils/catalogSearch.ts` — `normalizeQuery()`, `searchCatalog()`
- `utils/productCatalog.ts` — カタログ配列 `CATALOG` + ファクトリ `item()`
- `components/ProductSuggestions.tsx` — サジェストUI
- `__tests__/catalogSearch.test.ts`
- `__tests__/productCatalog.test.ts`
- `__tests__/ProductSuggestions.test.tsx`

### 変更
- `components/ExpenseForm.tsx` — 品名入力直下にサジェスト挿入
- `__tests__/screens.test.tsx` — 既存テスト互換性確認（必要に応じて追記）
- `CLAUDE.md` — ディレクトリ構成と機能仕様を追記
- `README.md` — 機能説明を追記

---

## Task 1: 型定義（types/catalog.ts）

**Files:**
- Create: `types/catalog.ts`

- [ ] **Step 1: 型定義ファイルを作成**

```ts
// types/catalog.ts
export type CatalogCategory = 'food' | 'litter';

export type CatalogItem = {
  id: string;
  category: CatalogCategory;
  brand: string;
  productName: string;
  size: string;
  amount: number;
  displayName: string;
  searchKey: string;
};
```

- [ ] **Step 2: TypeScript型チェックを実行**

Run: `npx tsc --noEmit`
Expected: PASS（既存コードもエラーなし）

- [ ] **Step 3: Commit**

```bash
git add types/catalog.ts
git commit -m "サジェスト機能: CatalogItem型を追加"
```

---

## Task 2: normalizeQuery 関数（TDD）

**Files:**
- Create: `utils/catalogSearch.ts`
- Create: `__tests__/catalogSearch.test.ts`

- [ ] **Step 1: テストを先に書く**

```ts
// __tests__/catalogSearch.test.ts
import { normalizeQuery } from '../utils/catalogSearch';

describe('normalizeQuery', () => {
  it('全角英数を半角に変換する', () => {
    expect(normalizeQuery('ＡＢＣ１２３')).toBe('abc123');
  });
  it('大文字を小文字に変換する', () => {
    expect(normalizeQuery('ROYAL CANIN')).toBe('royalcanin');
  });
  it('スペース（半角・全角）を除去する', () => {
    expect(normalizeQuery('ロイヤル カナン')).toBe('ロイヤルカナン');
    expect(normalizeQuery('ロイヤル　カナン')).toBe('ロイヤルカナン');
  });
  it('カタカナはそのまま保持する', () => {
    expect(normalizeQuery('ロイヤルカナン')).toBe('ロイヤルカナン');
  });
  it('空文字を渡したら空文字を返す', () => {
    expect(normalizeQuery('')).toBe('');
  });
  it('複合: 全角英数 + 大文字 + スペース', () => {
    expect(normalizeQuery('Royal Ｃａｎｉｎ ２kg')).toBe('royalcanin2kg');
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test -- catalogSearch`
Expected: FAIL（`normalizeQuery` が未定義）

- [ ] **Step 3: 最小実装**

```ts
// utils/catalogSearch.ts
export function normalizeQuery(input: string): string {
  return input.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test -- catalogSearch`
Expected: PASS（全6ケース）

- [ ] **Step 5: Commit**

```bash
git add utils/catalogSearch.ts __tests__/catalogSearch.test.ts
git commit -m "サジェスト機能: normalizeQuery関数を追加"
```

---

## Task 3: searchCatalog 関数（TDD）

**Files:**
- Modify: `utils/catalogSearch.ts`
- Modify: `__tests__/catalogSearch.test.ts`

- [ ] **Step 1: テストを追記**

```ts
// __tests__/catalogSearch.test.ts に追記
import { searchCatalog, normalizeQuery } from '../utils/catalogSearch';
import type { CatalogItem } from '../types/catalog';

const mkItem = (
  id: string,
  category: 'food' | 'litter',
  brand: string,
  productName: string,
  size: string,
  amount: number,
): CatalogItem => {
  const displayName = `${brand} ${productName} ${size}`;
  return {
    id, category, brand, productName, size, amount,
    displayName, searchKey: normalizeQuery(displayName),
  };
};

const FIXTURE: CatalogItem[] = [
  mkItem('a', 'food', 'ロイヤルカナン', 'インドア', '2kg', 3800),
  mkItem('b', 'food', 'ロイヤルカナン', '満腹感サポート', '2kg', 3500),
  mkItem('c', 'food', 'シーバ', 'ドゥマール', '88g', 280),
  mkItem('d', 'litter', 'ユニ・チャーム', 'デオトイレ', '2L', 980),
  mkItem('e', 'food', 'ロイヤルカナン', 'インドア', '4kg', 6500),
];

describe('searchCatalog', () => {
  it('空クエリは空配列を返す', () => {
    expect(searchCatalog('', 'food', FIXTURE)).toEqual([]);
  });

  it('カテゴリで絞り込む（food検索で litter を返さない）', () => {
    const r = searchCatalog('デオ', 'food', FIXTURE);
    expect(r).toEqual([]);
  });

  it('部分一致でヒットする', () => {
    const r = searchCatalog('インドア', 'food', FIXTURE);
    expect(r.map((x) => x.id).sort()).toEqual(['a', 'e']);
  });

  it('前方一致が部分一致より上位にくる', () => {
    const r = searchCatalog('ロイヤルカナン', 'food', FIXTURE);
    // すべてロイヤルカナンなので順序は表示名の長さでソートされる
    expect(r[0].displayName.length).toBeLessThanOrEqual(r[1].displayName.length);
  });

  it('limit で結果件数を制限できる', () => {
    const r = searchCatalog('ロイヤルカナン', 'food', FIXTURE, 1);
    expect(r).toHaveLength(1);
  });

  it('既定の limit は 8 件', () => {
    const many: CatalogItem[] = Array.from({ length: 20 }, (_, i) =>
      mkItem(`x${i}`, 'food', 'ロイヤルカナン', `味${i}`, '2kg', 1000)
    );
    const r = searchCatalog('ロイヤルカナン', 'food', many);
    expect(r).toHaveLength(8);
  });

  it('大文字小文字・全角半角を吸収する', () => {
    const items = [mkItem('z', 'food', 'Royal Canin', 'Indoor', '2kg', 3800)];
    const r = searchCatalog('ＲＯＹＡＬ', 'food', items);
    expect(r).toHaveLength(1);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test -- catalogSearch`
Expected: FAIL（`searchCatalog` が未定義）

- [ ] **Step 3: 実装**

```ts
// utils/catalogSearch.ts に追記
import type { CatalogItem, CatalogCategory } from '../types/catalog';

export function searchCatalog(
  query: string,
  category: CatalogCategory,
  catalog: CatalogItem[],
  limit = 8,
): CatalogItem[] {
  const q = normalizeQuery(query);
  if (q.length === 0) return [];

  const matches = catalog.filter(
    (item) => item.category === category && item.searchKey.includes(q),
  );

  matches.sort((a, b) => {
    const aStarts = a.searchKey.startsWith(q) ? 0 : 1;
    const bStarts = b.searchKey.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;

    const aBrand = normalizeQuery(a.brand).startsWith(q) ? 0 : 1;
    const bBrand = normalizeQuery(b.brand).startsWith(q) ? 0 : 1;
    if (aBrand !== bBrand) return aBrand - bBrand;

    return a.displayName.length - b.displayName.length;
  });

  return matches.slice(0, limit);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test -- catalogSearch`
Expected: PASS（normalizeQuery 6件 + searchCatalog 7件 = 13件）

- [ ] **Step 5: Commit**

```bash
git add utils/catalogSearch.ts __tests__/catalogSearch.test.ts
git commit -m "サジェスト機能: searchCatalog関数を追加"
```

---

## Task 4: カタログファイル雛形 + 構造テスト

**Files:**
- Create: `utils/productCatalog.ts`
- Create: `__tests__/productCatalog.test.ts`

- [ ] **Step 1: カタログ雛形を作成（空配列 + ファクトリ）**

```ts
// utils/productCatalog.ts
import type { CatalogItem, CatalogCategory } from '../types/catalog';
import { normalizeQuery } from './catalogSearch';

export function item(
  category: CatalogCategory,
  brand: string,
  productName: string,
  size: string,
  amount: number,
): CatalogItem {
  const displayName = `${brand} ${productName} ${size}`;
  const id = `${brand}-${productName}-${size}`.replace(/\s+/g, '_');
  return {
    id,
    category,
    brand,
    productName,
    size,
    amount,
    displayName,
    searchKey: normalizeQuery(displayName),
  };
}

export const CATALOG: CatalogItem[] = [];
```

- [ ] **Step 2: 構造整合性テストを追加**

```ts
// __tests__/productCatalog.test.ts
import { CATALOG, item } from '../utils/productCatalog';
import { normalizeQuery } from '../utils/catalogSearch';

describe('CATALOG 構造整合性', () => {
  it('id が全件ユニーク', () => {
    const ids = CATALOG.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('全件で必須フィールドが定義されている', () => {
    CATALOG.forEach((x) => {
      expect(x.id).toBeTruthy();
      expect(['food', 'litter']).toContain(x.category);
      expect(x.brand).toBeTruthy();
      expect(x.productName).toBeTruthy();
      expect(x.size).toBeTruthy();
      expect(x.amount).toBeGreaterThan(0);
      expect(Number.isInteger(x.amount)).toBe(true);
      expect(x.displayName).toBeTruthy();
      expect(x.searchKey).toBeTruthy();
    });
  });

  it('searchKey が displayName の正規化結果と一致する', () => {
    CATALOG.forEach((x) => {
      expect(x.searchKey).toBe(normalizeQuery(x.displayName));
    });
  });

  it('amount は正の整数', () => {
    CATALOG.forEach((x) => {
      expect(x.amount).toBeGreaterThan(0);
      expect(Number.isInteger(x.amount)).toBe(true);
    });
  });
});

describe('item ファクトリ', () => {
  it('displayName は brand + productName + size', () => {
    const i = item('food', 'A', 'B', 'C', 100);
    expect(i.displayName).toBe('A B C');
  });
  it('searchKey は normalizeQuery 結果', () => {
    const i = item('food', 'A', 'B', 'C', 100);
    expect(i.searchKey).toBe(normalizeQuery('A B C'));
  });
});
```

- [ ] **Step 3: テストを実行（空配列のため全テスト通る）**

Run: `npm run test -- productCatalog`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add utils/productCatalog.ts __tests__/productCatalog.test.ts
git commit -m "サジェスト機能: カタログ雛形とファクトリを追加"
```

---

## Task 5: プレミアムフード Group A（9ブランド、約15件）

**Files:**
- Modify: `utils/productCatalog.ts`

- [ ] **Step 1: カタログを追加**

`CATALOG` 配列に以下を追加:

```ts
export const CATALOG: CatalogItem[] = [
  // ロイヤルカナン
  item('food', 'ロイヤルカナン', 'インドア', '2kg', 3800),
  item('food', 'ロイヤルカナン', 'インドア', '4kg', 6500),
  item('food', 'ロイヤルカナン', '満腹感サポート', '2kg', 3500),
  // アーテミス
  item('food', 'アーテミス', 'フレッシュミックス', '2kg', 4200),
  // ブリスミックス
  item('food', 'ブリスミックス', 'キャット チキン', '1kg', 2800),
  // ジウィ
  item('food', 'ジウィ', 'エアドライ キャット ラム', '400g', 4500),
  item('food', 'ジウィ', 'エアドライ キャット マッカロー&ラム', '400g', 4800),
  // キアオラ
  item('food', 'キアオラ', 'キャット カンガルー', '400g', 3800),
  // ニュートロ シュプレモ
  item('food', 'ニュートロ シュプレモ', 'アダルト 成猫用', '2kg', 3200),
  // ニュートロ ナチュラルチョイス
  item('food', 'ニュートロ ナチュラルチョイス', 'アダルト チキン', '2kg', 3000),
  // ニュートロ ワイルドレシピ
  item('food', 'ニュートロ ワイルドレシピ', 'アダルト チキン', '2kg', 3400),
];
```

- [ ] **Step 2: テストを実行**

Run: `npm run test -- productCatalog`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add utils/productCatalog.ts
git commit -m "カタログ: プレミアムフード Group A を追加(11件)"
```

---

## Task 6: プレミアムフード Group B（9ブランド、約15件）

**Files:**
- Modify: `utils/productCatalog.ts`

- [ ] **Step 1: カタログに追記**

```ts
  // クプレラ
  item('food', 'クプレラ', 'ベニソン&スイートポテト キャット', '1kg', 3200),
  // フォルツァ10
  item('food', 'フォルツァ10', 'アクティブライン アダルト', '1.5kg', 3800),
  // ソリッドゴールド
  item('food', 'ソリッドゴールド', 'インディゴムーン', '1.8kg', 4500),
  // アニモンダ
  item('food', 'アニモンダ', 'インテグラ プロテクト 腎臓ケア', '1.2kg', 3500),
  // セレクトバランス
  item('food', 'セレクトバランス', 'アダルト チキン', '2.4kg', 3200),
  // アボダーム
  item('food', 'アボダーム', 'キャット オリジナル', '1.6kg', 2800),
  // ホリスティック・レセピー
  item('food', 'ホリスティック・レセピー', 'インドアキャット', '2kg', 2500),
  // iti
  item('food', 'iti', 'キャット ベニソン ディナー', '200g', 2800),
  // シシア
  item('food', 'シシア', 'ツナ&エビ', '85g', 350),
  item('food', 'シシア', 'ツナ&チキン', '85g', 350),
```

- [ ] **Step 2: テストを実行**

Run: `npm run test -- productCatalog`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add utils/productCatalog.ts
git commit -m "カタログ: プレミアムフード Group B を追加(10件)"
```

---

## Task 7: プレミアムフード Group C（8ブランド、約12件）

**Files:**
- Modify: `utils/productCatalog.ts`

- [ ] **Step 1: カタログに追記**

```ts
  // ナウフレッシュ
  item('food', 'ナウフレッシュ', 'アダルトキャット', '1.81kg', 4800),
  // ファーストメイト
  item('food', 'ファーストメイト', 'オリジナル ウィズ チキン', '2.27kg', 6200),
  // アカナ
  item('food', 'アカナ', 'ワイルドプレイリーキャット', '1.8kg', 5500),
  item('food', 'アカナ', 'グラスランドキャット', '1.8kg', 5800),
  // オリジン
  item('food', 'オリジン', 'キャット&キトゥン', '1.8kg', 6800),
  item('food', 'オリジン', 'フィット&トリム', '1.8kg', 6800),
  // ハッピードッグ
  item('food', 'ハッピードッグ', 'スプリーム キャット', '1.5kg', 3200),
  // ハッピーキャット
  item('food', 'ハッピーキャット', 'ミンカス アダルト', '1.5kg', 2800),
  // ベッツソリューション
  item('food', 'ベッツソリューション', 'ハイポアレルゲン 馬肉', '400g', 1800),
  // ビオリオーブ
  item('food', 'ビオリオーブ', 'スターターキャット', '1.6kg', 3200),
  // プロフェッショナル・バランス
  item('food', 'プロフェッショナル・バランス', '7歳から シニアサポート', '1.4kg', 1800),
```

- [ ] **Step 2: テストを実行**

Run: `npm run test -- productCatalog`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add utils/productCatalog.ts
git commit -m "カタログ: プレミアムフード Group C を追加(11件)"
```

---

## Task 8: メインストリームフード（5ブランド、約10件）

**Files:**
- Modify: `utils/productCatalog.ts`

- [ ] **Step 1: カタログに追記**

```ts
  // シーバ
  item('food', 'シーバ', 'デュオ 香りのまぐろ味', '200g', 480),
  item('food', 'シーバ', 'リッチ チキンのグリル', '88g', 280),
  // モンプチ
  item('food', 'モンプチ', 'バッグ ささみ&チキン', '240g', 580),
  item('food', 'モンプチ', 'プチグルメ缶 まぐろ', '85g', 180),
  // カルカン
  item('food', 'カルカン', 'パウチ かつお', '70g', 100),
  item('food', 'カルカン', 'ドライ まぐろ', '800g', 980),
  // ピュリナワン
  item('food', 'ピュリナワン', '室内飼い 美味な味わい', '2kg', 1980),
  item('food', 'ピュリナワン', '尿路の健康', '2kg', 2280),
  // アイムス
  item('food', 'アイムス', '成猫用 まぐろ味', '1.5kg', 1480),
  item('food', 'アイムス', '体重管理用', '1.5kg', 1580),
```

- [ ] **Step 2: テストを実行**

Run: `npm run test -- productCatalog`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add utils/productCatalog.ts
git commit -m "カタログ: メインストリームフード5ブランドを追加(10件)"
```

---

## Task 9: 消耗品 上位10社（約25件）

**Files:**
- Modify: `utils/productCatalog.ts`

- [ ] **Step 1: カタログに追記**

```ts
  // ユニ・チャーム
  item('litter', 'ユニ・チャーム', 'デオトイレ 飛び散らない消臭サンド', '2L', 980),
  item('litter', 'ユニ・チャーム', 'デオトイレ 取りかえ専用消臭・抗菌シート', '8枚', 780),
  item('litter', 'ユニ・チャーム', 'デオトイレ 飛び散らない消臭サンド', '4L', 1680),
  // 花王
  item('litter', '花王', 'ニャンとも清潔トイレ 脱臭・抗菌チップ 大粒', '4.4L', 1580),
  item('litter', '花王', 'ニャンとも清潔トイレ 脱臭シート', '12枚', 980),
  // アイリスオーヤマ
  item('litter', 'アイリスオーヤマ', '脱臭サンド 紙製', '7L', 780),
  item('litter', 'アイリスオーヤマ', 'ペットシーツ レギュラー', '160枚', 1580),
  item('litter', 'アイリスオーヤマ', 'ペットシーツ ワイド', '80枚', 1480),
  // ライオン商事
  item('litter', 'ライオン商事', 'ニオイをとる砂', '5L', 980),
  item('litter', 'ライオン商事', 'シュシュット おしっこ汚れ専用', '200ml', 580),
  // ペティオ
  item('litter', 'ペティオ', 'ペットシーツ ワイド', '54枚', 1280),
  item('litter', 'ペティオ', '猫用おしりふき', '60枚', 480),
  // マルカン
  item('litter', 'マルカン', 'ペットシーツ薄型 レギュラー', '200枚', 1480),
  item('litter', 'マルカン', 'ペットシーツ厚型 ワイド', '80枚', 1380),
  // ドギーマン
  item('litter', 'ドギーマン', 'お部屋の消臭スプレー 猫用', '270ml', 580),
  item('litter', 'ドギーマン', '猫用ウェットティッシュ', '100枚', 580),
  // 猫壱
  item('litter', '猫壱', '猫用ペーパーバスマット', '3枚', 680),
  item('litter', '猫壱', 'チャージアップ爪とぎ', '1個', 980),
  // リッチェル
  item('litter', 'リッチェル', 'ペットシーツ 厚型 ワイド', '40枚', 1280),
  item('litter', 'リッチェル', 'コロル 爪とぎボード', '1個', 880),
  // ジェックス
  item('litter', 'ジェックス', 'ピュアクリスタル 交換用フィルター', '3個', 980),
  item('litter', 'ジェックス', 'ピュアクリスタル 交換用カートリッジ', '2個', 1280),
```

- [ ] **Step 2: テストを実行**

Run: `npm run test -- productCatalog`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add utils/productCatalog.ts
git commit -m "カタログ: 消耗品10ブランドを追加(22件)"
```

---

## Task 10: ブランドカバレッジテスト

**Files:**
- Modify: `__tests__/productCatalog.test.ts`

- [ ] **Step 1: 全ブランドが少なくとも1件あるかのテストを追加**

```ts
// __tests__/productCatalog.test.ts に追記

const REQUIRED_FOOD_BRANDS = [
  'ロイヤルカナン', 'アーテミス', 'ブリスミックス', 'ジウィ', 'キアオラ',
  'ニュートロ シュプレモ', 'ニュートロ ナチュラルチョイス', 'ニュートロ ワイルドレシピ',
  'クプレラ', 'フォルツァ10', 'ソリッドゴールド', 'アニモンダ',
  'セレクトバランス', 'アボダーム', 'ホリスティック・レセピー',
  'iti', 'シシア', 'ナウフレッシュ', 'ファーストメイト',
  'アカナ', 'オリジン', 'ハッピードッグ', 'ハッピーキャット',
  'ベッツソリューション', 'ビオリオーブ', 'プロフェッショナル・バランス',
  'シーバ', 'モンプチ', 'カルカン', 'ピュリナワン', 'アイムス',
];

const REQUIRED_LITTER_BRANDS = [
  'ユニ・チャーム', '花王', 'アイリスオーヤマ', 'ライオン商事', 'ペティオ',
  'マルカン', 'ドギーマン', '猫壱', 'リッチェル', 'ジェックス',
];

describe('CATALOG ブランドカバレッジ', () => {
  it.each(REQUIRED_FOOD_BRANDS)('フードブランド "%s" が含まれている', (brand) => {
    expect(CATALOG.some((x) => x.category === 'food' && x.brand === brand)).toBe(true);
  });

  it.each(REQUIRED_LITTER_BRANDS)('消耗品ブランド "%s" が含まれている', (brand) => {
    expect(CATALOG.some((x) => x.category === 'litter' && x.brand === brand)).toBe(true);
  });
});
```

- [ ] **Step 2: テストを実行**

Run: `npm run test -- productCatalog`
Expected: PASS（全ブランド網羅済み）

- [ ] **Step 3: Commit**

```bash
git add __tests__/productCatalog.test.ts
git commit -m "サジェスト機能: ブランドカバレッジテストを追加"
```

---

## Task 11: ProductSuggestions コンポーネント（TDD）

**Files:**
- Create: `components/ProductSuggestions.tsx`
- Create: `__tests__/ProductSuggestions.test.tsx`

- [ ] **Step 1: テストを先に書く**

```tsx
// __tests__/ProductSuggestions.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProductSuggestions from '../components/ProductSuggestions';
import { item } from '../utils/productCatalog';

const TEST_CATALOG = [
  item('food', 'ロイヤルカナン', 'インドア', '2kg', 3800),
  item('food', 'ロイヤルカナン', '満腹感サポート', '2kg', 3500),
  item('litter', 'ユニ・チャーム', 'デオトイレ', '2L', 980),
];

describe('ProductSuggestions', () => {
  it('category=null では何もレンダリングしない', () => {
    const { toJSON } = render(
      <ProductSuggestions query="ロイ" category={null} onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(toJSON()).toBeNull();
  });

  it('空クエリでは何もレンダリングしない', () => {
    const { toJSON } = render(
      <ProductSuggestions query="" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(toJSON()).toBeNull();
  });

  it('該当ありなら候補を表示する', () => {
    const { getByText } = render(
      <ProductSuggestions query="ロイ" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(getByText('ロイヤルカナン インドア 2kg')).toBeTruthy();
    expect(getByText('¥3,800')).toBeTruthy();
  });

  it('該当なしなら "見つかりません" メッセージを表示する', () => {
    const { getByText } = render(
      <ProductSuggestions query="存在しない商品xyz" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(getByText('該当する商品が見つかりません')).toBeTruthy();
  });

  it('タップで onSelect が正しい引数で呼ばれる', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <ProductSuggestions query="ロイ" category="food" onSelect={onSelect} catalog={TEST_CATALOG} />
    );
    fireEvent.press(getByText('ロイヤルカナン インドア 2kg'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].displayName).toBe('ロイヤルカナン インドア 2kg');
    expect(onSelect.mock.calls[0][0].amount).toBe(3800);
  });

  it('カテゴリで絞り込む（food で litter は表示しない）', () => {
    const { queryByText } = render(
      <ProductSuggestions query="デオ" category="food" onSelect={() => {}} catalog={TEST_CATALOG} />
    );
    expect(queryByText(/デオトイレ/)).toBeNull();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npm run test -- ProductSuggestions`
Expected: FAIL（コンポーネント未定義）

- [ ] **Step 3: 実装**

```tsx
// components/ProductSuggestions.tsx
import { View, Text, Pressable } from 'react-native';
import type { CatalogItem, CatalogCategory } from '../types/catalog';
import { CATALOG } from '../utils/productCatalog';
import { searchCatalog } from '../utils/catalogSearch';

type Props = {
  query: string;
  category: CatalogCategory | null;
  onSelect: (item: CatalogItem) => void;
  catalog?: CatalogItem[];
};

export default function ProductSuggestions({ query, category, onSelect, catalog = CATALOG }: Props) {
  if (category === null) return null;
  if (query.trim().length === 0) return null;

  const results = searchCatalog(query, category, catalog);

  if (results.length === 0) {
    return (
      <View className="mb-4 rounded-lg border border-gray-200 px-3 py-3 bg-gray-50">
        <Text className="text-sm text-gray-500">該当する商品が見つかりません</Text>
      </View>
    );
  }

  return (
    <View className="mb-4 rounded-lg border border-gray-200 bg-white overflow-hidden">
      {results.map((it, idx) => (
        <Pressable
          key={it.id}
          onPress={() => onSelect(it)}
          className={`flex-row items-center justify-between px-3 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''}`}
          android_ripple={{ color: '#f3f4f6' }}
        >
          <Text className="flex-1 text-base text-gray-900" numberOfLines={1}>
            {it.displayName}
          </Text>
          <Text className="ml-3 text-base font-medium text-gray-600">
            ¥{it.amount.toLocaleString('ja-JP')}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm run test -- ProductSuggestions`
Expected: PASS（全6ケース）

- [ ] **Step 5: Commit**

```bash
git add components/ProductSuggestions.tsx __tests__/ProductSuggestions.test.tsx
git commit -m "サジェスト機能: ProductSuggestions コンポーネントを追加"
```

---

## Task 12: ExpenseForm への統合

**Files:**
- Modify: `components/ExpenseForm.tsx`

- [ ] **Step 1: import を追加**

`components/ExpenseForm.tsx` の冒頭 import 群の末尾（`import ReminderSetting from "./ReminderSetting";` の直後）に追加:

```ts
import ProductSuggestions from "./ProductSuggestions";
import type { CatalogCategory } from "../types/catalog";
```

- [ ] **Step 2: 品名入力直下にサジェストを挿入**

`components/ExpenseForm.tsx` で品名 TextInput を含むブロック:

```tsx
      <Text className="mb-2 text-base font-medium text-gray-600">品名</Text>
      <TextInput
        value={itemName}
        onChangeText={setItemName}
        placeholder="例: ロイヤルカナン インドア 2kg"
        className="mb-4 rounded-lg border border-gray-200 px-3 py-3"
      />
```

の `</TextInput>` の直後、`<Text className="mb-2 text-base font-medium text-gray-600">金額 (円)</Text>` の直前に以下を挿入:

```tsx
      <ProductSuggestions
        query={itemName}
        category={
          !editTarget && (category === "food" || category === "litter")
            ? (category as CatalogCategory)
            : null
        }
        onSelect={(picked) => {
          setItemName(picked.displayName);
          setAmount(String(picked.amount));
        }}
      />
```

- [ ] **Step 4: 既存テストへの影響確認**

Run: `npm run test`
Expected: 全テスト PASS（既存テストにブレなし）

- [ ] **Step 5: 動作確認用テストを追加**

`__tests__/ProductSuggestions.test.tsx` に統合テストを追加:

```tsx
// 既存ファイルに追記
import ExpenseForm from '../components/ExpenseForm';

describe('ExpenseForm × ProductSuggestions 統合', () => {
  it('food カテゴリで品名を入力するとサジェストが表示される', () => {
    const { getByPlaceholderText, getByText } = render(
      <ExpenseForm onSubmit={async () => {}} />
    );
    const input = getByPlaceholderText(/ロイヤルカナン/);
    fireEvent.changeText(input, 'ロイ');
    expect(getByText(/ロイヤルカナン/)).toBeTruthy();
  });

  it('編集モードではサジェストが表示されない（カタログにヒットする品名でもUI出さず）', () => {
    const editTarget = {
      id: 'x', category: 'food' as const, amount: 3800,
      itemName: 'ロイヤルカナン インドア',
      expenseDate: '2026-05-17', memo: '', inventoryId: null,
      reminderDays: null, notificationId: null,
      createdAt: '2026-05-17T00:00:00Z', updatedAt: '2026-05-17T00:00:00Z',
    };
    const { queryByText } = render(
      <ExpenseForm onSubmit={async () => {}} editTarget={editTarget} />
    );
    // 通常モードならヒットするはずの品名だが、編集モードではサジェスト枠自体が出ない
    expect(queryByText('ロイヤルカナン インドア 2kg')).toBeNull();
  });
});
```

- [ ] **Step 6: 統合テストを実行**

Run: `npm run test -- ProductSuggestions`
Expected: PASS（コンポーネントテスト6件 + 統合テスト2件 = 8件）

- [ ] **Step 7: 全テスト実行で回帰確認**

Run: `npm run test`
Expected: PASS（既存テスト + 新規テスト全件）

- [ ] **Step 8: Lint と型チェック**

Run: `npm run lint && npx tsc --noEmit`
Expected: エラーなし

- [ ] **Step 9: Commit**

```bash
git add components/ExpenseForm.tsx __tests__/ProductSuggestions.test.tsx
git commit -m "サジェスト機能: ExpenseFormにサジェストを統合"
```

---

## Task 13: ドキュメント更新

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: CLAUDE.md のディレクトリ構成セクションに追記**

`CLAUDE.md` の「ディレクトリ構成」セクション内、`components/` ブロックに以下を追記:

```
│   ├── ProductSuggestions.tsx  # 品名サジェストUI
```

`types/` ブロックに追記:

```
│   ├── catalog.ts              # 商品カタログの型定義
```

`utils/` ブロックに追記:

```
│   ├── catalogSearch.ts        # カタログ検索ロジック
│   ├── productCatalog.ts       # 静的商品カタログ
```

- [ ] **Step 2: CLAUDE.md に「商品サジェスト機能」セクションを追加**

「## 通知（リマインダー）仕様」セクションの後に以下を追加:

```markdown
## 商品サジェスト機能

### 概要

支出登録時、フード・消耗品カテゴリでは品名入力欄の下に「品名 + 目安金額」のサジェストを最大8件表示する。タップで品名・金額を一括入力できる。

### 対象カテゴリ

- food（フード）
- litter（消耗品）

### データソース

`utils/productCatalog.ts` に in-memory の静的配列で約500件規模のカタログを保持（初版は約100件）。SQLite は使わない。

### 検索仕様

- 入力を NFKC + lowercase + 空白除去で正規化
- `searchKey.includes(query)` で部分一致
- ソート: 前方一致 > 部分一致、brand 一致を次に、displayName 短い順
- 最大8件返す
- 編集モード（既存支出の編集中）はサジェストを表示しない（誤上書き防止）

### 価格の扱い

カタログの金額は市場相場ベースの目安値。実際の購入額とずれがある場合はタップ後に金額欄で編集可能。

### カバレッジ

- フード: プレミアム26ブランド + メインストリーム5ブランド
- 消耗品: 上位10社（猫砂・ペットシーツ・お手入れシート・爪とぎ消耗品）
```

- [ ] **Step 3: README.md に機能説明を追加**

README.md の `### 支出管理` セクション内の最後の箇条書きの後（`- FAB（＋）ボタンからモーダルで支出登録` の直後）に以下を追加:

```markdown
- フード・消耗品の登録時に品名サジェスト表示（約500商品の静的カタログから前方一致・部分一致でタップ一発入力）
```

加えて、README.md の `## 機能一覧` の後の適切な位置（`### 買い替えリマインダー（通知）` の前）に以下のセクションを追加:

```markdown
### 商品サジェスト

- フード・消耗品カテゴリの支出登録時、品名入力欄の下に「品名 + 目安金額」の候補を最大8件表示
- タップで品名・金額を一括入力
- 検索: NFKC + 小文字 + 空白除去で正規化、前方一致を優先
- カタログ: プレミアム26ブランド + メインストリーム5ブランド + 消耗品10社の代表商品
- 価格は市場相場の目安値（実際の購入額とずれる場合は金額欄で編集可能）
- 編集モード中はサジェスト非表示（誤上書き防止）
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "ドキュメント: 商品サジェスト機能の説明を追加"
```

---

## Self-Review チェックリスト

実装完了後、以下を確認:

- [ ] 全タスクのテストが PASS
- [ ] `npm run lint` でエラーなし
- [ ] `npx tsc --noEmit` でエラーなし
- [ ] 実機/シミュレータで food カテゴリ選択 → 品名「ロイ」と入力 → サジェスト表示 → タップで品名・金額反映を確認
- [ ] 編集モードでサジェストが出ないことを確認
- [ ] 在庫連動・通知設定など既存機能が壊れていないことを確認
