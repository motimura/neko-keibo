import { searchCatalog, normalizeQuery } from '../utils/catalogSearch';
import type { CatalogItem } from '../types/catalog';

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
