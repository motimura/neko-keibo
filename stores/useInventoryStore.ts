import { create } from "zustand";
import type { ExpenseCategory } from "../types/expense";
import type { InventoryItem, CreateInventoryInput, UpdateInventoryInput } from "../types/inventory";
import {
  createInventoryItem,
  getInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  updateStatusFromPurchase,
  findInventoryByName,
} from "../db/inventory";
import { refreshAllInventoryStatuses } from "../utils/inventoryStatus";
import { useExpenseStore } from "./useExpenseStore";
import { CONSUMABLE_CATEGORIES } from "../utils/constants";
import { format } from "date-fns";

interface InventoryStore {
  items: InventoryItem[];
  criticalCount: number;
  loading: boolean;

  fetchItems: () => Promise<void>;
  addItem: (input: CreateInventoryInput) => Promise<InventoryItem>;
  editItem: (id: string, input: UpdateInventoryInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  refreshStatuses: () => Promise<void>;
  linkPurchase: (itemName: string, category: ExpenseCategory, expenseDate: string) => Promise<string | null>;
}

function getDb() {
  return useExpenseStore.getState().db;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("DB not initialized");
  return db;
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  items: [],
  criticalCount: 0,
  loading: false,

  fetchItems: async () => {
    const db = getDb();
    if (!db) return;
    set({ loading: true });
    try {
      const items = await getInventoryItems(db);
      const criticalCount = items.filter((i) => i.status === "critical").length;
      set({ items, criticalCount });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (input: CreateInventoryInput) => {
    const db = requireDb();
    const item = await createInventoryItem(db, input);
    await get().fetchItems();
    return item;
  },

  editItem: async (id: string, input: UpdateInventoryInput) => {
    const db = requireDb();
    await updateInventoryItem(db, id, input);
    await get().fetchItems();
  },

  removeItem: async (id: string) => {
    const db = requireDb();
    await deleteInventoryItem(db, id);
    await get().fetchItems();
  },

  refreshStatuses: async () => {
    const db = getDb();
    if (!db) return;
    await refreshAllInventoryStatuses(db);
    await get().fetchItems();
  },

  linkPurchase: async (itemName: string, category: ExpenseCategory, expenseDate: string) => {
    if (!CONSUMABLE_CATEGORIES.includes(category)) return null;

    const db = requireDb();
    const existing = await findInventoryByName(db, itemName, category);

    if (existing) {
      await updateStatusFromPurchase(db, existing.id, expenseDate);
      await get().fetchItems();
      return existing.id;
    }

    const newItem = await createInventoryItem(db, {
      itemName,
      category,
      status: "sufficient",
      lastPurchasedAt: expenseDate,
    });
    await get().fetchItems();
    return newItem.id;
  },
}));
