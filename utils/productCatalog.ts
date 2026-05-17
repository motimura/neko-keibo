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
