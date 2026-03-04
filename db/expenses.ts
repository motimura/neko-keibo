import * as SQLite from "expo-sqlite";
import { generateId } from "../utils/id";
import type { Expense, CreateExpenseInput, UpdateExpenseInput } from "../types/expense";

function rowToExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    category: row.category as Expense["category"],
    amount: row.amount as number,
    itemName: row.item_name as string,
    expenseDate: row.expense_date as string,
    memo: (row.memo as string) || "",
    inventoryId: (row.inventory_id as string) || null,
    reminderDays: (row.reminder_days as number) ?? null,
    notificationId: (row.notification_id as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createExpense(
  db: SQLite.SQLiteDatabase,
  input: CreateExpenseInput
): Promise<Expense> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO expenses (id, category, amount, item_name, expense_date, memo, inventory_id, reminder_days, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.category, input.amount, input.itemName, input.expenseDate, input.memo || "", input.inventoryId || null, input.reminderDays ?? null, input.notificationId || null, now, now]
  );

  return {
    id,
    category: input.category,
    amount: input.amount,
    itemName: input.itemName,
    expenseDate: input.expenseDate,
    memo: input.memo || "",
    inventoryId: input.inventoryId || null,
    reminderDays: input.reminderDays ?? null,
    notificationId: input.notificationId || null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getExpensesByMonth(
  db: SQLite.SQLiteDatabase,
  month: string
): Promise<Expense[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM expenses WHERE expense_date LIKE ? ORDER BY expense_date DESC, created_at DESC`,
    [`${month}%`]
  );
  return (rows as Record<string, unknown>[]).map(rowToExpense);
}

export async function getExpensesByMonthAndCategory(
  db: SQLite.SQLiteDatabase,
  month: string,
  category: string
): Promise<Expense[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM expenses WHERE expense_date LIKE ? AND category = ? ORDER BY expense_date DESC, created_at DESC`,
    [`${month}%`, category]
  );
  return (rows as Record<string, unknown>[]).map(rowToExpense);
}

export async function updateExpense(
  db: SQLite.SQLiteDatabase,
  id: string,
  input: UpdateExpenseInput
): Promise<Expense | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.category !== undefined) {
    fields.push("category = ?");
    values.push(input.category);
  }
  if (input.amount !== undefined) {
    fields.push("amount = ?");
    values.push(input.amount);
  }
  if (input.itemName !== undefined) {
    fields.push("item_name = ?");
    values.push(input.itemName);
  }
  if (input.expenseDate !== undefined) {
    fields.push("expense_date = ?");
    values.push(input.expenseDate);
  }
  if (input.memo !== undefined) {
    fields.push("memo = ?");
    values.push(input.memo);
  }
  if (input.reminderDays !== undefined) {
    fields.push("reminder_days = ?");
    values.push(input.reminderDays ?? null);
  }
  if (input.notificationId !== undefined) {
    fields.push("notification_id = ?");
    values.push(input.notificationId ?? null);
  }

  if (fields.length === 0) return null;

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await db.runAsync(`UPDATE expenses SET ${fields.join(", ")} WHERE id = ?`, values);

  const row = await db.getFirstAsync(`SELECT * FROM expenses WHERE id = ?`, [id]);
  if (!row) return null;
  return rowToExpense(row as Record<string, unknown>);
}

export async function deleteExpense(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<boolean> {
  const result = await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  return result.changes > 0;
}
