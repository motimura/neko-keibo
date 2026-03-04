import type { ExpenseCategory } from "./expense";

export const INVENTORY_STATUSES = ["critical", "low", "sufficient"] as const;
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];

export interface InventoryItem {
  id: string;
  itemName: string;
  category: ExpenseCategory;
  status: InventoryStatus;
  lastPurchasedAt: string | null;
  nextPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryInput {
  itemName: string;
  category: ExpenseCategory;
  status?: InventoryStatus;
  lastPurchasedAt?: string;
}

export interface UpdateInventoryInput {
  itemName?: string;
  category?: ExpenseCategory;
  status?: InventoryStatus;
  lastPurchasedAt?: string;
}
