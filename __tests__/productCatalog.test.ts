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
