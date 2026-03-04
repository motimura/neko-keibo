const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockExecAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
    execAsync: mockExecAsync,
  })),
}));

import * as SQLite from "expo-sqlite";
import { getMonthlySummary, getPrevMonthTotal, getDashboardSummary } from "../db/dashboard";

let db: SQLite.SQLiteDatabase;

beforeEach(() => {
  jest.clearAllMocks();
  db = SQLite.openDatabaseSync("test.db");
});

describe("getMonthlySummary", () => {
  it("空の月は合計0・カテゴリ空を返す", async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 0 });
    mockGetAllAsync.mockResolvedValue([]);

    const result = await getMonthlySummary(db, "2026-03");
    expect(result.totalAmount).toBe(0);
    expect(result.byCategory).toEqual({});
  });

  it("カテゴリ別の集計を返す", async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 4500 });
    mockGetAllAsync.mockResolvedValue([
      { category: "food", total: 3000 },
      { category: "litter", total: 1500 },
    ]);

    const result = await getMonthlySummary(db, "2026-03");
    expect(result.totalAmount).toBe(4500);
    expect(result.byCategory.food).toBe(3000);
    expect(result.byCategory.litter).toBe(1500);
  });

  it("月のLIKEパターンでクエリする", async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 0 });
    mockGetAllAsync.mockResolvedValue([]);

    await getMonthlySummary(db, "2026-03");

    expect(mockGetFirstAsync.mock.calls[0][1]).toContain("2026-03%");
    expect(mockGetAllAsync.mock.calls[0][1]).toContain("2026-03%");
  });
});

describe("getPrevMonthTotal", () => {
  it("前月の合計を返す", async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 5000 });

    const result = await getPrevMonthTotal(db, "2026-03");
    expect(result).toBe(5000);
    expect(mockGetFirstAsync.mock.calls[0][1]).toContain("2026-02%");
  });

  it("1月の前月は前年12月", async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 0 });

    await getPrevMonthTotal(db, "2026-01");
    expect(mockGetFirstAsync.mock.calls[0][1]).toContain("2025-12%");
  });

  it("前月データなしは0を返す", async () => {
    mockGetFirstAsync.mockResolvedValue({ total: 0 });

    const result = await getPrevMonthTotal(db, "2026-03");
    expect(result).toBe(0);
  });
});

describe("getDashboardSummary", () => {
  it("前月比を計算する", async () => {
    mockGetFirstAsync
      .mockResolvedValueOnce({ total: 6000 }) // getMonthlySummary -> total
      .mockResolvedValueOnce({ total: 5000 }); // getPrevMonthTotal
    mockGetAllAsync.mockResolvedValue([{ category: "food", total: 6000 }]);

    const summary = await getDashboardSummary(db, "2026-03");
    expect(summary.totalAmount).toBe(6000);
    expect(summary.comparedToPrevMonth).not.toBeNull();
    expect(summary.comparedToPrevMonth!.diff).toBe(1000);
    expect(summary.comparedToPrevMonth!.percentage).toBe(20);
  });

  it("前月データが0の場合は前月比null", async () => {
    mockGetFirstAsync
      .mockResolvedValueOnce({ total: 3000 })
      .mockResolvedValueOnce({ total: 0 });
    mockGetAllAsync.mockResolvedValue([{ category: "food", total: 3000 }]);

    const summary = await getDashboardSummary(db, "2026-03");
    expect(summary.comparedToPrevMonth).toBeNull();
  });

  it("monthフィールドを含む", async () => {
    mockGetFirstAsync
      .mockResolvedValueOnce({ total: 0 })
      .mockResolvedValueOnce({ total: 0 });
    mockGetAllAsync.mockResolvedValue([]);

    const summary = await getDashboardSummary(db, "2026-03");
    expect(summary.month).toBe("2026-03");
  });
});
