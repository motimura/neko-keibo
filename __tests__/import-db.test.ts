const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockExecAsync = jest.fn();
const mockWithTransactionAsync = jest.fn();

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-" + Math.random().toString(36).slice(2, 8)),
}));

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
    execAsync: mockExecAsync,
    withTransactionAsync: mockWithTransactionAsync,
  })),
}));

import * as SQLite from "expo-sqlite";
import { importFromJSON, importFromCSV } from "../utils/import";

let db: SQLite.SQLiteDatabase;

const validExport = {
  version: "1.0",
  exportedAt: "2025-01-01T00:00:00.000Z",
  data: {
    expenses: [
      {
        id: "e1",
        category: "food",
        amount: 3000,
        itemName: "ロイヤルカナン",
        expenseDate: "2025-01-15",
        memo: "",
        inventoryId: null,
        reminderDays: 30,
        createdAt: "2025-01-15T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      },
    ],
    inventory: [
      {
        id: "inv1",
        itemName: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
        lastPurchasedAt: "2025-01-15",
        averageConsumptionDays: 30,
        nextPurchaseDate: "2025-02-14",
        createdAt: "2025-01-15T00:00:00.000Z",
        updatedAt: "2025-01-15T00:00:00.000Z",
      },
    ],
    notifications: [
      {
        id: "n1",
        expenseId: "e1",
        category: "food",
        itemName: "ロイヤルカナン",
        amount: 3000,
        reminderDays: 30,
        notifiedAt: "2025-02-14T00:00:00.000Z",
        status: "pending",
        actedAt: null,
      },
    ],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
  mockWithTransactionAsync.mockImplementation(async (fn: () => Promise<void>) => fn());
  mockGetAllAsync.mockResolvedValue([]);
});

describe("importFromJSON - overwrite mode", () => {
  it("deletes all data then inserts", async () => {
    const summary = await importFromJSON(db, JSON.stringify(validExport), "overwrite");

    expect(mockExecAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM notifications")
    );
    expect(mockExecAsync).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM expenses")
    );
    expect(summary.expenses).toBe(1);
    expect(summary.inventory).toBe(1);
    expect(summary.notifications).toBe(1);
  });

  it("inserts expenses with correct parameters", async () => {
    await importFromJSON(db, JSON.stringify(validExport), "overwrite");

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO expenses"),
      expect.arrayContaining(["e1", "food", 3000, "ロイヤルカナン"])
    );
  });

  it("inserts inventory with correct parameters", async () => {
    await importFromJSON(db, JSON.stringify(validExport), "overwrite");

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO inventory"),
      expect.arrayContaining(["inv1", "ロイヤルカナン", "food", "sufficient"])
    );
  });

  it("inserts notifications with correct parameters", async () => {
    await importFromJSON(db, JSON.stringify(validExport), "overwrite");

    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO notifications"),
      expect.arrayContaining(["n1", "e1", "food", "ロイヤルカナン"])
    );
  });
});

describe("importFromJSON - merge mode", () => {
  it("skips existing records by id", async () => {
    mockGetAllAsync
      .mockResolvedValueOnce([{ id: "e1" }])  // existing expenses
      .mockResolvedValueOnce([])                // existing inventory
      .mockResolvedValueOnce([]);               // existing notifications

    const summary = await importFromJSON(db, JSON.stringify(validExport), "merge");

    expect(mockExecAsync).not.toHaveBeenCalled();
    expect(summary.expenses).toBe(0);
    expect(summary.inventory).toBe(1);
    expect(summary.notifications).toBe(1);
  });

  it("inserts non-duplicate records", async () => {
    mockGetAllAsync
      .mockResolvedValueOnce([])   // no existing expenses
      .mockResolvedValueOnce([])   // no existing inventory
      .mockResolvedValueOnce([]);  // no existing notifications

    const summary = await importFromJSON(db, JSON.stringify(validExport), "merge");

    expect(summary.expenses).toBe(1);
    expect(summary.inventory).toBe(1);
    expect(summary.notifications).toBe(1);
  });
});

describe("importFromCSV", () => {
  it("inserts parsed CSV rows as expenses", async () => {
    const csv = "日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,ロイヤルカナン,3000,大袋";

    const summary = await importFromCSV(db, csv);

    expect(summary.expenses).toBe(1);
    expect(summary.inventory).toBe(0);
    expect(summary.notifications).toBe(0);
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO expenses"),
      expect.arrayContaining(["food", 3000, "ロイヤルカナン", "2025-01-15", "大袋"])
    );
  });

  it("inserts multiple rows in transaction", async () => {
    const csv = "日付,カテゴリ,品名,金額,メモ\n2025-01-15,フード,a,100,\n2025-01-16,猫砂,b,200,";

    const summary = await importFromCSV(db, csv);

    expect(summary.expenses).toBe(2);
    expect(mockWithTransactionAsync).toHaveBeenCalled();
  });
});
