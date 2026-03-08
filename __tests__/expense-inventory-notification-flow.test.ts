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
}));

import * as SQLite from "expo-sqlite";
import { createExpense, getLatestExpenseByInventoryId } from "../db/expenses";
import {
  createInventoryItem,
  findInventoryByName,
  updateStatusFromPurchase,
  getInventoryItemById,
} from "../db/inventory";
import { createNotification, getPendingNotifications, updateNotificationStatus } from "../db/notifications";
import { scheduleReminder, cancelReminder } from "../utils/notifications";
import * as Notifications from "expo-notifications";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
});

describe("Expense -> Inventory -> Notification integration flow", () => {
  describe("consumable category expense auto-creates inventory", () => {
    it("food expense with no existing inventory creates new inventory item", async () => {
      // findInventoryByName returns null (no existing inventory)
      mockGetFirstAsync.mockResolvedValue(null);
      // createInventoryItem INSERT
      mockRunAsync.mockResolvedValue({ changes: 1 });

      const newItem = await createInventoryItem(db, {
        itemName: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
        lastPurchasedAt: "2026-03-01",
      });

      expect(newItem.itemName).toBe("ロイヤルカナン");
      expect(newItem.category).toBe("food");
      expect(newItem.status).toBe("sufficient");
      expect(newItem.lastPurchasedAt).toBe("2026-03-01");
      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      const sql = mockRunAsync.mock.calls[0][0] as string;
      expect(sql).toContain("INSERT INTO inventory");
    });

    it("expense is created with inventory_id linking to inventory item", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });

      const expense = await createExpense(db, {
        category: "food",
        amount: 2980,
        itemName: "ロイヤルカナン",
        expenseDate: "2026-03-01",
        inventoryId: "inv-1",
        reminderDays: 30,
      });

      expect(expense.inventoryId).toBe("inv-1");
      expect(expense.reminderDays).toBe(30);
      const sql = mockRunAsync.mock.calls[0][0] as string;
      expect(sql).toContain("INSERT INTO expenses");
    });

    it("notification is scheduled after expense with reminderDays", async () => {
      const notifId = await scheduleReminder("ロイヤルカナン", "🍗", 30, "exp-1");

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "🐱 猫計簿",
          body: "🍗 ロイヤルカナン そろそろ買い替え時です",
          data: { expenseId: "exp-1" },
        },
        trigger: {
          type: "timeInterval",
          seconds: 30 * 86400,
        },
      });
      expect(notifId).toBe("mock-notif-id");
    });
  });

  describe("existing inventory case: status reset + notification reschedule", () => {
    it("findInventoryByName returns existing item with exact match", async () => {
      const existingRow = {
        id: "inv-1",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "critical",
        last_purchased_at: "2026-02-01",
        next_purchase_date: "2026-03-03",
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-01T00:00:00Z",
      };
      mockGetFirstAsync.mockResolvedValueOnce(existingRow);

      const found = await findInventoryByName(db, "ロイヤルカナン", "food");

      expect(found).not.toBeNull();
      expect(found!.id).toBe("inv-1");
      expect(found!.status).toBe("critical");
    });

    it("updateStatusFromPurchase resets status to sufficient", async () => {
      // getInventoryItemById
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
        // getLatestExpenseByInventoryId
        .mockResolvedValueOnce({
          id: "exp-1",
          category: "food",
          amount: 2980,
          item_name: "ロイヤルカナン",
          expense_date: "2026-03-09",
          memo: "",
          inventory_id: "inv-1",
          reminder_days: 30,
          notification_id: null,
          created_at: "2026-03-09T00:00:00Z",
          updated_at: "2026-03-09T00:00:00Z",
        });

      // UPDATE inventory + getInventoryItemById after update
      mockRunAsync.mockResolvedValue({ changes: 1 });
      mockGetFirstAsync.mockResolvedValueOnce({
        id: "inv-1",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
        last_purchased_at: "2026-03-09",
        next_purchase_date: "2026-04-08",
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-03-09T00:00:00Z",
      });

      const updated = await updateStatusFromPurchase(db, "inv-1", "2026-03-09");

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("sufficient");
      expect(updated!.lastPurchasedAt).toBe("2026-03-09");
    });

    it("old notification is cancelled before scheduling new one", async () => {
      await cancelReminder("old-notif-id");
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith("old-notif-id");

      const newId = await scheduleReminder("ロイヤルカナン", "🍗", 30, "exp-2");
      expect(newId).toBe("mock-notif-id");
    });
  });

  describe("repurchase flow: notification -> repurchase -> new expense + inventory update", () => {
    it("createNotification creates a pending notification record", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });

      const notif = await createNotification(db, {
        expenseId: "exp-1",
        category: "food",
        itemName: "ロイヤルカナン",
        amount: 2980,
        reminderDays: 30,
        notifiedAt: "2026-03-09T09:00:00Z",
      });

      expect(notif.status).toBe("pending");
      expect(notif.itemName).toBe("ロイヤルカナン");
      expect(notif.amount).toBe(2980);
      expect(notif.reminderDays).toBe(30);
    });

    it("repurchase creates new expense with same details", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });

      const newExpense = await createExpense(db, {
        category: "food",
        amount: 2980,
        itemName: "ロイヤルカナン",
        expenseDate: "2026-03-09",
        reminderDays: 30,
      });

      expect(newExpense.category).toBe("food");
      expect(newExpense.amount).toBe(2980);
      expect(newExpense.itemName).toBe("ロイヤルカナン");
      expect(newExpense.reminderDays).toBe(30);
    });

    it("notification status is updated to purchased after repurchase", async () => {
      mockRunAsync.mockResolvedValue({ changes: 1 });

      await updateNotificationStatus(db, "notif-1", "purchased");

      const sql = mockRunAsync.mock.calls[0][0] as string;
      expect(sql).toContain("UPDATE notifications SET status = ?");
      expect(mockRunAsync.mock.calls[0][1]).toEqual(
        expect.arrayContaining(["purchased"])
      );
    });

    it("new notification is scheduled with same reminder_days after repurchase", async () => {
      const newNotifId = await scheduleReminder("ロイヤルカナン", "🍗", 30, "exp-2");

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: "🐱 猫計簿",
          body: "🍗 ロイヤルカナン そろそろ買い替え時です",
          data: { expenseId: "exp-2" },
        },
        trigger: {
          type: "timeInterval",
          seconds: 30 * 86400,
        },
      });
      expect(newNotifId).toBe("mock-notif-id");
    });

    it("getPendingNotifications returns only pending notifications", async () => {
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

      const pending = await getPendingNotifications(db);

      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe("pending");
      const sql = mockGetAllAsync.mock.calls[0][0] as string;
      expect(sql).toContain("WHERE status = 'pending'");
    });
  });

  describe("full end-to-end: expense -> inventory -> notification -> repurchase cycle", () => {
    it("complete cycle from expense creation to repurchase", async () => {
      // Step 1: Create expense with inventory link
      mockRunAsync.mockResolvedValue({ changes: 1 });
      const expense = await createExpense(db, {
        category: "litter",
        amount: 1500,
        itemName: "猫砂デオトイレ",
        expenseDate: "2026-03-01",
        inventoryId: "inv-litter-1",
        reminderDays: 14,
      });
      expect(expense.category).toBe("litter");
      expect(expense.inventoryId).toBe("inv-litter-1");

      // Step 2: Schedule notification
      const notifId = await scheduleReminder("猫砂デオトイレ", "🪣", 14, expense.id);
      expect(notifId).toBe("mock-notif-id");

      // Step 3: Create notification record when due
      const notif = await createNotification(db, {
        expenseId: expense.id,
        category: "litter",
        itemName: "猫砂デオトイレ",
        amount: 1500,
        reminderDays: 14,
        notifiedAt: "2026-03-15T09:00:00Z",
      });
      expect(notif.status).toBe("pending");

      // Step 4: Repurchase - create new expense
      const repurchaseExpense = await createExpense(db, {
        category: "litter",
        amount: 1500,
        itemName: "猫砂デオトイレ",
        expenseDate: "2026-03-15",
        inventoryId: "inv-litter-1",
        reminderDays: 14,
      });
      expect(repurchaseExpense.reminderDays).toBe(14);

      // Step 5: Update notification status
      await updateNotificationStatus(db, notif.id, "purchased");
      const updateSql = mockRunAsync.mock.calls[mockRunAsync.mock.calls.length - 1][0] as string;
      expect(updateSql).toContain("UPDATE notifications");

      // Step 6: Schedule next notification
      const nextNotifId = await scheduleReminder("猫砂デオトイレ", "🪣", 14, repurchaseExpense.id);
      expect(nextNotifId).toBe("mock-notif-id");
      // scheduleReminder called in Step 2 and Step 6
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });
  });
});
