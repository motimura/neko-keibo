jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

import { buildExportJSON, buildExportCSV } from "../utils/export";
import { validateImportJSON, parseCSV } from "../utils/import";
import type { Expense } from "../types/expense";
import type { InventoryItem } from "../types/inventory";
import type { NotificationRecord } from "../types/notification";

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
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
  ...overrides,
});

const makeInventory = (overrides: Partial<InventoryItem> = {}): InventoryItem => ({
  id: "inv1",
  itemName: "ロイヤルカナン",
  category: "food",
  status: "sufficient",
  lastPurchasedAt: "2025-01-15",
  nextPurchaseDate: "2025-02-14",
  createdAt: "2025-01-15T00:00:00.000Z",
  updatedAt: "2025-01-15T00:00:00.000Z",
  ...overrides,
});

const makeNotification = (overrides: Partial<NotificationRecord> = {}): NotificationRecord => ({
  id: "n1",
  expenseId: "e1",
  category: "food",
  itemName: "ロイヤルカナン",
  amount: 3000,
  reminderDays: 30,
  notifiedAt: "2025-02-14T00:00:00.000Z",
  status: "pending",
  actedAt: null,
  ...overrides,
});

describe("JSON roundtrip: buildExportJSON -> validateImportJSON", () => {
  it("exports and re-imports the same expense data", () => {
    const expenses = [makeExpense()];
    const inventory = [makeInventory()];
    const notifications = [makeNotification()];

    const exported = buildExportJSON(expenses, inventory, notifications);
    const json = JSON.stringify(exported);
    const imported = validateImportJSON(json);

    expect(imported.version).toBe("1.0");

    const ie = imported.data.expenses[0];
    expect(ie.id).toBe("e1");
    expect(ie.category).toBe("food");
    expect(ie.amount).toBe(3000);
    expect(ie.itemName).toBe("ロイヤルカナン");
    expect(ie.expenseDate).toBe("2025-01-15");
    expect(ie.memo).toBe("大袋");
    expect(ie.inventoryId).toBe("inv1");
    expect(ie.reminderDays).toBe(30);
  });

  it("exports and re-imports the same inventory data", () => {
    const exported = buildExportJSON([], [makeInventory()], []);
    const json = JSON.stringify(exported);
    const imported = validateImportJSON(json);

    const ii = imported.data.inventory[0];
    expect(ii.id).toBe("inv1");
    expect(ii.itemName).toBe("ロイヤルカナン");
    expect(ii.category).toBe("food");
    expect(ii.status).toBe("sufficient");
    expect(ii.lastPurchasedAt).toBe("2025-01-15");
    expect(ii.nextPurchaseDate).toBe("2025-02-14");
  });

  it("exports and re-imports the same notification data", () => {
    const exported = buildExportJSON([], [], [makeNotification()]);
    const json = JSON.stringify(exported);
    const imported = validateImportJSON(json);

    const n = imported.data.notifications[0];
    expect(n.id).toBe("n1");
    expect(n.expenseId).toBe("e1");
    expect(n.category).toBe("food");
    expect(n.amount).toBe(3000);
    expect(n.reminderDays).toBe(30);
    expect(n.status).toBe("pending");
    expect(n.actedAt).toBeNull();
  });

  it("handles empty data roundtrip", () => {
    const exported = buildExportJSON([], [], []);
    const json = JSON.stringify(exported);
    const imported = validateImportJSON(json);

    expect(imported.data.expenses).toEqual([]);
    expect(imported.data.inventory).toEqual([]);
    expect(imported.data.notifications).toEqual([]);
  });

  it("handles multiple records roundtrip", () => {
    const expenses = [
      makeExpense({ id: "e1", category: "food", itemName: "フードA" }),
      makeExpense({ id: "e2", category: "litter", itemName: "猫砂B", inventoryId: "inv2" }),
      makeExpense({ id: "e3", category: "medical", itemName: "ワクチン", inventoryId: null, reminderDays: null }),
    ];
    const inventory = [
      makeInventory({ id: "inv1", itemName: "フードA" }),
      makeInventory({ id: "inv2", itemName: "猫砂B", category: "litter", status: "low" }),
    ];
    const notifications = [
      makeNotification({ id: "n1", itemName: "フードA" }),
      makeNotification({ id: "n2", expenseId: "e2", itemName: "猫砂B", status: "purchased", actedAt: "2025-03-01T00:00:00.000Z" }),
    ];

    const exported = buildExportJSON(expenses, inventory, notifications);
    const json = JSON.stringify(exported);
    const imported = validateImportJSON(json);

    expect(imported.data.expenses).toHaveLength(3);
    expect(imported.data.inventory).toHaveLength(2);
    expect(imported.data.notifications).toHaveLength(2);
  });

  it("notificationId is excluded from export (device-specific)", () => {
    const expenses = [makeExpense({ notificationId: "device-specific-id" })];
    const exported = buildExportJSON(expenses, [], []);
    const json = JSON.stringify(exported);

    expect(json).not.toContain("notificationId");
    expect(json).not.toContain("device-specific-id");

    const imported = validateImportJSON(json);
    expect(imported.data.expenses[0]).not.toHaveProperty("notificationId");
  });
});

