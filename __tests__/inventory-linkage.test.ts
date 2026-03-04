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
import { useExpenseStore } from "../stores/useExpenseStore";
import { useInventoryStore } from "../stores/useInventoryStore";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
  useExpenseStore.setState({ db });
});

describe("linkPurchase", () => {
  it("既存在庫マッチ → ステータスをsufficientにリセットする", async () => {
    // findInventoryByName returns existing item (exact match)
    mockGetFirstAsync
      .mockResolvedValueOnce({
        id: "inv-1",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "critical",
        last_purchased_at: "2026-01-01",
        average_consumption_days: null,
        next_purchase_date: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      })
      // updateStatusFromPurchase → getInventoryItemById
      .mockResolvedValueOnce({
        id: "inv-1",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "critical",
        last_purchased_at: "2026-01-01",
        average_consumption_days: null,
        next_purchase_date: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      })
      // updateStatusFromPurchase → getLatestExpenseByInventoryId
      .mockResolvedValueOnce(null)
      // updateStatusFromPurchase → getInventoryItemById (return)
      .mockResolvedValueOnce({
        id: "inv-1",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
        last_purchased_at: "2026-03-01",
        average_consumption_days: null,
        next_purchase_date: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      });
    mockRunAsync.mockResolvedValue({ changes: 1 });
    mockGetAllAsync.mockResolvedValue([]);

    const result = await useInventoryStore.getState().linkPurchase(
      "ロイヤルカナン",
      "food",
      "2026-03-01"
    );

    expect(result).toBe("inv-1");
    const updateSql = mockRunAsync.mock.calls[0][0] as string;
    expect(updateSql).toContain("status = ?");
  });

  it("新規在庫 → 自動作成される", async () => {
    // findInventoryByName returns null (no match)
    mockGetFirstAsync.mockResolvedValue(null);
    mockRunAsync.mockResolvedValue({ changes: 1 });
    mockGetAllAsync.mockResolvedValue([]);

    const result = await useInventoryStore.getState().linkPurchase(
      "新しいフード",
      "food",
      "2026-03-01"
    );

    expect(result).toBeDefined();
    const insertSql = mockRunAsync.mock.calls[0][0] as string;
    expect(insertSql).toContain("INSERT INTO inventory");
  });

  it("非消耗品カテゴリ → 在庫連動なし", async () => {
    const result = await useInventoryStore.getState().linkPurchase(
      "おもちゃ",
      "toy",
      "2026-03-01"
    );

    expect(result).toBeNull();
    expect(mockRunAsync).not.toHaveBeenCalled();
  });
});
