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
    `SELECT id, last_purchased_at, average_consumption_days, status FROM inventory WHERE average_consumption_days IS NOT NULL AND last_purchased_at IS NOT NULL`
  );

  const today = new Date();
  let updatedCount = 0;

  for (const r of rows as Record<string, unknown>[]) {
    const newStatus = calculateStatus(
      r.last_purchased_at as string,
      r.average_consumption_days as number,
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
