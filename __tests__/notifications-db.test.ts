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

import * as SQLite from "expo-sqlite";
import {
  createNotification,
  getPendingNotifications,
  getNotificationCount,
  updateNotificationStatus,
  deleteNotification,
} from "../db/notifications";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
});

describe("createNotification", () => {
  it("INSERT文を実行しNotificationRecordを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const result = await createNotification(db, {
      expenseId: "exp-1",
      category: "food",
      itemName: "ロイヤルカナン",
      amount: 2980,
      reminderDays: 30,
      notifiedAt: "2026-03-01T09:00:00Z",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain("INSERT INTO notifications");
    expect(result.id).toBeDefined();
    expect(result.expenseId).toBe("exp-1");
    expect(result.category).toBe("food");
    expect(result.itemName).toBe("ロイヤルカナン");
    expect(result.amount).toBe(2980);
    expect(result.reminderDays).toBe(30);
    expect(result.status).toBe("pending");
    expect(result.actedAt).toBeNull();
  });
});

describe("getPendingNotifications", () => {
  it("status='pending'でフィルタしnotified_at DESCでソートする", async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getPendingNotifications(db);

    const sql = mockGetAllAsync.mock.calls[0][0] as string;
    expect(sql).toContain("status = 'pending'");
    expect(sql).toContain("ORDER BY notified_at DESC");
  });

  it("行をNotificationRecord型に変換する", async () => {
    mockGetAllAsync.mockResolvedValue([
      {
        id: "notif-1",
        expense_id: "exp-1",
        category: "food",
        item_name: "ロイヤルカナン",
        amount: 2980,
        reminder_days: 30,
        notified_at: "2026-03-01T09:00:00Z",
        status: "pending",
        acted_at: null,
      },
    ]);

    const result = await getPendingNotifications(db);
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe("ロイヤルカナン");
    expect(result[0].expenseId).toBe("exp-1");
    expect(result[0].reminderDays).toBe(30);
    expect(result[0].status).toBe("pending");
    expect(result[0].actedAt).toBeNull();
  });
});

describe("getNotificationCount", () => {
  it("pendingの件数を返す", async () => {
    mockGetFirstAsync.mockResolvedValue({ count: 5 });
    const result = await getNotificationCount(db);

    const sql = mockGetFirstAsync.mock.calls[0][0] as string;
    expect(sql).toContain("COUNT(*)");
    expect(sql).toContain("status = 'pending'");
    expect(result).toBe(5);
  });

  it("0件の場合は0を返す", async () => {
    mockGetFirstAsync.mockResolvedValue({ count: 0 });
    const result = await getNotificationCount(db);
    expect(result).toBe(0);
  });
});

describe("updateNotificationStatus", () => {
  it("statusとacted_atを更新する", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });
    await updateNotificationStatus(db, "notif-1", "purchased");

    const [sql, params] = mockRunAsync.mock.calls[0];
    expect(sql).toContain("UPDATE notifications SET status = ?");
    expect(sql).toContain("acted_at = ?");
    expect(params[0]).toBe("purchased");
    expect(params[2]).toBe("notif-1");
  });
});

describe("deleteNotification", () => {
  it("存在するIDの場合はtrueを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });
    const result = await deleteNotification(db, "notif-1");
    expect(result).toBe(true);
  });

  it("存在しないIDの場合はfalseを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 0 });
    const result = await deleteNotification(db, "nonexistent");
    expect(result).toBe(false);
  });
});
