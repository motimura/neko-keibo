const mockRunAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockGetFirstAsync = jest.fn();

jest.mock("expo-sqlite", () => ({
  openDatabaseSync: jest.fn(() => ({
    runAsync: mockRunAsync,
    getAllAsync: mockGetAllAsync,
    getFirstAsync: mockGetFirstAsync,
  })),
}));

import * as SQLite from "expo-sqlite";
import { calculateStatus, refreshAllInventoryStatuses } from "../utils/inventoryStatus";

describe("calculateStatus", () => {
  it("残り8日以上 → sufficient", () => {
    const today = new Date("2026-03-01");
    const result = calculateStatus("2026-02-20", 17, today);
    expect(result).toBe("sufficient");
  });

  it("残り7日 → low", () => {
    const today = new Date("2026-03-01");
    const result = calculateStatus("2026-02-01", 35, today);
    expect(result).toBe("low");
  });

  it("残り1日 → low", () => {
    const today = new Date("2026-03-01");
    const result = calculateStatus("2026-02-01", 29, today);
    expect(result).toBe("low");
  });

  it("残り0日 → critical", () => {
    const today = new Date("2026-03-01");
    const result = calculateStatus("2026-02-01", 28, today);
    expect(result).toBe("critical");
  });

  it("期限超過（負の日数） → critical", () => {
    const today = new Date("2026-03-01");
    const result = calculateStatus("2026-01-01", 30, today);
    expect(result).toBe("critical");
  });
});

describe("refreshAllInventoryStatuses", () => {
  let db: SQLite.SQLiteDatabase;

  beforeEach(() => {
    jest.clearAllMocks();
    db = SQLite.openDatabaseSync("test.db");
  });

  it("JOINクエリでexpensesのreminder_daysを参照する", async () => {
    mockGetAllAsync.mockResolvedValue([]);

    const count = await refreshAllInventoryStatuses(db);
    expect(count).toBe(0);

    const sql = mockGetAllAsync.mock.calls[0][0] as string;
    expect(sql).toContain("INNER JOIN expenses");
    expect(sql).toContain("reminder_days IS NOT NULL");
    expect(sql).toContain("last_purchased_at IS NOT NULL");
  });

  it("ステータスが変わったアイテムのみUPDATEする", async () => {
    mockGetAllAsync.mockResolvedValue([
      {
        id: "1",
        last_purchased_at: "2026-01-01",
        reminder_days: 30,
        status: "sufficient",
      },
      {
        id: "2",
        last_purchased_at: "2026-03-01",
        reminder_days: 30,
        status: "sufficient",
      },
    ]);
    mockRunAsync.mockResolvedValue({ changes: 1 });

    const count = await refreshAllInventoryStatuses(db);

    // id "1" should change (Jan 01 + 30 days = Jan 31, past due -> critical)
    // id "2" should not change (Mar 01 + 30 days = Mar 31, still sufficient)
    expect(count).toBe(1);
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
  });
});
