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

  it('詳細商品を増やしすぎずテンプレート中心に保っている', () => {
    expect(CATALOG.length).toBeLessThanOrEqual(100);
    expect(CATALOG.filter((x) => x.productName === '詳細入力').length).toBeGreaterThanOrEqual(25);
  });

  it('詳細追記用の汎用候補が含まれている', () => {
    expect(CATALOG).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          suggestionLabel: 'ロイヤルカナン 2kg（詳細を追記）',
          inputName: 'ロイヤルカナン  2kg',
        }),
        expect.objectContaining({
          suggestionLabel: 'デオトイレ シート（枚数を追記）',
          inputName: 'デオトイレ シート ',
        }),
      ]),
    );
  });

  it('主要フードブランドの公式容量を詳細追記候補で網羅している', () => {
    const templateSizes = (brand: string) =>
      CATALOG.filter((x) => x.brand === brand && x.productName === '詳細入力')
        .map((x) => x.size)
        .sort();

    expect(templateSizes('ロイヤルカナン')).toEqual([
      '1.5kg',
      '10kg',
      '2kg',
      '3.5kg',
      '400g',
      '4kg',
      '500g',
    ]);
    expect(templateSizes('ニュートロ')).toEqual([
      '1kg',
      '2kg',
      '400g',
      '500g',
    ]);
    expect(templateSizes('ピュリナワン')).toEqual([
      '1.6kg',
      '2.2kg',
      '2kg',
      '3.4kg',
      '500g',
      '800g',
    ]);
    expect(templateSizes('シーバ')).toEqual([
      '12g×20本',
      '200g',
      '85g',
      '88g',
    ]);
    expect(templateSizes('モンプチ')).toEqual([
      '144g',
      '240g',
      '35g',
      '85g',
    ]);
    expect(templateSizes('カルカン')).toEqual([
      '1.6kg',
      '70g',
      '800g',
    ]);
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
