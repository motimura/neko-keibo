import { create } from "zustand";
import { Platform } from "react-native";
import * as SQLite from "expo-sqlite";
import type { Expense, CreateExpenseInput, UpdateExpenseInput, DashboardSummary, ExpenseCategory } from "../types/expense";
import { initDatabase } from "../db/schema";
import { createExpense, getExpensesByMonth, getExpensesByMonthAndCategory, updateExpense, deleteExpense } from "../db/expenses";
import { getDashboardSummary, getLast12MonthsByCategory } from "../db/dashboard";
import { format } from "date-fns";

interface ExpenseStore {
  db: SQLite.SQLiteDatabase | null;
  ready: boolean;
  expenses: Expense[];
  summary: DashboardSummary | null;
  yearlyByCategory: Partial<Record<ExpenseCategory, number>>;
  currentMonth: string;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  setMonth: (month: string) => void;
  fetchExpenses: (category?: string) => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchYearlyByCategory: () => Promise<void>;
  addExpense: (input: CreateExpenseInput, linkInventory?: boolean) => Promise<Expense>;
  editExpense: (id: string, input: UpdateExpenseInput) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseStore>((set, get) => ({
  db: null,
  ready: false,
  expenses: [],
  summary: null,
  yearlyByCategory: {},
  currentMonth: format(new Date(), "yyyy-MM"),
  loading: false,
  error: null,

  init: async () => {
    if (Platform.OS === "web") {
      set({
        ready: true,
        summary: {
          month: get().currentMonth,
          totalAmount: 0,
          byCategory: {},
          comparedToPrevMonth: null,
        },
      });
      return;
    }
    const db = SQLite.openDatabaseSync("neko_keibo.db");
    await initDatabase(db);
    set({ db, ready: true });
  },

  setMonth: (month: string) => {
    set({ currentMonth: month });
  },

  fetchExpenses: async (category?: string) => {
    const { db, currentMonth } = get();
    if (!db) return;
    set({ loading: true, error: null });
    try {
      const expenses = category
        ? await getExpensesByMonthAndCategory(db, currentMonth, category)
        : await getExpensesByMonth(db, currentMonth);
      set({ expenses });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  fetchSummary: async () => {
    const { db, currentMonth } = get();
    if (!db) return;
    try {
      const summary = await getDashboardSummary(db, currentMonth);
      set({ summary });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  fetchYearlyByCategory: async () => {
    const { db } = get();
    if (!db) return;
    try {
      const yearlyByCategory = await getLast12MonthsByCategory(db);
      set({ yearlyByCategory });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  addExpense: async (input: CreateExpenseInput, linkInventory?: boolean) => {
    const { db } = get();
    if (!db) throw new Error("DB not initialized");

    let inventoryId: string | undefined;
    if (linkInventory) {
      const { useInventoryStore } = require("./useInventoryStore");
      const linkedId = await useInventoryStore.getState().linkPurchase(
        input.itemName,
        input.category,
        input.expenseDate
      );
      if (linkedId) inventoryId = linkedId;
    }

    const expense = await createExpense(db, { ...input, inventoryId });
    await get().fetchExpenses();
    await get().fetchSummary();
    return expense;
  },

  editExpense: async (id: string, input: UpdateExpenseInput) => {
    const { db } = get();
    if (!db) throw new Error("DB not initialized");
    await updateExpense(db, id, input);
    await get().fetchExpenses();
    await get().fetchSummary();
  },

  removeExpense: async (id: string) => {
    const { db } = get();
    if (!db) throw new Error("DB not initialized");
    await deleteExpense(db, id);
    await get().fetchExpenses();
    await get().fetchSummary();
  },
}));
