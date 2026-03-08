const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockExecAsync = jest.fn();

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
    execAsync: mockExecAsync,
  })),
}));

jest.mock("expo-notifications", () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("mock-notif-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
  addNotificationReceivedListener: jest.fn(),
}));

import * as SQLite from "expo-sqlite";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useInventoryStore } from "../stores/useInventoryStore";
import { useNotificationStore } from "../stores/useNotificationStore";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");

  // Reset stores to initial state
  useExpenseStore.setState({
    db: null,
    ready: false,
    expenses: [],
    summary: null,
    yearlyByCategory: {},
    loading: false,
    error: null,
  });

  useInventoryStore.setState({
    items: [],
    criticalCount: 0,
    loading: false,
  });

  useNotificationStore.setState({
    notifications: [],
    pendingCount: 0,
    loading: false,
  });
});

describe("useExpenseStore", () => {
  describe("init", () => {
    it("initializes database and sets ready state", async () => {
      mockExecAsync.mockResolvedValue(undefined);
      mockRunAsync.mockResolvedValue({ changes: 0 });

      await useExpenseStore.getState().init();

      const state = useExpenseStore.getState();
      expect(state.ready).toBe(true);
      expect(state.db).not.toBeNull();
    });
  });

  describe("fetchExpenses", () => {
    it("fetches expenses for current month", async () => {
      // Set up db in store
      useExpenseStore.setState({ db });

      mockGetAllAsync.mockResolvedValue([
        {
          id: "exp-1",
          category: "food",
          amount: 2980,
          item_name: "ロイヤルカナン",
          expense_date: "2026-03-01",
          memo: "",
          inventory_id: null,
          reminder_days: null,
          notification_id: null,
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ]);

      await useExpenseStore.getState().fetchExpenses();

      const state = useExpenseStore.getState();
      expect(state.expenses).toHaveLength(1);
      expect(state.expenses[0].itemName).toBe("ロイヤルカナン");
      expect(state.loading).toBe(false);
    });

    it("fetches expenses filtered by category", async () => {
      useExpenseStore.setState({ db });
      mockGetAllAsync.mockResolvedValue([]);

      await useExpenseStore.getState().fetchExpenses("food");

      const sql = mockGetAllAsync.mock.calls[0][0] as string;
      expect(sql).toContain("AND category = ?");
    });

    it("sets error state on failure", async () => {
      useExpenseStore.setState({ db });
      mockGetAllAsync.mockRejectedValue(new Error("DB error"));

      await useExpenseStore.getState().fetchExpenses();

      const state = useExpenseStore.getState();
      expect(state.error).toBe("DB error");
      expect(state.loading).toBe(false);
    });

    it("does nothing when db is null", async () => {
      useExpenseStore.setState({ db: null });

      await useExpenseStore.getState().fetchExpenses();

      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  describe("addExpense", () => {
    it("creates expense and refreshes data", async () => {
      useExpenseStore.setState({ db });
      mockRunAsync.mockResolvedValue({ changes: 1 });
      // fetchExpenses after add
      mockGetAllAsync.mockResolvedValue([]);
      // fetchSummary: getMonthlySummary + getPrevMonthTotal
      mockGetFirstAsync.mockResolvedValue({ total: 0 });

      const expense = await useExpenseStore.getState().addExpense({
        category: "food",
        amount: 2980,
        itemName: "ロイヤルカナン",
        expenseDate: "2026-03-01",
      });

      expect(expense.itemName).toBe("ロイヤルカナン");
      expect(expense.amount).toBe(2980);
    });

    it("throws when db is not initialized", async () => {
      useExpenseStore.setState({ db: null });

      await expect(
        useExpenseStore.getState().addExpense({
          category: "food",
          amount: 2980,
          itemName: "test",
          expenseDate: "2026-03-01",
        })
      ).rejects.toThrow("DB not initialized");
    });
  });

  describe("editExpense", () => {
    it("updates expense and refreshes data", async () => {
      useExpenseStore.setState({ db });
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue({
        id: "exp-1",
        category: "food",
        amount: 3500,
        item_name: "ロイヤルカナン",
        expense_date: "2026-03-01",
        memo: "updated",
        inventory_id: null,
        reminder_days: null,
        notification_id: null,
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      });
      // fetchExpenses + fetchSummary
      mockGetAllAsync.mockResolvedValue([]);

      await useExpenseStore.getState().editExpense("exp-1", { amount: 3500 });

      expect(mockRunAsync).toHaveBeenCalled();
    });
  });

  describe("removeExpense", () => {
    it("deletes expense and refreshes data", async () => {
      useExpenseStore.setState({ db });
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetAllAsync.mockResolvedValue([]);
      mockGetFirstAsync.mockResolvedValue({ total: 0 });

      await useExpenseStore.getState().removeExpense("exp-1");

      const sql = mockRunAsync.mock.calls[0][0] as string;
      expect(sql).toContain("DELETE FROM expenses");
    });

    it("throws when db is not initialized", async () => {
      useExpenseStore.setState({ db: null });

      await expect(
        useExpenseStore.getState().removeExpense("exp-1")
      ).rejects.toThrow("DB not initialized");
    });
  });

  describe("setMonth", () => {
    it("updates currentMonth", () => {
      useExpenseStore.getState().setMonth("2026-04");
      expect(useExpenseStore.getState().currentMonth).toBe("2026-04");
    });
  });

  describe("fetchSummary", () => {
    it("sets error state on failure", async () => {
      useExpenseStore.setState({ db });
      mockGetFirstAsync.mockRejectedValue(new Error("summary error"));

      await useExpenseStore.getState().fetchSummary();

      expect(useExpenseStore.getState().error).toBe("summary error");
    });
  });
});

describe("useInventoryStore", () => {
  beforeEach(() => {
    // Inventory store relies on useExpenseStore.db
    useExpenseStore.setState({ db });
  });

  describe("fetchItems", () => {
    it("fetches inventory items and calculates criticalCount", async () => {
      mockGetAllAsync.mockResolvedValue([
        {
          id: "inv-1",
          item_name: "ロイヤルカナン",
          category: "food",
          status: "critical",
          last_purchased_at: "2026-02-01",
          next_purchase_date: "2026-03-03",
          created_at: "2026-02-01T00:00:00Z",
          updated_at: "2026-02-01T00:00:00Z",
        },
        {
          id: "inv-2",
          item_name: "猫砂",
          category: "litter",
          status: "sufficient",
          last_purchased_at: "2026-03-01",
          next_purchase_date: "2026-03-31",
          created_at: "2026-03-01T00:00:00Z",
          updated_at: "2026-03-01T00:00:00Z",
        },
      ]);

      await useInventoryStore.getState().fetchItems();

      const state = useInventoryStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.criticalCount).toBe(1);
      expect(state.loading).toBe(false);
    });

    it("does nothing when db is null", async () => {
      useExpenseStore.setState({ db: null });

      await useInventoryStore.getState().fetchItems();

      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  describe("addItem", () => {
    it("creates inventory item and refreshes list", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetAllAsync.mockResolvedValue([]);

      const item = await useInventoryStore.getState().addItem({
        itemName: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
      });

      expect(item.itemName).toBe("ロイヤルカナン");
      expect(item.category).toBe("food");
      expect(item.status).toBe("sufficient");
    });

    it("throws when db is not initialized", async () => {
      useExpenseStore.setState({ db: null });

      await expect(
        useInventoryStore.getState().addItem({
          itemName: "test",
          category: "food",
        })
      ).rejects.toThrow("DB not initialized");
    });
  });

  describe("editItem", () => {
    it("updates inventory item and refreshes list", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue({
        id: "inv-1",
        item_name: "ロイヤルカナン改",
        category: "food",
        status: "sufficient",
        last_purchased_at: "2026-03-01",
        next_purchase_date: null,
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-03-09T00:00:00Z",
      });
      mockGetAllAsync.mockResolvedValue([]);

      await useInventoryStore.getState().editItem("inv-1", { itemName: "ロイヤルカナン改" });

      expect(mockRunAsync).toHaveBeenCalled();
    });
  });

  describe("removeItem", () => {
    it("deletes inventory item and refreshes list", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetAllAsync.mockResolvedValue([]);

      await useInventoryStore.getState().removeItem("inv-1");

      const sql = mockRunAsync.mock.calls[0][0] as string;
      expect(sql).toContain("DELETE FROM inventory");
    });
  });

  describe("linkPurchase", () => {
    it("returns null for non-consumable category", async () => {
      const result = await useInventoryStore.getState().linkPurchase(
        "おもちゃ",
        "toy",
        "2026-03-09"
      );
      expect(result).toBeNull();
    });

    it("returns existing inventory id when item found", async () => {
      mockGetFirstAsync.mockResolvedValueOnce({
        id: "inv-1",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "critical",
        last_purchased_at: "2026-02-01",
        next_purchase_date: "2026-03-03",
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      });
      // updateStatusFromPurchase calls
      mockGetFirstAsync
        .mockResolvedValueOnce({
          id: "inv-1",
          item_name: "ロイヤルカナン",
          category: "food",
          status: "critical",
          last_purchased_at: "2026-02-01",
          next_purchase_date: "2026-03-03",
          created_at: "2026-02-01T00:00:00Z",
          updated_at: "2026-02-01T00:00:00Z",
        })
        .mockResolvedValueOnce({
          id: "exp-1",
          category: "food",
          amount: 2980,
          item_name: "ロイヤルカナン",
          expense_date: "2026-03-09",
          memo: "",
          inventory_id: "inv-1",
          reminder_days: null,
          notification_id: null,
          created_at: "2026-03-09T00:00:00Z",
          updated_at: "2026-03-09T00:00:00Z",
        })
        .mockResolvedValueOnce({
          id: "inv-1",
          item_name: "ロイヤルカナン",
          category: "food",
          status: "sufficient",
          last_purchased_at: "2026-03-09",
          next_purchase_date: null,
          created_at: "2026-02-01T00:00:00Z",
          updated_at: "2026-03-09T00:00:00Z",
        });

      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetAllAsync.mockResolvedValue([]);

      const result = await useInventoryStore.getState().linkPurchase(
        "ロイヤルカナン",
        "food",
        "2026-03-09"
      );

      expect(result).toBe("inv-1");
    });

    it("creates new inventory item when not found", async () => {
      // findInventoryByName: exact match null, partial match null
      mockGetFirstAsync.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetAllAsync.mockResolvedValue([]);

      const result = await useInventoryStore.getState().linkPurchase(
        "新しいフード",
        "food",
        "2026-03-09"
      );

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });
});

describe("useNotificationStore", () => {
  beforeEach(() => {
    useExpenseStore.setState({ db });
  });

  describe("fetchNotifications", () => {
    it("fetches pending notifications and sets count", async () => {
      mockGetAllAsync.mockResolvedValue([
        {
          id: "notif-1",
          expense_id: "exp-1",
          category: "food",
          item_name: "ロイヤルカナン",
          amount: 2980,
          reminder_days: 30,
          notified_at: "2026-03-09T09:00:00Z",
          status: "pending",
          acted_at: null,
        },
      ]);

      await useNotificationStore.getState().fetchNotifications();

      const state = useNotificationStore.getState();
      expect(state.notifications).toHaveLength(1);
      expect(state.pendingCount).toBe(1);
      expect(state.loading).toBe(false);
    });

    it("does nothing when db is null", async () => {
      useExpenseStore.setState({ db: null });

      await useNotificationStore.getState().fetchNotifications();

      expect(mockGetAllAsync).not.toHaveBeenCalled();
    });
  });

  describe("fetchPendingCount", () => {
    it("fetches pending count", async () => {
      mockGetFirstAsync.mockResolvedValue({ count: 3 });

      await useNotificationStore.getState().fetchPendingCount();

      expect(useNotificationStore.getState().pendingCount).toBe(3);
    });
  });

  describe("repurchase", () => {
    it("creates new expense and schedules notification", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      // fetchExpenses after addExpense
      mockGetAllAsync.mockResolvedValue([]);
      // fetchSummary calls
      mockGetFirstAsync.mockResolvedValue({ total: 0 });

      const notification = {
        id: "notif-1",
        expenseId: "exp-1",
        category: "food" as const,
        itemName: "ロイヤルカナン",
        amount: 2980,
        reminderDays: 30,
        notifiedAt: "2026-03-09T09:00:00Z",
        status: "pending" as const,
        actedAt: null,
      };

      await useNotificationStore.getState().repurchase(notification);

      // Should have created expense (INSERT)
      const insertCalls = mockRunAsync.mock.calls.filter(
        (c: unknown[]) => (c[0] as string).includes("INSERT INTO expenses")
      );
      expect(insertCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("throws when db is not initialized", async () => {
      useExpenseStore.setState({ db: null });

      const notification = {
        id: "notif-1",
        expenseId: "exp-1",
        category: "food" as const,
        itemName: "ロイヤルカナン",
        amount: 2980,
        reminderDays: 30,
        notifiedAt: "2026-03-09T09:00:00Z",
        status: "pending" as const,
        actedAt: null,
      };

      await expect(
        useNotificationStore.getState().repurchase(notification)
      ).rejects.toThrow("DB not initialized");
    });
  });

  describe("dismiss", () => {
    it("updates notification status to dismissed", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValue(null);
      mockGetAllAsync.mockResolvedValue([]);

      await useNotificationStore.getState().dismiss("notif-1");

      const updateCalls = mockRunAsync.mock.calls.filter(
        (c: unknown[]) => (c[0] as string).includes("UPDATE notifications")
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("cancels scheduled notification when expenseId provided", async () => {
      mockGetFirstAsync
        .mockResolvedValueOnce({ notification_id: "scheduled-notif-1" });
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetAllAsync.mockResolvedValue([]);

      await useNotificationStore.getState().dismiss("notif-1", "exp-1");

      const Notifications = require("expo-notifications");
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("scheduled-notif-1");

      // Should have updated expenses to clear reminder_days and notification_id
      const updateExpenseCalls = mockRunAsync.mock.calls.filter(
        (c: unknown[]) => (c[0] as string).includes("UPDATE expenses") && (c[0] as string).includes("reminder_days")
      );
      expect(updateExpenseCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("throws when db is not initialized", async () => {
      useExpenseStore.setState({ db: null });

      await expect(
        useNotificationStore.getState().dismiss("notif-1")
      ).rejects.toThrow("DB not initialized");
    });
  });
});
