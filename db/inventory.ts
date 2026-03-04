import * as SQLite from "expo-sqlite";
import { generateId } from "../utils/id";
import { format, addDays } from "date-fns";
import type { InventoryItem, CreateInventoryInput, UpdateInventoryInput } from "../types/inventory";
import { calculateStatus } from "../utils/inventoryStatus";
import { getLatestExpenseByInventoryId } from "./expenses";

function rowToInventoryItem(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    itemName: row.item_name as string,
    category: row.category as InventoryItem["category"],
    status: row.status as InventoryItem["status"],
    lastPurchasedAt: (row.last_purchased_at as string) || null,
    nextPurchaseDate: (row.next_purchase_date as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function createInventoryItem(
  db: SQLite.SQLiteDatabase,
  input: CreateInventoryInput
): Promise<InventoryItem> {
  const id = generateId();
  const now = new Date().toISOString();
  const lastPurchasedAt = input.lastPurchasedAt || null;
  const status: InventoryItem["status"] = input.status || "sufficient";

  await db.runAsync(
    `INSERT INTO inventory (id, item_name, category, status, last_purchased_at, average_consumption_days, next_purchase_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.itemName, input.category, status, lastPurchasedAt, null, null, now, now]
  );

  return {
    id,
    itemName: input.itemName,
    category: input.category,
    status,
    lastPurchasedAt,
    nextPurchaseDate: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getInventoryItems(
  db: SQLite.SQLiteDatabase
): Promise<InventoryItem[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM inventory ORDER BY CASE status WHEN 'critical' THEN 0 WHEN 'low' THEN 1 WHEN 'sufficient' THEN 2 END, updated_at DESC`
  );
  return (rows as Record<string, unknown>[]).map(rowToInventoryItem);
}

export async function getInventoryItemById(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<InventoryItem | null> {
  const row = await db.getFirstAsync(`SELECT * FROM inventory WHERE id = ?`, [id]);
  if (!row) return null;
  return rowToInventoryItem(row as Record<string, unknown>);
}

export async function updateInventoryItem(
  db: SQLite.SQLiteDatabase,
  id: string,
  input: UpdateInventoryInput
): Promise<InventoryItem | null> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.itemName !== undefined) {
    fields.push("item_name = ?");
    values.push(input.itemName);
  }
  if (input.category !== undefined) {
    fields.push("category = ?");
    values.push(input.category);
  }
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.lastPurchasedAt !== undefined) {
    fields.push("last_purchased_at = ?");
    values.push(input.lastPurchasedAt);
  }

  if (fields.length === 0) return null;

  const now = new Date().toISOString();
  fields.push("updated_at = ?");
  values.push(now);
  values.push(id);

  await db.runAsync(`UPDATE inventory SET ${fields.join(", ")} WHERE id = ?`, values);

  return getInventoryItemById(db, id);
}

export async function deleteInventoryItem(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<boolean> {
  const result = await db.runAsync(`DELETE FROM inventory WHERE id = ?`, [id]);
  return result.changes > 0;
}

export async function updateStatusFromPurchase(
  db: SQLite.SQLiteDatabase,
  id: string,
  purchaseDate: string
): Promise<InventoryItem | null> {
  const current = await getInventoryItemById(db, id);
  if (!current) return null;

  const latestExpense = await getLatestExpenseByInventoryId(db, id);
  const reminderDays = latestExpense?.reminderDays ?? null;

  let nextPurchaseDate: string | null = null;
  let status: InventoryItem["status"] = "sufficient";

  if (reminderDays) {
    nextPurchaseDate = format(addDays(new Date(purchaseDate), reminderDays), "yyyy-MM-dd");
    status = calculateStatus(purchaseDate, reminderDays);
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE inventory SET status = ?, last_purchased_at = ?, next_purchase_date = ?, updated_at = ? WHERE id = ?`,
    [status, purchaseDate, nextPurchaseDate, now, id]
  );

  return getInventoryItemById(db, id);
}

export async function findInventoryByName(
  db: SQLite.SQLiteDatabase,
  itemName: string,
  category: string
): Promise<InventoryItem | null> {
  const row = await db.getFirstAsync(
    `SELECT * FROM inventory WHERE item_name = ? AND category = ?`,
    [itemName, category]
  );
  if (row) return rowToInventoryItem(row as Record<string, unknown>);

  const partialRow = await db.getFirstAsync(
    `SELECT * FROM inventory WHERE category = ? AND (item_name LIKE ? OR ? LIKE '%' || item_name || '%')`,
    [category, `%${itemName}%`, itemName]
  );
  if (partialRow) return rowToInventoryItem(partialRow as Record<string, unknown>);

  return null;
}
