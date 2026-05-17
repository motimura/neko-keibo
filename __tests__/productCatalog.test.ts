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
