import * as SQLite from "expo-sqlite";
import { differenceInDays, addDays } from "date-fns";
import type { InventoryStatus } from "../types/inventory";
import { INVENTORY_STATUS_THRESHOLD_DAYS } from "./constants";

export function calculateStatus(
  lastPurchasedAt: string,
  avgDays: number,
  today: Date = new Date()
): InventoryStatus {
  const nextDate = addDays(new Date(lastPurchasedAt), avgDays);
  const remaining = differenceInDays(nextDate, today);

  if (remaining <= 0) return "critical";
  if (remaining <= INVENTORY_STATUS_THRESHOLD_DAYS) return "low";
  return "sufficient";
}

export async function refreshAllInventoryStatuses(
  db: SQLite.SQLiteDatabase
): Promise<number> {
  const rows = await db.getAllAsync(
    `SELECT inv.id, inv.last_purchased_at, inv.status, e.reminder_days
     FROM inventory inv
     INNER JOIN expenses e ON e.inventory_id = inv.id
     WHERE inv.last_purchased_at IS NOT NULL
       AND e.reminder_days IS NOT NULL
       AND e.id = (
         SELECT e2.id FROM expenses e2
         WHERE e2.inventory_id = inv.id AND e2.reminder_days IS NOT NULL
         ORDER BY e2.expense_date DESC, e2.created_at DESC LIMIT 1
       )`
  );

  const today = new Date();
  let updatedCount = 0;

  for (const r of rows as Record<string, unknown>[]) {
    const newStatus = calculateStatus(
      r.last_purchased_at as string,
      r.reminder_days as number,
      today
    );
    if (newStatus !== r.status) {
      await db.runAsync(
        `UPDATE inventory SET status = ?, updated_at = ? WHERE id = ?`,
        [newStatus, new Date().toISOString(), r.id as string]
      );
      updatedCount++;
    }
  }

  return updatedCount;
}
