import type { ExpenseCategory } from "./expense";

export type CatalogCategory = Extract<ExpenseCategory, "food" | "litter">;

export interface CatalogItem {
  id: string;
  category: CatalogCategory;
  brand: string;
  productName: string;
  size: string;
  amount: number;
  displayName: string;
  searchKey: string;
  suggestionLabel?: string;
  inputName?: string;
}
