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
  createInventoryItem,
  getInventoryItems,
  updateInventoryItem,
  deleteInventoryItem,
  updateStatusFromPurchase,
  findInventoryByName,
} from "../db/inventory";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
});

describe("createInventoryItem", () => {
  it("INSERT文を実行しInventoryItemを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const result = await createInventoryItem(db, {
      itemName: "ロイヤルカナン",
      category: "food",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain("INSERT INTO inventory");
    expect(result.id).toBeDefined();
    expect(result.itemName).toBe("ロイヤルカナン");
    expect(result.category).toBe("food");
    expect(result.status).toBe("sufficient");
  });

  it("lastPurchasedAtとavgDaysからnextPurchaseDateを計算する", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const result = await createInventoryItem(db, {
      itemName: "猫砂",
      category: "litter",
      lastPurchasedAt: "2026-03-01",
      averageConsumptionDays: 30,
    });

    expect(result.nextPurchaseDate).toBe("2026-03-31");
  });

  it("avgDaysがなければnextPurchaseDateはnull", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const result = await createInventoryItem(db, {
      itemName: "猫砂",
      category: "litter",
      lastPurchasedAt: "2026-03-01",
    });

    expect(result.nextPurchaseDate).toBeNull();
  });
});

describe("getInventoryItems", () => {
  it("ステータス順（critical > low > sufficient）でソートする", async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getInventoryItems(db);

    const sql = mockGetAllAsync.mock.calls[0][0] as string;
    expect(sql).toContain("ORDER BY CASE status");
    expect(sql).toContain("WHEN 'critical' THEN 0");
    expect(sql).toContain("WHEN 'low' THEN 1");
  });

  it("結果をInventoryItem型に変換する", async () => {
    mockGetAllAsync.mockResolvedValue([
      {
        id: "test-id",
        item_name: "ロイヤルカナン",
        category: "food",
        status: "sufficient",
        last_purchased_at: "2026-03-01",
        average_consumption_days: 30,
        next_purchase_date: "2026-03-31",
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      },
    ]);

    const result = await getInventoryItems(db);
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe("ロイヤルカナン");
    expect(result[0].averageConsumptionDays).toBe(30);
  });
});

describe("updateInventoryItem", () => {
  it("指定フィールドのみUPDATEする", async () => {
    mockGetFirstAsync.mockResolvedValue({
      id: "test-id",
      item_name: "ロイヤルカナン",
      category: "food",
      status: "low",
      last_purchased_at: "2026-03-01",
      average_consumption_days: 30,
      next_purchase_date: "2026-03-31",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
    });
    mockRunAsync.mockResolvedValue({ changes: 1 });

    await updateInventoryItem(db, "test-id", { status: "low" });

    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain("status = ?");
    expect(sql).toContain("UPDATE inventory");
  });

  it("空の更新はnullを返す", async () => {
    const result = await updateInventoryItem(db, "test-id", {});
    expect(result).toBeNull();
    expect(mockRunAsync).not.toHaveBeenCalled();
  });
});

describe("deleteInventoryItem", () => {
  it("DELETE文を実行し結果を返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });
    const result = await deleteInventoryItem(db, "test-id");
    expect(result).toBe(true);
  });

  it("存在しないIDの場合はfalseを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 0 });
    const result = await deleteInventoryItem(db, "nonexistent");
    expect(result).toBe(false);
  });
});

describe("updateStatusFromPurchase", () => {
  it("ステータスをsufficientにリセットする", async () => {
    mockGetFirstAsync.mockResolvedValue({
      id: "test-id",
      item_name: "ロイヤルカナン",
      category: "food",
      status: "critical",
      last_purchased_at: "2026-02-01",
      average_consumption_days: 30,
      next_purchase_date: "2026-03-03",
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
    });
    mockRunAsync.mockResolvedValue({ changes: 1 });

    await updateStatusFromPurchase(db, "test-id", "2026-03-01");

    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain("status = 'sufficient'");
    expect(sql).toContain("last_purchased_at = ?");
  });
});

describe("findInventoryByName", () => {
  it("完全一致で見つかる場合はそのアイテムを返す", async () => {
    mockGetFirstAsync.mockResolvedValueOnce({
      id: "test-id",
      item_name: "ロイヤルカナン",
      category: "food",
      status: "sufficient",
      last_purchased_at: null,
      average_consumption_days: null,
      next_purchase_date: null,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
    });

    const result = await findInventoryByName(db, "ロイヤルカナン", "food");
    expect(result).not.toBeNull();
    expect(result!.itemName).toBe("ロイヤルカナン");
  });

  it("見つからない場合はnullを返す", async () => {
    mockGetFirstAsync.mockResolvedValue(null);

    const result = await findInventoryByName(db, "存在しない", "food");
    expect(result).toBeNull();
  });
});
