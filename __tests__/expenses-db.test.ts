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
import { initDatabase } from "../db/schema";
import {
  createExpense,
  getExpensesByMonth,
  getExpensesByMonthAndCategory,
  updateExpense,
  deleteExpense,
} from "../db/expenses";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
});

describe("initDatabase", () => {
  it("CREATE TABLE文を実行する", async () => {
    await initDatabase(db);
    expect(mockExecAsync).toHaveBeenCalledTimes(1);
    const sql = mockExecAsync.mock.calls[0][0] as string;
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS expenses");
    expect(sql).toContain("CREATE INDEX IF NOT EXISTS idx_expenses_date");
  });
});

describe("createExpense", () => {
  it("INSERT文を実行しExpenseオブジェクトを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const result = await createExpense(db, {
      category: "food",
      amount: 2980,
      itemName: "ロイヤルカナン",
      expenseDate: "2026-03-01",
      memo: "セール",
    });

    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain("INSERT INTO expenses");
    expect(result.id).toBeDefined();
    expect(result.category).toBe("food");
    expect(result.amount).toBe(2980);
    expect(result.itemName).toBe("ロイヤルカナン");
    expect(result.memo).toBe("セール");
  });

  it("メモなしの場合は空文字を設定する", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const result = await createExpense(db, {
      category: "toy",
      amount: 500,
      itemName: "ねこじゃらし",
      expenseDate: "2026-03-01",
    });

    expect(result.memo).toBe("");
  });
});

describe("getExpensesByMonth", () => {
  it("月のLIKEパターンでクエリする", async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getExpensesByMonth(db, "2026-03");

    const [sql, params] = mockGetAllAsync.mock.calls[0];
    expect(sql).toContain("WHERE expense_date LIKE ?");
    expect(params).toContain("2026-03%");
  });

  it("結果をExpense型に変換する", async () => {
    mockGetAllAsync.mockResolvedValue([
      {
        id: "test-id",
        category: "food",
        amount: 2980,
        item_name: "フード",
        expense_date: "2026-03-01",
        memo: "",
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
      },
    ]);

    const result = await getExpensesByMonth(db, "2026-03");
    expect(result).toHaveLength(1);
    expect(result[0].itemName).toBe("フード");
    expect(result[0].expenseDate).toBe("2026-03-01");
  });
});

describe("getExpensesByMonthAndCategory", () => {
  it("月とカテゴリで絞り込む", async () => {
    mockGetAllAsync.mockResolvedValue([]);
    await getExpensesByMonthAndCategory(db, "2026-03", "food");

    const [sql, params] = mockGetAllAsync.mock.calls[0];
    expect(sql).toContain("AND category = ?");
    expect(params).toContain("2026-03%");
    expect(params).toContain("food");
  });
});

describe("updateExpense", () => {
  it("指定フィールドのみUPDATEする", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });
    mockGetFirstAsync.mockResolvedValue({
      id: "test-id",
      category: "food",
      amount: 3500,
      item_name: "フード",
      expense_date: "2026-03-01",
      memo: "定価",
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
    });

    const result = await updateExpense(db, "test-id", { amount: 3500, memo: "定価" });

    const sql = mockRunAsync.mock.calls[0][0] as string;
    expect(sql).toContain("amount = ?");
    expect(sql).toContain("memo = ?");
    expect(sql).not.toContain("category = ?");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(3500);
  });

  it("空の更新はnullを返す", async () => {
    const result = await updateExpense(db, "test-id", {});
    expect(result).toBeNull();
    expect(mockRunAsync).not.toHaveBeenCalled();
  });
});

describe("deleteExpense", () => {
  it("DELETE文を実行し結果を返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 1 });
    const result = await deleteExpense(db, "test-id");
    expect(result).toBe(true);
  });

  it("存在しないIDの場合はfalseを返す", async () => {
    mockRunAsync.mockResolvedValue({ changes: 0 });
    const result = await deleteExpense(db, "nonexistent");
    expect(result).toBe(false);
  });
});
