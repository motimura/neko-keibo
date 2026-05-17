export type CatalogCategory = "food" | "litter";

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
