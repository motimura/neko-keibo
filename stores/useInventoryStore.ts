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
import { getLatestExpenseByInventoryId } from "../db/expenses";
import { refreshAllInventoryStatuses } from "../utils/inventoryStatus";
import { useExpenseStore } from "./useExpenseStore";
import { CONSUMABLE_CATEGORIES, CATEGORY_EMOJI } from "../utils/constants";
import { scheduleReminder, cancelReminder } from "../utils/notifications";
import { format } from "date-fns";

interface InventoryStore {
  items: InventoryItem[];
  criticalCount: number;
  loading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  addItem: (input: CreateInventoryInput) => Promise<InventoryItem>;
  editItem: (id: string, input: UpdateInventoryInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  refreshStatuses: () => Promise<void>;
  linkPurchase: (itemName: string, category: ExpenseCategory, expenseDate: string) => Promise<string | null>;
  repurchaseFromInventory: (item: InventoryItem) => Promise<void>;
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
  error: null,

  fetchItems: async () => {
    const db = getDb();
    if (!db) return;
    set({ loading: true, error: null });
    try {
      const items = await getInventoryItems(db);
      const criticalCount = items.filter((i) => i.status === "critical").length;
      set({ items, criticalCount });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (input: CreateInventoryInput) => {
    const db = requireDb();
    try {
      const item = await createInventoryItem(db, input);
      await get().fetchItems();
      return item;
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  editItem: async (id: string, input: UpdateInventoryInput) => {
    const db = requireDb();
    try {
      await updateInventoryItem(db, id, input);
      await get().fetchItems();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  removeItem: async (id: string) => {
    const db = requireDb();
    try {
      await deleteInventoryItem(db, id);
      await get().fetchItems();
    } catch (e) {
      set({ error: (e as Error).message });
      throw e;
    }
  },

  refreshStatuses: async () => {
    const db = getDb();
    if (!db) return;
    try {
      await refreshAllInventoryStatuses(db);
      await get().fetchItems();
    } catch (e) {
      set({ error: (e as Error).message });
    }
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

  repurchaseFromInventory: async (item: InventoryItem) => {
    const db = requireDb();
    const today = format(new Date(), "yyyy-MM-dd");

    const lastExpense = await getLatestExpenseByInventoryId(db, item.id);
    const amount = lastExpense?.amount ?? 0;
    const oldReminderDays = lastExpense?.reminderDays ?? null;

    // Cancel old notification if exists
    if (lastExpense?.notificationId) {
      try {
        await cancelReminder(lastExpense.notificationId);
      } catch {}
    }
    // Clear old expense's notification settings
    if (lastExpense) {
      const { updateExpense } = require("../db/expenses");
      await updateExpense(db, lastExpense.id, { reminderDays: null, notificationId: null });
    }

    // Create new expense
    const expenseStore = useExpenseStore.getState();
    const newExpense = await expenseStore.addExpense(
      {
        category: item.category,
        amount,
        itemName: item.itemName,
        expenseDate: today,
        memo: "",
        inventoryId: item.id,
        reminderDays: oldReminderDays ?? undefined,
      },
      false // skip linkPurchase since we handle it manually
    );

    // Update inventory status
    await updateStatusFromPurchase(db, item.id, today);

    // Schedule new notification with inherited reminder_days
    if (oldReminderDays && oldReminderDays > 0) {
      const emoji = CATEGORY_EMOJI[item.category] || "📦";
      const notificationId = await scheduleReminder(
        item.itemName,
        emoji,
        oldReminderDays,
        newExpense.id
      );
      if (notificationId) {
        const { updateExpense } = require("../db/expenses");
        await updateExpense(db, newExpense.id, { notificationId });
      }
    }

    await get().fetchItems();
  },
}));
