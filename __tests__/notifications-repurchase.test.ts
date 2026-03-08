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
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("new-notif-id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: "timeInterval" },
}));

import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { useExpenseStore } from "../stores/useExpenseStore";
import { useNotificationStore } from "../stores/useNotificationStore";
import type { NotificationRecord } from "../types/notification";

let db: SQLite.SQLiteDatabase;

const mockNotification: NotificationRecord = {
  id: "notif-1",
  expenseId: "exp-1",
  category: "food",
  itemName: "ロイヤルカナン",
  amount: 2980,
  reminderDays: 30,
  notifiedAt: "2026-03-01T09:00:00Z",
  status: "pending",
  actedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
  useExpenseStore.setState({ db });
  // After repurchase/dismiss, fetchNotifications is called → getAllAsync returns empty
  mockGetAllAsync.mockResolvedValue([]);
  mockRunAsync.mockResolvedValue({ changes: 1 });
});

describe("repurchase", () => {
  it("通知ステータスがpurchasedに更新される", async () => {
    // findInventoryByName → null (no inventory match)
    mockGetFirstAsync.mockResolvedValue(null);

    await useNotificationStore.getState().repurchase(mockNotification);

    const updateCalls = mockRunAsync.mock.calls.filter(
      (call) => (call[0] as string).includes("UPDATE notifications")
    );
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const [sql, params] = updateCalls[0];
    expect(sql).toContain("status = ?");
    expect(params[0]).toBe("purchased");
  });

  it("新しい支出がINSERTされる", async () => {
    mockGetFirstAsync.mockResolvedValue(null);

    await useNotificationStore.getState().repurchase(mockNotification);

    const insertCalls = mockRunAsync.mock.calls.filter(
      (call) => (call[0] as string).includes("INSERT INTO expenses")
    );
    expect(insertCalls.length).toBe(1);
    const params = insertCalls[0][1] as unknown[];
    // category
    expect(params).toContain("food");
    // amount
    expect(params).toContain(2980);
  });

  it("新しい通知がスケジュールされる", async () => {
    mockGetFirstAsync.mockResolvedValue(null);

    await useNotificationStore.getState().repurchase(mockNotification);

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});

describe("dismiss", () => {
  it("通知ステータスがdismissedに更新される", async () => {
    await useNotificationStore.getState().dismiss("notif-1");

    const updateCalls = mockRunAsync.mock.calls.filter(
      (call) => (call[0] as string).includes("UPDATE notifications")
    );
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    const [sql, params] = updateCalls[0];
    expect(sql).toContain("status = ?");
    expect(params[0]).toBe("dismissed");
  });

  it("expenseIdが指定された場合は支出の通知設定をクリアする", async () => {
    mockGetFirstAsync.mockResolvedValue({ notification_id: "old-notif-id" });

    await useNotificationStore.getState().dismiss("notif-1", "exp-1");

    const expenseUpdateCalls = mockRunAsync.mock.calls.filter(
      (call) => (call[0] as string).includes("UPDATE expenses SET") && (call[0] as string).includes("reminder_days")
    );
    expect(expenseUpdateCalls.length).toBe(1);
  });
});
