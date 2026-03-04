import * as SQLite from "expo-sqlite";
import { generateId } from "../utils/id";
import type { NotificationRecord, CreateNotificationInput, NotificationStatus } from "../types/notification";

function rowToNotification(row: Record<string, unknown>): NotificationRecord {
  return {
    id: row.id as string,
    expenseId: row.expense_id as string,
    category: row.category as NotificationRecord["category"],
    itemName: row.item_name as string,
    amount: row.amount as number,
    reminderDays: row.reminder_days as number,
    notifiedAt: row.notified_at as string,
    status: row.status as NotificationRecord["status"],
    actedAt: (row.acted_at as string) || null,
  };
}

export async function createNotification(
  db: SQLite.SQLiteDatabase,
  input: CreateNotificationInput
): Promise<NotificationRecord> {
  const id = generateId();

  await db.runAsync(
    `INSERT INTO notifications (id, expense_id, category, item_name, amount, reminder_days, notified_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, input.expenseId, input.category, input.itemName, input.amount, input.reminderDays, input.notifiedAt]
  );

  return {
    id,
    expenseId: input.expenseId,
    category: input.category as NotificationRecord["category"],
    itemName: input.itemName,
    amount: input.amount,
    reminderDays: input.reminderDays,
    notifiedAt: input.notifiedAt,
    status: "pending",
    actedAt: null,
  };
}

export async function getPendingNotifications(
  db: SQLite.SQLiteDatabase
): Promise<NotificationRecord[]> {
  const rows = await db.getAllAsync(
    `SELECT * FROM notifications WHERE status = 'pending' ORDER BY notified_at DESC`
  );
  return (rows as Record<string, unknown>[]).map(rowToNotification);
}

export async function getNotificationCount(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const row = await db.getFirstAsync(
    `SELECT COUNT(*) as count FROM notifications WHERE status = 'pending'`
  );
  return (row as Record<string, unknown>).count as number;
}

export async function updateNotificationStatus(
  db: SQLite.SQLiteDatabase,
  id: string,
  status: NotificationStatus
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE notifications SET status = ?, acted_at = ? WHERE id = ?`,
    [status, now, id]
  );
}

export async function deleteNotification(
  db: SQLite.SQLiteDatabase,
  id: string
): Promise<boolean> {
  const result = await db.runAsync(`DELETE FROM notifications WHERE id = ?`, [id]);
  return result.changes > 0;
}
