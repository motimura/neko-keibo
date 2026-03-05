import * as SQLite from "expo-sqlite";
import type { DashboardSummary, ExpenseCategory } from "../types/expense";
import { format, subMonths, parse } from "date-fns";

export async function getMonthlySummary(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<{ totalAmount: number; byCategory: Partial<Record<ExpenseCategory, number>> }> {
  const totalRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ?`,
    [`${month}%`]
  );
  const totalAmount = totalRow?.total ?? 0;

  const categoryRows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM expenses WHERE expense_date LIKE ? GROUP BY category`,
    [`${month}%`]
  );

  const byCategory: Partial<Record<ExpenseCategory, number>> = {};
  for (const row of categoryRows) {
    byCategory[row.category as ExpenseCategory] = row.total;
  }

  return { totalAmount, byCategory };
}

export async function getPrevMonthTotal(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<number> {
  const prevMonth = format(subMonths(parse(month, "yyyy-MM", new Date()), 1), "yyyy-MM");
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date LIKE ?`,
    [`${prevMonth}%`]
  );
  return row?.total ?? 0;
}

export async function getLast12MonthsByCategory(
  db: SQLite.SQLiteDatabase
): Promise<Partial<Record<ExpenseCategory, number>>> {
  const since = format(subMonths(new Date(), 11), "yyyy-MM");
  const rows = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount) as total FROM expenses WHERE substr(expense_date, 1, 7) >= ? GROUP BY category ORDER BY total DESC`,
    [since]
  );
  const result: Partial<Record<ExpenseCategory, number>> = {};
  for (const row of rows) {
    result[row.category as ExpenseCategory] = row.total;
  }
  return result;
}

export async function getDashboardSummary(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<DashboardSummary> {
  const { totalAmount, byCategory } = await getMonthlySummary(db, month);
  const prevTotal = await getPrevMonthTotal(db, month);

  let comparedToPrevMonth: DashboardSummary["comparedToPrevMonth"] = null;
  if (prevTotal > 0) {
    const diff = totalAmount - prevTotal;
    const percentage = Math.round((diff / prevTotal) * 100);
    comparedToPrevMonth = { diff, percentage };
  }

  return { month, totalAmount, byCategory, comparedToPrevMonth };
}
