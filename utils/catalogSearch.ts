import type { CatalogItem, CatalogCategory } from '../types/catalog';

export function normalizeQuery(input: string): string {
  return input.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
}

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