describe("CSV roundtrip: buildExportCSV -> parseCSV", () => {
  it("exports and re-imports the same expense data", () => {
    const expense = makeExpense({ memo: "テストメモ" });
    const csv = buildExportCSV([expense]);
    const parsed = parseCSV(csv);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].category).toBe("food");
    expect(parsed[0].amount).toBe(3000);
    expect(parsed[0].itemName).toBe("ロイヤルカナン");
    expect(parsed[0].expenseDate).toBe("2025-01-15");
    expect(parsed[0].memo).toBe("テストメモ");
  });

  it("handles empty expenses roundtrip", () => {
    const csv = buildExportCSV([]);
    // Empty CSV has only header, parseCSV should throw for no data rows
    expect(() => parseCSV(csv)).toThrow("データ行がありません");
  });

  it("preserves all category types through roundtrip", () => {
    const categories = ["food", "litter", "medical", "toy", "goods", "grooming", "other"] as const;
    const expenses = categories.map((cat, i) =>
      makeExpense({ id: `e${i}`, category: cat, itemName: `item${i}`, memo: "" })
    );

    const csv = buildExportCSV(expenses);
    const parsed = parseCSV(csv);

    expect(parsed).toHaveLength(7);
    parsed.forEach((p, i) => {
      expect(p.category).toBe(categories[i]);
    });
  });

  it("handles special characters: commas in item name", () => {
    const expense = makeExpense({ itemName: "フード, 大袋" });
    const csv = buildExportCSV([expense]);
    const parsed = parseCSV(csv);

    expect(parsed[0].itemName).toBe("フード, 大袋");
  });

  it("handles special characters: double quotes in item name", () => {
    const expense = makeExpense({ itemName: 'フード "特大" サイズ' });
    const csv = buildExportCSV([expense]);
    const parsed = parseCSV(csv);

    expect(parsed[0].itemName).toBe('フード "特大" サイズ');
  });

  it("handles special characters: commas and quotes combined", () => {
    const expense = makeExpense({ itemName: 'テスト, "引用", データ' });
    const csv = buildExportCSV([expense]);
    const parsed = parseCSV(csv);

    expect(parsed[0].itemName).toBe('テスト, "引用", データ');
  });

  it("handles special characters: commas in memo", () => {
    const expense = makeExpense({ memo: "メモ, カンマ入り" });
    const csv = buildExportCSV([expense]);
    const parsed = parseCSV(csv);

    expect(parsed[0].memo).toBe("メモ, カンマ入り");
  });

  it("newlines in item name: parseCSV splits by line so roundtrip fails (known limitation)", () => {
    const expense = makeExpense({ itemName: "フード\n改行入り" });
    const csv = buildExportCSV([expense]);
    // buildExportCSV correctly quotes fields with newlines, but parseCSV
    // splits by \n before parsing quotes, so multi-line fields break.
    expect(() => parseCSV(csv)).toThrow();
  });

  it("newlines in memo: parseCSV splits by line so roundtrip fails (known limitation)", () => {
    const expense = makeExpense({ memo: "メモ\n改行\nあり" });
    const csv = buildExportCSV([expense]);
    expect(() => parseCSV(csv)).toThrow();
  });

  it("handles multiple expenses roundtrip", () => {
    const expenses = [
      makeExpense({ id: "e1", category: "food", itemName: "フードA", amount: 1000, memo: "" }),
      makeExpense({ id: "e2", category: "litter", itemName: "猫砂B", amount: 2000, memo: "メモ" }),
      makeExpense({ id: "e3", category: "medical", itemName: "ワクチン", amount: 5000, memo: "" }),
    ];

    const csv = buildExportCSV(expenses);
    const parsed = parseCSV(csv);

    expect(parsed).toHaveLength(3);
    expect(parsed[0].category).toBe("food");
    expect(parsed[0].amount).toBe(1000);
    expect(parsed[1].category).toBe("litter");
    expect(parsed[1].amount).toBe(2000);
    expect(parsed[2].category).toBe("medical");
    expect(parsed[2].amount).toBe(5000);
  });

  it("CSV roundtrip does not preserve id, inventoryId, reminderDays (by design)", () => {
    const expense = makeExpense({ id: "original-id", inventoryId: "inv1", reminderDays: 30 });
    const csv = buildExportCSV([expense]);
    const parsed = parseCSV(csv);

    // parseCSV generates new IDs
    expect(parsed[0].id).not.toBe("original-id");
    // CSV format doesn't include these fields
    expect(parsed[0].inventoryId).toBeNull();
    expect(parsed[0].reminderDays).toBeNull();
  });
});
