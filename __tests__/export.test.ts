import { buildExportJSON, buildExportCSV } from "../utils/export";
import type { Expense } from "../types/expense";
import type { InventoryItem } from "../types/inventory";
import type { NotificationRecord } from "../types/notification";

const mockExpense: Expense = {
  id: "e1",
  category: "food",
  amount: 3000,
  itemName: "ロイヤルカナン",
  expenseDate: "2025-01-15",
  memo: "大袋",
  inventoryId: "inv1",
  reminderDays: 30,
  notificationId: "notif-os-1",
  createdAt: "2025-01-15T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z",
};

const mockInventory: InventoryItem = {
  id: "inv1",
  itemName: "ロイヤルカナン",
  category: "food",
  status: "sufficient",
  lastPurchasedAt: "2025-01-15",
  nextPurchaseDate: "2025-02-14",
  createdAt: "2025-01-15T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z",
};

const mockNotification: NotificationRecord = {
  id: "n1",
  expenseId: "e1",
  category: "food",
  itemName: "ロイヤルカナン",
  amount: 3000,
  reminderDays: 30,
  notifiedAt: "2025-02-14T00:00:00.000Z",
  status: "pending",
  actedAt: null,
};

describe("buildExportJSON", () => {
  it("creates correct structure with version and metadata", () => {
    const result = buildExportJSON([mockExpense], [mockInventory], [mockNotification]);

    expect(result.version).toBe("1.0");
    expect(result.exportedAt).toBeTruthy();
    expect(result.data.expenses).toHaveLength(1);
    expect(result.data.inventory).toHaveLength(1);
    expect(result.data.notifications).toHaveLength(1);
  });

  it("excludes notification_id from expenses (device-specific)", () => {
    const result = buildExportJSON([mockExpense], [], []);
    const exported = result.data.expenses[0];

    expect(exported).not.toHaveProperty("notificationId");
    expect(exported.id).toBe("e1");
    expect(exported.reminderDays).toBe(30);
  });

  it("handles empty arrays", () => {
    const result = buildExportJSON([], [], []);

    expect(result.data.expenses).toEqual([]);
    expect(result.data.inventory).toEqual([]);
    expect(result.data.notifications).toEqual([]);
  });

  it("preserves all expense fields except notificationId", () => {
    const result = buildExportJSON([mockExpense], [], []);
    const e = result.data.expenses[0];

    expect(e.category).toBe("food");
    expect(e.amount).toBe(3000);
    expect(e.itemName).toBe("ロイヤルカナン");
    expect(e.expenseDate).toBe("2025-01-15");
    expect(e.memo).toBe("大袋");
    expect(e.inventoryId).toBe("inv1");
  });

  it("preserves inventory fields", () => {
    const result = buildExportJSON([], [mockInventory], []);
    const i = result.data.inventory[0];

    expect(i.itemName).toBe("ロイヤルカナン");
    expect(i.status).toBe("sufficient");
    expect(i).not.toHaveProperty("averageConsumptionDays");
  });

  it("preserves notification fields", () => {
    const result = buildExportJSON([], [], [mockNotification]);
    const n = result.data.notifications[0];

    expect(n.expenseId).toBe("e1");
    expect(n.reminderDays).toBe(30);
    expect(n.status).toBe("pending");
  });
});

describe("buildExportCSV", () => {
  it("generates valid CSV with BOM and header", () => {
    const csv = buildExportCSV([mockExpense]);
    expect(csv.startsWith("\uFEFF")).toBe(true);

    const lines = csv.replace("\uFEFF", "").split("\n");
    expect(lines[0]).toBe("日付,カテゴリ,品名,金額,メモ");
    expect(lines[1]).toBe("2025-01-15,フード,ロイヤルカナン,3000,大袋");
  });

  it("converts category codes to Japanese labels", () => {
    const expenses: Expense[] = [
      { ...mockExpense, category: "litter", itemName: "猫砂" },
      { ...mockExpense, id: "e2", category: "medical", itemName: "ワクチン" },
    ];
    const csv = buildExportCSV(expenses);
    const lines = csv.replace("\uFEFF", "").split("\n");

    expect(lines[1]).toContain("猫砂");
    expect(lines[2]).toContain("医療");
  });

  it("escapes commas and quotes in fields", () => {
    const expense: Expense = {
      ...mockExpense,
      itemName: 'フード, "特大"サイズ',
      memo: "テスト,メモ",
    };
    const csv = buildExportCSV([expense]);
    const lines = csv.replace("\uFEFF", "").split("\n");

    expect(lines[1]).toContain('"フード, ""特大""サイズ"');
    expect(lines[1]).toContain('"テスト,メモ"');
  });

  it("handles empty expenses", () => {
    const csv = buildExportCSV([]);
    const lines = csv.replace("\uFEFF", "").split("\n");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("日付,カテゴリ,品名,金額,メモ");
  });
});
